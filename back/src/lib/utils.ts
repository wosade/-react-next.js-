/**
 * 公共工具方法 — 各模块复用
 */
import { randomUUID } from 'crypto';

/** 生成唯一 ID */
export function generateId(): string {
  return randomUUID();
}

/** 获取当前 ISO 时间字符串 */
export function nowISO(): string {
  return new Date().toISOString();
}

/** snake_case → camelCase 通用转换 */
export function toCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}
