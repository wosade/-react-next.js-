import { z } from 'zod';
import pool from '../../lib/db.js';

/** query_database 工具参数 Schema */
export const queryDatabaseSchema = z.object({
  sql: z
    .string()
    .min(1, 'SQL 语句不能为空')
    .describe(
      'SELECT 查询语句，如 "SELECT COUNT(*) FROM users WHERE created_at > \'2026-01-01\'"',
    ),
});

/** OpenAI function definition（与 Schema 保持一致） */
export const queryDatabaseDefinition = {
  type: 'function' as const,
  function: {
    name: 'query_database',
    description:
      '查询业务数据库。当用户询问统计数据、用户信息、订单记录等数据库中的信息时，用此工具执行 SQL 查询。仅支持 SELECT。',
    parameters: {
      type: 'object' as const,
      properties: {
        sql: {
          type: 'string' as const,
          description:
            'SELECT 查询语句，如 "SELECT COUNT(*) FROM users WHERE created_at > \'2026-01-01\'"',
        },
      },
      required: ['sql'],
    },
  },
};

// ---- SQL 安全检查 ----

const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'REPLACE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'CALL',
  'LOAD',
  'INTO',
  'UNION',
];

function validateSql(sql: string): void {
  const upper = sql.toUpperCase();
  if (!upper.trimStart().startsWith('SELECT')) {
    throw new Error('仅允许 SELECT 查询');
  }
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(sql)) {
      throw new Error(`SQL 包含禁止的关键字: ${keyword}`);
    }
  }
}

// ---- 执行函数 ----

export async function queryDatabaseTool(
  args: z.infer<typeof queryDatabaseSchema>,
): Promise<string> {
  const { sql } = args;
  validateSql(sql);

  try {
    const [rows] = await pool.execute(sql);
    const data = rows as any[];
    const MAX_ROWS = 50;
    const sliced = data.slice(0, MAX_ROWS);

    return JSON.stringify(
      { rowCount: data.length, returned: sliced.length, rows: sliced },
      null,
      2,
    );
  } catch (err: any) {
    throw new Error(`数据库查询失败: ${err.message}`);
  }
}
