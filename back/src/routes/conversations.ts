/**
 * 会话路由 — 所有接口均需登录
 */
import { Router } from 'express';
import * as conversationService from '../services/conversationService.js';
import { requireJwt, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// 所有会话接口都要登录
router.use(requireJwt);

/** GET /api/conversations — 获取当前用户的会话列表 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const list = await conversationService.getConversationList(req.userId!);
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

/** POST /api/conversations — 创建新会话 */
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { title } = req.body;
    const conv = await conversationService.createConversation(req.userId!, title);
    res.status(201).json({ data: conv });
  } catch (err) {
    next(err);
  }
});

/** GET /api/conversations/:id — 获取单个会话详情 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const conv = await conversationService.getConversation(req.params.id as string);
    res.json({ data: conv });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/conversations/:id — 更新会话 */
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { title } = req.body;
    const conv = await conversationService.updateConversation(req.params.id as string, { title });
    res.json({ data: conv });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/conversations/:id — 删除会话 */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await conversationService.deleteConversation(req.params.id as string);
    res.json({ data: '删除成功' });
  } catch (err) {
    next(err);
  }
});

export default router;
