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
      smtp_host  VARCHAR(100) NOT NULL DEFAULT '',
      smtp_port  INT          NOT NULL DEFAULT 587,
      smtp_user  VARCHAR(100) NOT NULL DEFAULT '',
      smtp_pass  VARCHAR(100) NOT NULL DEFAULT '',
      smtp_from  VARCHAR(100) NOT NULL DEFAULT '',
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
  // 存储 AI 回复的工具调用步骤
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS steps (
      id          VARCHAR(36)  NOT NULL PRIMARY KEY,
      message_id  VARCHAR(36)  NOT NULL,
      step_order  INT          NOT NULL,
      tool_name   VARCHAR(100) NOT NULL,
      tool_input  JSON         NULL,
      tool_output TEXT         NULL,
      status      VARCHAR(10)  NOT NULL DEFAULT 'success',
      created_at  VARCHAR(24)  NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // 知识库文档元信息（向量存在 Qdrant）
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id          VARCHAR(36)  NOT NULL PRIMARY KEY,
      user_id     VARCHAR(36)  NOT NULL,
      name        VARCHAR(255) NOT NULL,
      type        VARCHAR(20)  NOT NULL,
      size        INT          NOT NULL DEFAULT 0,
      chunk_count INT          NOT NULL DEFAULT 0,
      created_at  VARCHAR(24)  NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // MCP Server 配置
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id          VARCHAR(36)  NOT NULL PRIMARY KEY,
      user_id     VARCHAR(36)  NOT NULL,
      name        VARCHAR(100) NOT NULL,
      transport   VARCHAR(20)  NOT NULL DEFAULT 'stdio',
      command     VARCHAR(500) NULL,
      args        JSON         NULL,
      url         VARCHAR(500) NULL,
      enabled     TINYINT(1)   NOT NULL DEFAULT 1,
      created_at  VARCHAR(24)  NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 确保旧表也使用 utf8mb4（CREATE IF NOT EXISTS 不会修改已存在的表编码）
  const tables = ['users', 'conversations', 'messages', 'steps', 'documents', 'mcp_servers'];
  for (const table of tables) {
    await pool.execute(
      `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  }

  // 为旧 documents 表补充 file_path 列（兼容已有数据库）
  try {
    await pool.execute(
      `ALTER TABLE documents ADD COLUMN file_path VARCHAR(500) NOT NULL DEFAULT ''`,
    );
  } catch {
    // 列已存在则忽略
  }

  // 为旧 messages 表补充 thinking 列（存储推理模型的思考过程）
  try {
    await pool.execute(
      `ALTER TABLE messages ADD COLUMN thinking TEXT NULL COMMENT '推理模型的思考过程(CoT)'`,
    );
  } catch {
    // 列已存在则忽略
  }

  // 为旧 users 表补充 SMTP 列（兼容已有数据库）
  const smtpCols = [
    `ALTER TABLE users ADD COLUMN smtp_host VARCHAR(100) NOT NULL DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN smtp_port INT NOT NULL DEFAULT 587`,
    `ALTER TABLE users ADD COLUMN smtp_user VARCHAR(100) NOT NULL DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN smtp_pass VARCHAR(100) NOT NULL DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN smtp_from VARCHAR(100) NOT NULL DEFAULT ''`,
  ];
  for (const sql of smtpCols) {
    try {
      await pool.execute(sql);
    } catch {
      // 列已存在则忽略
    }
  }
}