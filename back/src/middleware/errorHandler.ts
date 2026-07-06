import type { Request, Response, NextFunction } from 'express';
import { log } from '../lib/logger.js';

/** 自定义错误类，带 HTTP 状态码 */
export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 统一错误处理中间件 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err instanceof AppError ? err.status : 500;
  const message = err.message || '服务器内部错误';

  if (status === 500) {
    log.error('[Error]', err);
  }

  res.status(status).json({ error: message });
}
