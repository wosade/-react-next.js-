/**
 * MCP Server 配置模型 — 数据库 CRUD
 */
import pool from "../lib/db.js";
import { generateId, nowISO } from "../lib/utils.js";
import type { MCPServerConfig } from "../services/mcp/index.js";

interface MCPServerRow {
  id: string;
  user_id: string;
  name: string;
  transport: "stdio" | "sse";
  command: string | null;
  args: string | null;
  url: string | null;
  enabled: number; // 0 or 1
  created_at: string;
}

function toConfig(row: MCPServerRow): MCPServerConfig {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport,
    command: row.command || undefined,
    args: row.args ? (typeof row.args === "string" ? JSON.parse(row.args) : row.args) : undefined,
    url: row.url || undefined,
    enabled: row.enabled === 1,
  };
}

/** 获取用户的所有 MCP Server 配置 */
export async function listByUser(userId: string): Promise<MCPServerConfig[]> {
  const [rows] = await pool.execute(
    "SELECT * FROM mcp_servers WHERE user_id = ? ORDER BY created_at ASC",
    [userId],
  );
  return (rows as MCPServerRow[]).map(toConfig);
}

/** 根据 ID 获取单个配置 */
export async function findById(id: string): Promise<MCPServerConfig | null> {
  const [rows] = await pool.execute(
    "SELECT * FROM mcp_servers WHERE id = ?",
    [id],
  );
  const list = rows as MCPServerRow[];
  return list.length > 0 ? toConfig(list[0]) : null;
}

/** 创建 MCP Server 配置 */
export async function create(
  userId: string,
  data: {
    name: string;
    transport: "stdio" | "sse";
    command?: string;
    args?: string[];
    url?: string;
  },
): Promise<MCPServerConfig> {
  const id = generateId();
  const now = nowISO();
  await pool.execute(
    `INSERT INTO mcp_servers (id, user_id, name, transport, command, args, url, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      userId,
      data.name,
      data.transport,
      data.command || null,
      data.args ? JSON.stringify(data.args) : null,
      data.url || null,
      now,
    ],
  );
  return (await findById(id))!;
}

/** 更新 MCP Server 配置 */
export async function update(
  id: string,
  data: Partial<{
    name: string;
    command: string;
    args: string[];
    url: string;
    enabled: boolean;
  }>,
): Promise<MCPServerConfig | null> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.command !== undefined) {
    fields.push("command = ?");
    values.push(data.command);
  }
  if (data.args !== undefined) {
    fields.push("args = ?");
    values.push(JSON.stringify(data.args));
  }
  if (data.url !== undefined) {
    fields.push("url = ?");
    values.push(data.url);
  }
  if (data.enabled !== undefined) {
    fields.push("enabled = ?");
    values.push(data.enabled ? 1 : 0);
  }

  if (fields.length === 0) return findById(id);

  values.push(id);
  await pool.execute(
    `UPDATE mcp_servers SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
  return findById(id);
}

/** 删除 MCP Server 配置 */
export async function remove(id: string): Promise<boolean> {
  const [result] = await pool.execute("DELETE FROM mcp_servers WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}
