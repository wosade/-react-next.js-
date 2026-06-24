/**
 * LLM 响应缓存服务
 *
 * 对消息列表做 SHA256 哈希，命中则直接返回缓存结果，避免重复调用 LLM。
 * 典型场景：
 *  - 用户问相同/高度相似的问题
 *  - 系统提示词经常重复
 */
import { createHash } from 'crypto';
import redis from '../lib/redis.js';

const CACHE_PREFIX = 'llm:cache:';
const DEFAULT_TTL = 60 * 30; // 默认 30 分钟

/**
 * 对消息列表做哈希，生成缓存 key
 * 只取 hash 前 16 位，足够去重且节省内存
 */
function hashMessages(messages: { role: string; content: string }[]): string {
  const normalized = messages.map((m) => `${m.role}:${m.content}`).join('|');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * 检查缓存中是否有匹配的 LLM 回复
 * @returns 缓存的回复文本，未命中返回 null
 */
export async function getCachedResponse(
  messages: { role: string; content: string }[],
): Promise<string | null> {
  try {
    const key = CACHE_PREFIX + hashMessages(messages);
    const cached = await redis.get(key);
    if (cached) {
      console.log('[LLMCache] ✅ 命中缓存');
      return cached;
    }
    console.log('[LLMCache] ❌ 未命中');
    return null;
  } catch (err) {
    console.error('[LLMCache] 读取缓存失败:', err);
    return null; // fail-open
  }
}

/**
 * 将 LLM 回复写入缓存
 * @param messages  原始消息列表
 * @param response  LLM 返回的完整回复
 * @param ttl       过期时间（秒），默认 30 分钟
 */
export async function setCachedResponse(
  messages: { role: string; content: string }[],
  response: string,
  ttl: number = DEFAULT_TTL,
): Promise<void> {
  try {
    const key = CACHE_PREFIX + hashMessages(messages);
    await redis.setex(key, ttl, response);
    console.log('[LLMCache] 💾 已缓存回复, TTL:', ttl, 's');
  } catch (err) {
    console.error('[LLMCache] 写入缓存失败:', err);
  }
}

/**
 * 手动清除某条缓存（一般不需要，保留以备后用）
 */
export async function invalidateCache(
  messages: { role: string; content: string }[],
): Promise<void> {
  try {
    const key = CACHE_PREFIX + hashMessages(messages);
    await redis.del(key);
  } catch (err) {
    console.error('[LLMCache] 清除缓存失败:', err);
  }
}
