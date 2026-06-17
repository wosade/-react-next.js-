import { Router } from 'express';
import * as conversationService from '../services/conversationService.js';

const router = Router();

/** GET /api/conversations — 获取会话列表 */
router.get('/', async (_req, res, next) => {
  try {
    const list = await conversationService.getConversationList();
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

/** POST /api/conversations — 创建新会话 */
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    const conv = await conversationService.createConversation(title);
    res.status(201).json({ data: conv });
  } catch (err) {
    next(err);
  }
});

/** GET /api/conversations/:id — 获取单个会话详情 */
router.get('/:id', async (req, res, next) => {
  try {
    const conv = await conversationService.getConversation(req.params.id);
    res.json({ data: conv });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/conversations/:id — 更新会话 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { title } = req.body;
    const conv = await conversationService.updateConversation(req.params.id, { title });
    res.json({ data: conv });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/conversations/:id — 删除会话 */
router.delete('/:id', async (req, res, next) => {
  try {
    await conversationService.deleteConversation(req.params.id);
    res.json({ data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
