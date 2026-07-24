/**
 * MCP 控制器 — 管理 MCP Server 的连接和配置
 */
import type { Response, NextFunction } from "express";
import * as mcpServerModel from "../models/mcpServer.js";
import { mcpManager } from "../services/mcp/index.js";
import type { AuthRequest } from "../middleware/auth.js";
import { log } from "../lib/logger.js";

/** 获取当前用户的 MCP Server 列表 */
export async function getList(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const servers = await mcpServerModel.listByUser(req.userId!);
    // 附加连接状态（传入 userId 以区分私有连接）
    const result = servers.map((s) => ({
      ...s,
      connected: mcpManager.isConnected(s.id, req.userId),
    }));
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/** 创建 MCP Server 配置 */
export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, transport, command, args, url } = req.body;
    if (!name || !transport) {
      res.status(400).json({ error: "name 和 transport 为必填项" });
      return;
    }
    const config = await mcpServerModel.create(req.userId!, {
      name,
      transport,
      command,
      args,
      url,
    });
    res.status(201).json({ data: config });
  } catch (err) {
    next(err);
  }
}

/** 更新 MCP Server 配置 */
export async function update(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, command, args, url, enabled } = req.body;

    const existing = await mcpServerModel.findById(id);
    if (!existing) {
      res.status(404).json({ error: "MCP Server 不存在" });
      return;
    }

    // 先断开旧连接
    await mcpManager.disconnect(id, req.userId);

    const updated = await mcpServerModel.update(id, {
      name,
      command,
      args,
      url,
      enabled,
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

/** 删除 MCP Server 配置 */
export async function remove(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await mcpServerModel.findById(id);
    if (!existing) {
      res.status(404).json({ error: "MCP Server 不存在" });
      return;
    }

    // 先断开连接
    await mcpManager.disconnect(id, req.userId);

    await mcpServerModel.remove(id);
    res.json({ data: { message: "删除成功" } });
  } catch (err) {
    next(err);
  }
}

/** 连接 MCP Server */
export async function connect(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const config = await mcpServerModel.findById(id);
    if (!config) {
      res.status(404).json({ error: "MCP Server 不存在" });
      return;
    }

    // 权限校验：私有 MCP 只能由所属用户连接
    if (config.scope === "private") {
      const servers = await mcpServerModel.listByUser(req.userId!);
      const owned = servers.find((s) => s.id === id);
      if (!owned) {
        res.status(403).json({ error: "无权连接此私有 MCP Server" });
        return;
      }
    }

    const tools = await mcpManager.connect(config, req.userId);
    log.info(
      `[MCP] 用户 ${req.userId} 手动连接 ${config.name}（${config.scope}），获得 ${tools.length} 个工具`,
    );
    res.json({ data: { connected: true, toolCount: tools.length, tools: tools.map((t) => ({ name: t.name, description: t.description })) } });
  } catch (err) {
    next(err);
  }
}

/** 断开 MCP Server */
export async function disconnect(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    await mcpManager.disconnect(id, req.userId);
    res.json({ data: { connected: false } });
  } catch (err) {
    next(err);
  }
}

/** 获取 MCP Server 提供的工具列表 */
export async function getTools(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const tools = mcpManager.getServerTools(id, req.userId);
    res.json({
      data: tools.map((t) => ({ name: t.name, description: t.description })),
    });
  } catch (err) {
    next(err);
  }
}

/** 预置热门 MCP Server 模板 */
export const RECOMMENDED_MCP = [
  {
    name: "文件系统",
    description: "读写本地文件，让 Agent 操作项目代码和文档",
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    icon: "📁",
  },
  {
    name: "GitHub",
    description: "管理仓库、PR、Issue，展示 AI + DevOps",
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    icon: "🐙",
    note: "需设置环境变量 GITHUB_PERSONAL_ACCESS_TOKEN",
  },
  {
    name: "Brave 搜索",
    description: "联网搜索，比内置 web_search 更强的搜索引擎",
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    icon: "🔎",
    note: "需设置环境变量 BRAVE_API_KEY（免费申请）",
  },
  {
    name: "记忆图谱",
    description: "持久化知识图谱，让 Agent 拥有长期记忆",
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    icon: "🧠",
  },
];

/** 批量添加推荐 MCP Server */
export async function seedRecommended(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created: any[] = [];
    for (const r of RECOMMENDED_MCP) {
      const existing = await mcpServerModel.listByUser(req.userId!);
      const exists = existing.some((s) => s.name === r.name);
      if (!exists) {
        const config = await mcpServerModel.create(req.userId!, {
          name: r.name,
          transport: r.transport,
          command: r.command,
          args: r.args,
        });
        created.push(config);
      }
    }
    res.json({ data: { created: created.length, alreadyExisted: RECOMMENDED_MCP.length - created.length } });
  } catch (err) {
    next(err);
  }
}
