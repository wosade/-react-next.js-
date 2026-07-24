/**
 * MCP Client 管理器 — 管理多个 MCP Server 连接，动态发现工具
 *
 * 支持 stdio (本地命令行) 和 SSE (远程 HTTP) 两种传输方式
 *
 * scope 机制：
 * - "shared"  — 公共 MCP（如 Brave Search），全局共享一份连接
 * - "private" — 私有 MCP（如 Filesystem），每个用户独立连接
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createMCPTool } from "./mcpToolAdapter.js";
import type { StructuredTool } from "@langchain/core/tools";
import { log } from "../../lib/logger.js";
import { resetAgent } from "../langgraph/agent.js";

/** MCP Server 配置 */
export interface MCPServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "sse";
  command?: string;    // stdio: 命令路径
  args?: string[];      // stdio: 命令参数
  url?: string;         // sse: 服务 URL
  enabled: boolean;
  scope: "shared" | "private"; // shared=公共(全局共享), private=私有(按用户隔离)
}

/** 单个 MCP Server 连接状态 */
interface MCPServerConnection {
  config: MCPServerConfig;
  client: Client;
  tools: StructuredTool[];
  userId?: string; // 仅 private 连接有值
}

class MCPClientManager {
  /** 公共连接池 — key = serverId，所有用户共享 */
  private sharedConnections: Map<string, MCPServerConnection> = new Map();

  /** 私有连接池 — key = `${userId}:${serverId}`，每个用户独立 */
  private privateConnections: Map<string, MCPServerConnection> = new Map();

  /** 拼接私有连接 key */
  private privateKey(userId: string, serverId: string): string {
    return `${userId}:${serverId}`;
  }

  /** 连接一个 MCP Server 并获取其工具列表 */
  async connect(config: MCPServerConfig, userId?: string): Promise<StructuredTool[]> {
    if (!config.enabled) return [];

    if (config.scope === "shared") {
      return this.connectShared(config);
    }

    // private 必须有 userId
    if (!userId) {
      throw new Error(`私有 MCP "${config.name}" 需要提供 userId`);
    }
    return this.connectPrivate(config, userId);
  }

  /** 连接公共 MCP（全局共享一份） */
  private async connectShared(config: MCPServerConfig): Promise<StructuredTool[]> {
    // 已连接则直接返回缓存的工具
    const existing = this.sharedConnections.get(config.id);
    if (existing) {
      log.info(`[MCP] 复用公共连接: ${config.name}（${existing.tools.length} 个工具）`);
      return existing.tools;
    }

    const conn = await this.doConnect(config);
    this.sharedConnections.set(config.id, conn);
    log.info(`[MCP] 公共连接已建立: ${config.name}`);

    // 公共工具变更 → 影响所有用户
    resetAgent();

    return conn.tools;
  }

  /** 连接私有 MCP（每个用户独立） */
  private async connectPrivate(config: MCPServerConfig, userId: string): Promise<StructuredTool[]> {
    const key = this.privateKey(userId, config.id);

    // 如已连接先断开
    if (this.privateConnections.has(key)) {
      await this.disconnectPrivate(config.id, userId);
    }

    const conn = await this.doConnect(config, userId);
    this.privateConnections.set(key, conn);
    log.info(`[MCP] 私有连接已建立: ${config.name}（用户 ${userId}）`);

    // 私有工具变更 → 仅影响该用户
    resetAgent(userId);

    return conn.tools;
  }

  /** 执行实际连接 */
  private async doConnect(config: MCPServerConfig, userId?: string): Promise<MCPServerConnection> {
    try {
      const transport = this.createTransport(config);
      const client = new Client(
        { name: "agent-chat", version: "1.0.0" },
        { capabilities: {} },
      );

      await client.connect(transport);

      // 获取服务器工具列表
      const toolsResult = await client.listTools();
      const tools: StructuredTool[] = [];

      for (const toolDef of toolsResult.tools) {
        const tool = createMCPTool(toolDef, client, config.id);
        tools.push(tool);
      }

      log.info(`[MCP] ${config.name} 提供 ${tools.length} 个工具: ${tools.map((t) => t.name).join(", ")}`);

      return { config, client, tools, userId };
    } catch (err: any) {
      log.error(`[MCP] 连接 ${config.name} 失败:`, err.message);
      throw err;
    }
  }

  /** 断开 MCP Server */
  async disconnect(serverId: string, userId?: string): Promise<void> {
    // 先尝试断 shared，再尝试断 private
    if (this.sharedConnections.has(serverId)) {
      await this.disconnectShared(serverId);
      return;
    }
    if (userId) {
      await this.disconnectPrivate(serverId, userId);
    }
  }

  /** 断开公共连接 */
  private async disconnectShared(serverId: string): Promise<void> {
    const conn = this.sharedConnections.get(serverId);
    if (!conn) return;

    await this.closeConnection(conn);
    this.sharedConnections.delete(serverId);

    // 公共工具变更 → 影响所有用户
    resetAgent();
  }

  /** 断开私有连接 */
  private async disconnectPrivate(serverId: string, userId: string): Promise<void> {
    const key = this.privateKey(userId, serverId);
    const conn = this.privateConnections.get(key);
    if (!conn) return;

    await this.closeConnection(conn);
    this.privateConnections.delete(key);

    // 私有工具变更 → 仅影响该用户
    resetAgent(userId);
  }

  /** 关闭连接 */
  private async closeConnection(conn: MCPServerConnection): Promise<void> {
    try {
      await conn.client.close();
      log.info(`[MCP] 已断开: ${conn.config.name}`);
    } catch {
      // 忽略关闭错误
    }
  }

  /** 获取指定用户可见的所有工具（公共 + 私有） */
  getAllTools(userId?: string): StructuredTool[] {
    const all: StructuredTool[] = [];

    // 公共工具（所有用户可见）
    for (const conn of this.sharedConnections.values()) {
      all.push(...conn.tools);
    }

    // 私有工具（仅该用户可见）
    if (userId) {
      for (const conn of this.privateConnections.values()) {
        if (conn.userId === userId) {
          all.push(...conn.tools);
        }
      }
    }

    return all;
  }

  /** 获取指定服务器的工具 */
  getServerTools(serverId: string, userId?: string): StructuredTool[] {
    // 先查公共
    const shared = this.sharedConnections.get(serverId);
    if (shared) return shared.tools;

    // 再查私有
    if (userId) {
      const key = this.privateKey(userId, serverId);
      const priv = this.privateConnections.get(key);
      if (priv) return priv.tools;
    }

    return [];
  }

  /** 检查服务器是否已连接 */
  isConnected(serverId: string, userId?: string): boolean {
    if (this.sharedConnections.has(serverId)) return true;
    if (userId) {
      return this.privateConnections.has(this.privateKey(userId, serverId));
    }
    return false;
  }

  /** 获取连接状态（指定用户可见的） */
  getConnections(userId?: string): Array<{ config: MCPServerConfig; toolCount: number }> {
    const result: Array<{ config: MCPServerConfig; toolCount: number }> = [];

    // 公共连接
    for (const conn of this.sharedConnections.values()) {
      result.push({ config: conn.config, toolCount: conn.tools.length });
    }

    // 该用户的私有连接
    if (userId) {
      for (const conn of this.privateConnections.values()) {
        if (conn.userId === userId) {
          result.push({ config: conn.config, toolCount: conn.tools.length });
        }
      }
    }

    return result;
  }

  /** 断开所有连接（公共 + 所有私有） */
  async disconnectAll(): Promise<void> {
    const all: Array<() => Promise<void>> = [];
    for (const conn of this.sharedConnections.values()) {
      all.push(() => this.closeConnection(conn));
    }
    for (const conn of this.privateConnections.values()) {
      all.push(() => this.closeConnection(conn));
    }
    await Promise.all(all.map((fn) => fn()));
    this.sharedConnections.clear();
    this.privateConnections.clear();
    resetAgent();
  }

  /** 断开某用户的所有私有连接 */
  async disconnectUserPrivate(userId: string): Promise<void> {
    const toClose: Array<{ key: string; conn: MCPServerConnection }> = [];
    for (const [key, conn] of this.privateConnections.entries()) {
      if (conn.userId === userId) {
        toClose.push({ key, conn });
      }
    }

    if (toClose.length === 0) return;

    await Promise.all(toClose.map(({ conn }) => this.closeConnection(conn)));
    for (const { key } of toClose) {
      this.privateConnections.delete(key);
    }

    log.info(`[MCP] 已断开用户 ${userId} 的 ${toClose.length} 个私有连接`);
    resetAgent(userId);
  }

  /** 创建传输层 */
  private createTransport(config: MCPServerConfig) {
    if (config.transport === "stdio") {
      if (!config.command) {
        throw new Error(`MCP Server "${config.name}": stdio 模式必须提供 command`);
      }
      return new StdioClientTransport({
        command: config.command,
        args: config.args || [],
      });
    }

    if (config.transport === "sse") {
      if (!config.url) {
        throw new Error(`MCP Server "${config.name}": SSE 模式必须提供 url`);
      }
      return new SSEClientTransport(new URL(config.url));
    }

    throw new Error(`不支持的传输方式: ${config.transport}`);
  }
}

/** 全局单例 */
export const mcpManager = new MCPClientManager();
