/**
 * 应用启动时自动建表（幂等：CREATE TABLE IF NOT EXISTS）
 */
import pool from "./db.js";

export async function initDb(): Promise<void> {
  // 存储用户信息
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         VARCHAR(36)  NOT NULL PRIMARY KEY,
      username   VARCHAR(50)  NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at VARCHAR(24)  NOT NULL,
      updated_at VARCHAR(24)  NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // 存储对话列表
  await pool.execute(`
      CREATE       TABLE IF NOT EXISTS conversations(
      id           VARCHAR(36) NOT NULL PRIMARY KEY,
      user_id      VARCHAR(36) NOT NULL,
      title        VARCHAR(200) NOT NULL DEFAULT '新对话',
       last_message TEXT         NOT NULL ,
      created_at   VARCHAR(24)  NOT NULL,
      updated_at   VARCHAR(24)  NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
  //存储每个对话的具体内容
   await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id              VARCHAR(36)  NOT NULL PRIMARY KEY,
      conversation_id VARCHAR(36)  NOT NULL,
      role            VARCHAR(10)  NOT NULL,
      content         TEXT         NOT NULL,
      tool_calls      JSON         NULL,
      created_at      VARCHAR(24)  NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
