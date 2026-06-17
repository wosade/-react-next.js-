import { config } from 'dotenv';
import { resolve } from 'path';

// 从项目根目录 .env/ 加载配置
config({ path: resolve(__dirname, '../../.env/.env') });
config({ path: resolve(__dirname, '../../.env/.env.back') });

import express from 'express';
import cors from 'cors';
import conversationsRouter from './routes/conversations.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/conversations', conversationsRouter);

// 错误处理（必须放在路由之后）
app.use(errorHandler);

// 启动
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
