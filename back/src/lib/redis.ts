/**
 * Redis 连接（单例）
 * 所有缓存和限流操作都通过这个模块获取连接
 */
import { Redis } from 'ioredis';
import { log } from './logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  log.info('[Redis] 已连接');
});

redis.on('error', (err: Error) => {
  log.error('[Redis] 连接错误:', err.message);
});

export default redis;
