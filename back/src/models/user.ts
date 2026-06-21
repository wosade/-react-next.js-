/**
 * 用户模型 — 纯数据库 CRUD，不包含业务逻辑
 */
import pool from '../lib/db.js';
import { toCamel, nowISO } from '../lib/utils.js';

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

/** 根据用户名查找用户 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username = ?',
    [username],
  );
  const list = rows as UserRow[];
  return list.length > 0 ? toCamel<User>(list[0] as unknown as Record<string, unknown>) : null;
}

/** 根据 ID 查找用户 */
export async function findUserById(id: string): Promise<User | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id],
  );
  const list = rows as UserRow[];
  return list.length > 0 ? toCamel<User>(list[0] as unknown as Record<string, unknown>) : null;
}

/** 创建新用户，返回创建好的用户对象 */
export async function createUser(
  id: string,
  username: string,
  hashedPassword: string,
): Promise<User> {
  const now = nowISO();
  await pool.execute(
    'INSERT INTO users (id, username, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, username, hashedPassword, now, now],
  );
  // 查出来返回（保证字段一致）
  return (await findUserById(id))!;
}
