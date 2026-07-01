/**
 * 文档表 Model — 记录上传的文档元信息
 */

import pool from '../lib/db.js';
import { nowISO, toCamel } from '../lib/utils.js';

export interface DocumentRecord {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  createdAt: string;
}

export async function createDocument(doc: {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO documents (id, user_id, name, type, size, chunk_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [doc.id, doc.userId, doc.name, doc.type, doc.size, doc.chunkCount, nowISO()],
  );
}

/** 按用户列出所有文档（最新在前） */
export async function listByUser(userId: string): Promise<DocumentRecord[]> {
  const [rows] = await pool.execute(
    `SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  );
  return (rows as any[]).map(toCamel) as DocumentRecord[];
}

/** 按 ID 查找 */
export async function findById(id: string): Promise<DocumentRecord | null> {
  const [rows] = await pool.execute(
    `SELECT * FROM documents WHERE id = ?`,
    [id],
  );
  const list = (rows as any[]).map(toCamel) as DocumentRecord[];
  return list[0] || null;
}

/** 删除文档记录 */
export async function deleteById(id: string): Promise<void> {
  await pool.execute(`DELETE FROM documents WHERE id = ?`, [id]);
}
