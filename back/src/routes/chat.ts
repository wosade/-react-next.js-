import { Router, Request, Response } from 'express';
import { chat } from '../services/llmService.js';

const router = Router();

/**
 * POST /api/chat/send
 * 一次性问答：接收用户消息，调用大模型，返回完整回复。
 * Body: { message: string }
 * Response: { reply: string }
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: '请提供 message 字段' });
      return;
    }

    console.log(`[CHAT] 收到消息: ${message.slice(0, 50)}...`);

    const reply = await chat([{ role: 'user', content: message }]);

    console.log(`[CHAT] 回复: ${reply.slice(0, 50)}...`);

    res.json({ reply });
  } catch (err: any) {
    console.error('[CHAT] 调用大模型失败:', err);
    res.status(500).json({ error: err?.message || '调用大模型失败' });
  }
});

export default router;
