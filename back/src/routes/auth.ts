/**
 * 认证路由 — POST /api/auth/register | POST /api/auth/login | GET /api/auth/me | PUT /api/auth/smtp
 */
import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireJwt } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/** POST /api/auth/register — 注册 */
router.post('/register', registerLimiter, authController.register);

/** POST /api/auth/login — 登录 */
router.post('/login', loginLimiter, authController.login);

/** GET /api/auth/me — 获取当前用户信息（需登录） */
router.get('/me', requireJwt, authController.getMe);

/** PUT /api/auth/smtp — 更新当前用户的 SMTP 配置（需登录） */
router.put('/smtp', requireJwt, authController.updateSmtp);

export default router;