import { Router, Request, Response } from 'express';
import { chat } from '../services/llmService.js';
import { chatLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * POST /api/chat/send
 * 一次性问答：接收用户消息，调用大模型，返回完整回复。
 * 带 Redis 缓存 + 限流保护
 * Body: { message: string }
 * Response: { reply: string }
 */
router.post('/send', chatLimiter, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "请提供 message 字段" });
      return;
    }
    // 先设置sse响应头
    res.setHeader("Content-Type", "text/event-stream");
    // 每次浏览器本地可以存资源，但每次请求服务器必须重新校验，不能直接拿本地缓存。
    res.setHeader("Cache-Control",'no-cache')
    // 长连接响应头
    res.setHeader("Connection", "keep-alive");
    console.log(`[CHAT] 收到消息: ${message.slice(0, 50)}...`);

    const stream = await chat([{ role: "user", content: message }]);
    // 完整聊天
    let fullReply=''
    for await(const chunck of stream){
      console.assert(chunck)
      const content=chunck.choices[0].delta.content
      if(content){
        fullReply+=content
        res.write(`data:${JSON.stringify({content})}\n\n`)
      }
    }

    res.write(`data:${JSON.stringify({done:true})}\n\n`);
    res.end()
  } catch (err: any) {
    console.error('[CHAT] 调用大模型失败:', err);
    res.status(500).json({ error: err?.message || '调用大模型失败' });
  }
});

export default router;
