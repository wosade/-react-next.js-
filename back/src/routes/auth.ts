/**
 * 认证路由 — POST /api/auth/register | POST /api/auth/login | GET /api/auth/me | PUT /api/auth/smtp
 */
import { Router } from 'express';
import * as authService from '../services/authService.js';
import { requireJwt, type AuthRequest } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import * as userModel from '../models/user.js';

const router = Router();

/** POST /api/auth/register — 注册 */
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.registerUser(username, password);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login — 登录 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me — 获取当前用户信息（需登录） */
router.get('/me', requireJwt, async (req: AuthRequest, res, next) => {
  try {
    const user = await authService.getUserById(req.userId!);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/auth/smtp — 更新当前用户的 SMTP 配置（需登录） */
router.put('/smtp', requireJwt, async (req: AuthRequest, res, next) => {
  try {
    const { host, port, user, pass, from } = req.body;
    if (!host || !user || !pass || !from) {
      res.status(400).json({ error: 'host, user, pass, from 为必填项' });
      return;
    }
    await userModel.updateUserSmtp(req.userId!, {
      host,
      port: Number(port) || 587,
      user,
      pass,
      from,
    });
    res.json({ message: 'SMTP 配置已保存' });
  } catch (err) {
    next(err);
  }
});

export default router;