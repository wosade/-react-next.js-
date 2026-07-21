/**
 * MCP Client 管理器 — 管理多个 MCP Server 连接，动态发现工具
 *
 * 支持 stdio (本地命令行) 和 SSE (远程 HTTP) 两种传输方式
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
}

/** 单个 MCP Server 连接状态 */
interface MCPServerConnection {
  config: MCPServerConfig;
  client: Client;
  tools: StructuredTool[];
}

class MCPClientManager {
  private connections: Map<string, MCPServerConnection> = new Map();

  /** 连接一个 MCP Server 并获取其工具列表 */
  async connect(config: MCPServerConfig): Promise<StructuredTool[]> {
    if (!config.enabled) return [];

    // 如已连接先断开
    if (this.connections.has(config.id)) {
      await this.disconnect(config.id);
    }

    try {
      const transport = this.createTransport(config);
      const client = new Client(
        { name: "agent-chat", version: "1.0.0" },
        { capabilities: {} },
      );

      await client.connect(transport);
      log.info(`[MCP] 已连接: ${config.name}`);

      // 获取服务器工具列表
      const toolsResult = await client.listTools();
      const tools: StructuredTool[] = [];

      for (const toolDef of toolsResult.tools) {
        const tool = createMCPTool(toolDef, client, config.id);
        tools.push(tool);
      }

      this.connections.set(config.id, { config, client, tools });
      log.info(`[MCP] ${config.name} 提供 ${tools.length} 个工具: ${tools.map((t) => t.name).join(", ")}`);

      // 工具变更 → 重建 Agent
      resetAgent();

      return tools;
    } catch (err: any) {
      log.error(`[MCP] 连接 ${config.name} 失败:`, err.message);
      throw err;
    }
  }

  /** 断开 MCP Server */
  async disconnect(serverId: string): Promise<void> {
    const conn = this.connections.get(serverId);
    if (!conn) return;

    try {
      await conn.client.close();
      log.info(`[MCP] 已断开: ${conn.config.name}`);
    } catch {
      // 忽略关闭错误
    }
    this.connections.delete(serverId);

    // 工具变更 → 重建 Agent
    resetAgent();
  }

  /** 获取所有已连接服务器的工具（合并） */
  getAllTools(): StructuredTool[] {
    const all: StructuredTool[] = [];
    for (const conn of this.connections.values()) {
      all.push(...conn.tools);
    }
    return all;
  }

  /** 获取指定服务器的工具 */
  getServerTools(serverId: string): StructuredTool[] {
    return this.connections.get(serverId)?.tools || [];
  }

  /** 检查服务器是否已连接 */
  isConnected(serverId: string): boolean {
    return this.connections.has(serverId);
  }

  /** 获取所有连接状态 */
  getConnections(): Array<{ config: MCPServerConfig; toolCount: number }> {
    return [...this.connections.values()].map((c) => ({
      config: c.config,
      toolCount: c.tools.length,
    }));
  }

  /** 断开所有连接 */
  async disconnectAll(): Promise<void> {
    const ids = [...this.connections.keys()];
    await Promise.all(ids.map((id) => this.disconnect(id)));
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
