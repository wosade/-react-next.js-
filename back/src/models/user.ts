/**
 * 用户模型 — 纯数据库 CRUD，不包含业务逻辑
 */
import pool from '../lib/db.js';

/** 数据库 row 类型（snake_case） */
interface UserRow {
  id: string;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
}

/** 对外暴露的用户类型（camelCase） */
export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

/** snake_case → camelCase 转换命名为驼峰命名*/
function toCamel(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 根据用户名查找用户 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username = ?',
    [username],
  );
  const list = rows as UserRow[];
  return list.length > 0 ? toCamel(list[0]) : null;
}

/** 根据 ID 查找用户 */
export async function findUserById(id: string): Promise<User | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id],
  );
  const list = rows as UserRow[];
  return list.length > 0 ? toCamel(list[0]) : null;
}

/** 创建新用户，返回创建好的用户对象 */
export async function createUser(
  id: string,
  username: string,
  hashedPassword: string,
): Promise<User> {
  const now = new Date().toISOString();
  await pool.execute(
    'INSERT INTO users (id, username, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, username, hashedPassword, now, now],
  );
  // 查出来返回（保证字段一致）
  return (await findUserById(id))!;
}
