/**
 * JWT 鉴权中间件
 * 验证 Authorization: Bearer {token}，把 userId 挂到 req 上
 * 注意：文件名为 auth.ts，不能和包名 jsonwebtoken 的 jwt 冲突，所以用 requireJwt
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/** 扩展 Express Request，加上 userId */
export interface AuthRequest extends Request {
  userId?: string;
}

/** 必须登录：未带 token 返回 401 */
export function requireJwt(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录，请先登录' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' });
  }
}
