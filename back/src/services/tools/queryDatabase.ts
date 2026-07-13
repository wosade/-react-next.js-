import { z } from "zod";
import pool from "../../lib/db.js";

/** query_database 工具参数 Schema */
export const queryDatabaseSchema = z.object({
  sql: z
    .string()
    .min(1, "SQL 语句不能为空")
    .describe(
      'SELECT 查询语句，如 "SELECT COUNT(*) FROM users WHERE created_at > \'2026-01-01\'"',
    ),
});

/** OpenAI function definition（与 Schema 保持一致） */
export const queryDatabaseDefinition = {
  type: "function" as const,
  function: {
    name: "query_database",
    description:
      "查询业务数据库。当用户询问统计数据、用户信息、订单记录等数据库中的信息时，用此工具执行 SQL 查询。仅支持 SELECT。",
    parameters: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string" as const,
          description:
            'SELECT 查询语句，如 "SELECT COUNT(*) FROM users WHERE created_at > \'2026-01-01\'"',
        },
      },
      required: ["sql"],
    },
  },
};

// ══════════════════════════════════════════════════════════════
//  SQL 安全校验（纵深防御）
// ══════════════════════════════════════════════════════════════

/** 危险关键字 — 即使在注释中也不允许出现 */
const DANGEROUS_PATTERNS = [
  // DML（写操作）
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bREPLACE\b/i,
  /\bMERGE\b/i,
  // DDL（结构变更）
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bTRUNCATE\b/i,
  /\bCREATE\b/i,
  /\bRENAME\b/i,
  // 权限控制
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  // 执行/调用
  /\bEXEC(UTE)?\b/i,
  /\bCALL\b/i,
  // 文件操作
  /\bLOAD\b/i,
  /\bINTO\s+(OUTFILE|DUMPFILE)\b/i,
  // 危险的系统变量/函数
  /\bINTO\s+(OUTFILE|DUMPFILE)\b/i,
  /\bSLEEP\s*\(/i,
  /\bBENCHMARK\s*\(/i,
  // 联合查询注入
  /\bUNION\b/i,
];

/** SQL 查询安全配置 */
const MAX_ROWS = 50;
const QUERY_TIMEOUT_MS = 5000;

/**
 * 多层 SQL 校验
 * 1. 必须以 SELECT 开头（忽略前导空白）
 * 2. 扫描危险关键字
 * 3. 使用只读事务 + 超时执行
 */
function validateSql(sql: string): void {
  const trimmed = sql.trim();

  // 第 1 层：只允许 SELECT 开头
  if (!/^SELECT\b/i.test(trimmed)) {
    throw new Error("仅允许 SELECT 查询，且必须以 SELECT 开头");
  }

  // 第 2 层：危险关键字扫描（含注释绕过检测）
  // 先去掉 SQL 注释再检查
  const withoutComments = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, "") // 块注释 /* ... */
    .replace(/--[^\n]*/g, "") // 行注释 -- ...
    .replace(/#[^\n]*/g, ""); // MySQL 行注释 # ...

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(withoutComments)) {
      throw new Error(
        `SQL 包含禁止的操作: ${pattern.source.replace(/\\b/g, "")}`,
      );
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  执行函数
// ══════════════════════════════════════════════════════════════

export async function queryDatabaseTool(
  args: z.infer<typeof queryDatabaseSchema>,
): Promise<string> {
  const { sql } = args;

  // ── 校验 ──
  validateSql(sql);

  // ── 获取只读连接 ──
  const conn = await pool.getConnection();

  try {
    // 设置只读事务 + 查询超时
    await conn.execute("SET SESSION TRANSACTION READ ONLY");
    await conn.execute(`SET SESSION max_execution_time = ${QUERY_TIMEOUT_MS}`);

    const [rows] = await conn.execute(sql);
    const data = rows as any[];

    const sliced = data.slice(0, MAX_ROWS);

    return JSON.stringify(
      {
        rowCount: data.length,
        returned: sliced.length,
        truncated: data.length > MAX_ROWS,
        rows: sliced,
      },
      null,
      2,
    );
  } catch (err: any) {
    throw new Error(`数据库查询失败: ${err.message}`);
  } finally {
    conn.release();
  }
}
