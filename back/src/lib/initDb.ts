/**
 * 应用启动时自动建表（幂等：CREATE TABLE IF NOT EXISTS）
 */
import pool from './db.js';

export async function initDb(): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         VARCHAR(36)  NOT NULL PRIMARY KEY,
      username   VARCHAR(50)  NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at VARCHAR(24)  NOT NULL,
      updated_at VARCHAR(24)  NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

}
