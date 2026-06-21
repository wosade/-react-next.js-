/**
 * MySQL 连接池（单例）
 * 所有数据库操作都通过这个模块获取连接
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';

// 确保环境变量已加载（避免导入顺序问题）
config({ path: resolve(process.cwd(), '.env/.env') });
config({ path: resolve(process.cwd(), '.env/.env.back') });



const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agent_chat',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

export default pool;