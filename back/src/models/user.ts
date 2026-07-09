/**
 * 用户模型 — 纯数据库 CRUD，不包含业务逻辑
 *
 * 缓存策略：
 * - findUserById / findUserByUsername: 读缓存 + DB fallback
 * - updateUserSmtp: 写后清除该用户的所有缓存
 */
import pool from '../lib/db.js';
import { toCamel, nowISO } from '../lib/utils.js';
import { cacheGet, cacheDel, cacheDelByPrefix } from '../lib/cache.js';

const TTL = 600; // 10 分钟

function userKey(type: 'id' | 'name', value: string) {
  return `user:${type}:${value}`;
}

/** 数据库 row 类型（snake_case） */
interface UserRow {
  id: string;
  username: string;
  password: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  created_at: string;
  updated_at: string;
}

/** 对外暴露的用户类型（camelCase） */
export interface User {
  id: string;
  username: string;
  password: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  createdAt: string;
  updatedAt: string;
}

/** 根据用户名查找用户 */
export async function findUserByUsername(username: string): Promise<User | null> {
  return cacheGet(
    userKey('name', username),
    async () => {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username],
      );
      const list = rows as UserRow[];
      return list.length > 0
        ? (toCamel<User>(list[0] as unknown as Record<string, unknown>))
        : null;
    },
    TTL,
  );
}

/** 根据 ID 查找用户 */
export async function findUserById(id: string): Promise<User | null> {
  return cacheGet(
    userKey('id', id),
    async () => {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [id],
      );
      const list = rows as UserRow[];
      return list.length > 0
        ? (toCamel<User>(list[0] as unknown as Record<string, unknown>))
        : null;
    },
    TTL,
  );
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
  return (await findUserById(id))!;
}

/** 更新用户的 SMTP 配置 */
export async function updateUserSmtp(
  id: string,
  smtp: { host: string; port: number; user: string; pass: string; from: string },
): Promise<void> {
  const now = nowISO();
  await pool.execute(
    `UPDATE users SET smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, smtp_from=?, updated_at=? WHERE id=?`,
    [smtp.host, smtp.port, smtp.user, smtp.pass, smtp.from, now, id],
  );

  // 清除该用户的所有缓存（保留 findByUsername 的缓存，因为 username 没变）
  await cacheDel(userKey('id', id));
}