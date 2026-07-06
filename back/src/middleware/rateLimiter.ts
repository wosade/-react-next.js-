/**
 * 基于 Redis 的固定窗口限流中间件
 *
 * 使用 INCR + EXPIRE 实现，降级策略为 fail-open：
 * Redis 不可用时放行请求，不阻塞业务。
 */
import { log } from '../lib/logger.js';
import redis from '../lib/redis.js';
import type { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  max: number;
  /** Redis key 前缀 */
  keyPrefix: string;
  /** 自定义错误消息 */
  message?: string;
  /** 自定义 key 生成器（默认用 IP） */
  keyGenerator?: (req: Request) => string;
}

/** 默认：按客户端 IP 识别 */
function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * 创建一个限流中间件
 *
 * 用法：
 *   const loginLimiter = createRateLimiter({ windowMs: 60000, max: 5, keyPrefix: 'rl:login' });
 *   router.post('/login', loginLimiter, handler);
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyPrefix,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = defaultKeyGenerator,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${keyGenerator(req)}`;

    try {
      const current = await redis.incr(key);

      // 首次请求设置窗口过期时间
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      // 设置标准限流响应头
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));

      if (current > max) {
        const ttl = await redis.pttl(key);
        res.setHeader('Retry-After', Math.ceil(Math.max(0, ttl) / 1000));
        res.status(429).json({ error: message });
        return;
      }

      next();
    } catch (err) {
      // Redis 挂了 → 降级放行（fail-open）
      log.error('[RateLimiter] Redis 异常，降级放行:', err);
      next();
    }
  };
}

// ========== 预置的限流器 ==========

/** 登录接口限流：单 IP 每分钟 5 次 */
export const loginLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  keyPrefix: 'rl:login',
  message: '登录过于频繁，请 1 分钟后再试',
});

/** 注册接口限流：单 IP 每分钟 3 次 */
export const registerLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 3,
  keyPrefix: 'rl:register',
  message: '注册过于频繁，请稍后再试',
});

/** 聊天接口限流：单 IP 每分钟 20 次 */
export const chatLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyPrefix: 'rl:chat',
  message: '消息发送过快，请稍后再试',
});

/**
 * 按 userId 限流（用于需要登录的接口）
 * 和上面的 chatLimiter 不同，这个按用户而非 IP 来限
 */
export function createUserRateLimiter(windowMs: number, max: number, prefix: string) {
  return createRateLimiter({
    windowMs,
    max,
    keyPrefix: prefix,
    keyGenerator: (req: any) => req.userId || defaultKeyGenerator(req),
    message: '操作过于频繁，请稍后再试',
  });
}
