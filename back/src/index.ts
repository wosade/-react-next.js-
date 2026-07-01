import { config } from 'dotenv';
import { resolve } from 'path';

// 从 back/.env/ 加载配置
config({ path: resolve(import.meta.dirname, '../.env/.env') });
config({ path: resolve(import.meta.dirname, '../.env/.env.back') });

import express from 'express';
import cors from 'cors';
import { initDb } from './lib/initDb.js';
import redis from './lib/redis.js';
import conversationsRouter from './routes/conversations.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import knowledgeRouter from './routes/knowledge.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 调试日志
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// 路由
app.get('/api/health', async (_req, res) => {
  let redisOk = false;
  try {
    await redis.ping();
    redisOk = true;
  } catch {}
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisOk ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/knowledge', knowledgeRouter);

// 错误处理（必须放在路由之后）
app.use(errorHandler);
// 启动
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] 数据库初始化失败:', err);
    process.exit(1);
  });