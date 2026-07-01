/**
 * query_database 工具 — Agent 用它查询业务数据库
 *
 * 安全限制：只允许 SELECT，禁止 INSERT/UPDATE/DELETE/DROP 等写操作
 */

import pool from '../../lib/db.js';

/** SQL 黑名单关键字（大小写不敏感） */
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
  'UNION', // 防止注入绕过，简单场景禁用
];

/**
 * 安全检查：SQL 只能 SELECT，不能包含危险关键字
 */
function validateSql(sql: string): void {
  const upper = sql.toUpperCase();

  // 必须以 SELECT 开头
  if (!upper.trimStart().startsWith('SELECT')) {
    throw new Error('仅允许 SELECT 查询');
  }

  // 黑名单检查
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // 用单词边界匹配，避免误杀含有这些字符串的列名
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      throw new Error(`SQL 包含禁止的关键字: ${keyword}`);
    }
  }
}

/**
 * 工具执行函数
 * @param sql LLM 生成的 SELECT 语句
 */
export async function queryDatabaseTool(args: {
  sql: string;
}): Promise<string> {
  const { sql } = args;

  if (!sql || typeof sql !== 'string') {
    throw new Error('请提供 SQL 查询语句');
  }

  validateSql(sql);

  try {
    const [rows] = await pool.execute(sql);

    // 限制返回行数，防止一次返回太多数据撑爆上下文
    const data = rows as any[];
    const MAX_ROWS = 50;
    const sliced = data.slice(0, MAX_ROWS);

    const result = {
      rowCount: data.length,
      returned: sliced.length,
      rows: sliced,
    };

    return JSON.stringify(result, null, 2);
  } catch (err: any) {
    throw new Error(`数据库查询失败: ${err.message}`);
  }
}
