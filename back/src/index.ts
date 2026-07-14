import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// 从 back/.env/ 加载配置（必须在所有业务 import 之前）
dotenvConfig({ path: resolve(import.meta.dirname, '../.env/.env') });
dotenvConfig({ path: resolve(import.meta.dirname, '../.env/.env.back') });

// 初始化并校验必填环境变量
import { initConfig } from './lib/envConfig.js';
initConfig();

import express from 'express';
import cors from 'cors';
import { initDb } from './lib/initDb.js';
import redis from './lib/redis.js';
import conversationsRouter from './routes/conversations.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import knowledgeRouter from './routes/knowledge.js';
import { errorHandler } from './middleware/errorHandler.js';
import { log } from './lib/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;
// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, _res, next) => {
  log.info(`${req.method} ${req.url}`);
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
      log.info(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    log.error('数据库初始化失败', err);
    process.exit(1);
  });