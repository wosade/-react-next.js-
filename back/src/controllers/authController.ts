/**
 * 认证控制器 — 注册 / 登录 / 获取用户信息 / 更新 SMTP 配置
 */
import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import * as userModel from '../models/user.js';
import type { AuthRequest } from '../middleware/auth.js';

/** 注册新用户 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { username, password } = req.body;
    const result = await authService.registerUser(username, password);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/** 用户登录 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/** 获取当前登录用户信息 */
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getUserById(req.userId!);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

/** 更新当前用户的 SMTP 配置 */
export async function updateSmtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
}