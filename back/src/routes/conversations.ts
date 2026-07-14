/**
 * 会话路由 — 所有接口均需登录
 */
import { Router } from 'express';
import * as conversationController from '../controllers/conversationController.js';
import { requireJwt } from '../middleware/auth.js';

const router = Router();

// 所有会话接口都要登录
router.use(requireJwt);

/** GET /api/conversations — 获取当前用户的会话列表 */
router.get('/', conversationController.getList);

/** POST /api/conversations — 创建新会话 */
router.post('/', conversationController.create);

/** GET /api/conversations/:id — 获取单个会话详情 */
router.get('/:id', conversationController.getDetail);

/** PATCH /api/conversations/:id — 更新会话 */
router.patch('/:id', conversationController.update);

/** DELETE /api/conversations/:id — 删除会话 */
router.delete('/:id', conversationController.remove);

export default router;