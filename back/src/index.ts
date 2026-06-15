import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
