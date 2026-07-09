/**
 * Redis 缓存工具
 *
 * 提供 cache-aside 模式的缓存读写辅助函数：
 * - 读：先查缓存 → 命中返回 → 未命中查 DB → 写缓存 → 返回
 * - 删：删除缓存 key
 * - 删：按前缀批量删除（用于写操作后失效缓存）
 *
 * 所有缓存操作都有 fail-open 降级：Redis 不可用时不影响业务。
 */
import redis from './redis.js';
import { log } from './logger.js';

const DEFAULT_TTL = 600; // 默认 10 分钟

/**
 * 缓存读取（cache-aside 模式）
 *
 * @param key     Redis key
 * @param fetcher 从数据源获取数据的函数（查 DB / 调 API）
 * @param ttl     缓存过期时间（秒），默认 10 分钟
 * @returns       数据（可能是从缓存或 fetcher 获取）
 */
export async function cacheGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      log.info(`[Cache] ✅ 命中 ${key}`);
      return JSON.parse(cached) as T;
    }
    log.info(`[Cache] ❌ 未命中 ${key}`);
  } catch (err) {
    log.error(`[Cache] 读取失败 ${key}:`, err);
    // fail-open：Redis 挂了直接查 DB
  }

  const data = await fetcher();

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    log.info(`[Cache] 💾 已缓存 ${key}, TTL=${ttl}s`);
  } catch (err) {
    log.error(`[Cache] 写入失败 ${key}:`, err);
  }

  return data;
}

/**
 * 删除单个缓存 key
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
    log.info(`[Cache] 🗑️ 已删除 ${key}`);
  } catch (err) {
    log.error(`[Cache] 删除失败 ${key}:`, err);
  }
}

/**
 * 按前缀批量删除缓存 key
 * 适用于：更新某用户数据后，清除该用户相关的所有缓存
 *
 * @param prefix  key 前缀，如 "user:123" 会删除 "user:123:*" 的所有 key
 */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  try {
    const pattern = `${prefix}:*`;
    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');

    if (deleted > 0) {
      log.info(`[Cache] 🗑️ 已批量删除 ${deleted} 个 ${pattern} 缓存`);
    }
  } catch (err) {
    log.error(`[Cache] 批量删除失败 ${prefix}:`, err);
  }
}