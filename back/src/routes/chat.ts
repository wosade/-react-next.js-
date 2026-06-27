import { Router, Request, Response } from 'express';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { runAgent } from '../services/chatService.js';

const router = Router();

router.post('/send', chatLimiter, async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: '请提供 message 字段' });
    return;
  }

  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  console.log(`[CHAT] ${message.slice(0, 50)}...`);

  try {
    for await (const event of runAgent(message)) {
      res.write(`data:${JSON.stringify(event)}\n\n`);
    }
    res.end();
  } catch (err: any) {
    // SSE 头已发出，只能用流格式报错
    res.write(
      `data:${JSON.stringify({ type: 'error', message: err.message })}\n\n`,
    );
    res.end();
  }
});

export default router;
