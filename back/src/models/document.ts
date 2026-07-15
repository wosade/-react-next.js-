/**
 * 文档表 Model — 记录上传的文档元信息
 *
 * 缓存策略：
 * - listByUser(userId): 读缓存
 * - findById(id): 读缓存
 * - 新增/删除 → 失效用户列表缓存
 */

import pool from '../lib/db.js';
import { nowISO, toCamel } from '../lib/utils.js';
import { cacheGet, cacheDel } from '../lib/cache.js';

const TTL_LIST = 300; // 文档列表 5 分钟
const TTL_FIND = 600; // 单文档 10 分钟

function docListKey(userId: string) {
  return `doc:list:${userId}`;
}

function docKey(id: string) {
  return `doc:detail:${id}`;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  filePath: string;
  createdAt: string;
}

export async function createDocument(doc: {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  filePath: string;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO documents (id, user_id, name, type, size, chunk_count, file_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [doc.id, doc.userId, doc.name, doc.type, doc.size, doc.chunkCount, doc.filePath, nowISO()],
  );

  // 新增文档 → 失效用户列表缓存
  await cacheDel(docListKey(doc.userId));
}

/** 按用户列出所有文档（最新在前） */
export async function listByUser(userId: string): Promise<DocumentRecord[]> {
  return cacheGet(
    docListKey(userId),
    async () => {
      const [rows] = await pool.execute(
        `SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
      );
      return (rows as any[]).map(toCamel) as DocumentRecord[];
    },
    TTL_LIST,
  );
}

/** 按 ID 查找 */
export async function findById(id: string): Promise<DocumentRecord | null> {
  return cacheGet(
    docKey(id),
    async () => {
      const [rows] = await pool.execute(
        `SELECT * FROM documents WHERE id = ?`,
        [id],
      );
      const list = (rows as any[]).map(toCamel) as DocumentRecord[];
      return list[0] || null;
    },
    TTL_FIND,
  );
}

/** 删除文档记录 */
export async function deleteById(id: string): Promise<void> {
  // 先获取 userId 用于失效缓存
  const doc = await findById(id);

  await pool.execute(`DELETE FROM documents WHERE id = ?`, [id]);

  // 删除 → 失效文档详情和用户列表缓存
  await cacheDel(docKey(id));
  if (doc) {
    await cacheDel(docListKey(doc.userId));
  }
}