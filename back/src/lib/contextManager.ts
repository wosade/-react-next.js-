/**
 * 上下文窗口管理
 *
 * 当对话历史过长时，自动截断旧消息，防止超出 LLM 上下文限制。
 * 策略：
 *   1. 始终保留 system prompt 和最新用户消息
 *   2. 从旧→新逐步丢弃，直到预算够用
 *   3. System prompt 占用不受限制（假设设计合理）
 */

import type { BaseMessage } from "@langchain/core/messages";
import { log } from "./logger.js";

// ══════════════════════════════════════════════════════════════
//  Token 估算（简化版，兼容中英文）
// ══════════════════════════════════════════════════════════════

/**
 * 粗略估算消息的 token 数
 * - 英文：~4 字符/token
 * - 中文：~1.5 字符/token
 * - 混合文本按比例加权
 */
function estimateTokens(text: string): number {
  let chineseChars = 0;
  let otherChars = 0;

  for (const char of text) {
    if (/[一-鿿㐀-䶿]/.test(char)) {
      chineseChars++;
    } else {
      otherChars++;
    }
  }

  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/** 估算单条消息的 token 数 */
function estimateMessageTokens(msg: BaseMessage): number {
  const content =
    typeof msg.content === "string"
      ? msg.content
      : JSON.stringify(msg.content);
  return estimateTokens(content);
}

// ══════════════════════════════════════════════════════════════
//  上下文窗口管理
// ══════════════════════════════════════════════════════════════

/** 默认最大 token 预算（DeepSeek-V4 上下文 128K，留 32K 给输出） */
const DEFAULT_MAX_TOKENS = 96_000;

/** 保留的最新消息数（至少保留最近 N 轮对话） */
const MIN_RECENT_MESSAGES = 4;

export interface ContextConfig {
  /** 最大 token 预算 */
  maxTokens?: number;
  /** 最少保留的最近消息数 */
  minRecentMessages?: number;
}

/**
 * 对消息列表做上下文截断
 *
 * @param messages     完整的消息列表
 * @param config       可选配置
 * @returns            截断后的消息列表 + 统计信息
 */
export function manageContext(
  messages: BaseMessage[],
  config: ContextConfig = {},
): { messages: BaseMessage[]; truncated: number; estimatedTokens: number } {
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const minRecent = config.minRecentMessages ?? MIN_RECENT_MESSAGES;

  if (messages.length === 0) {
    return { messages: [], truncated: 0, estimatedTokens: 0 };
  }

  // 计算总 token
  const totalTokens = messages.reduce(
    (sum, m) => sum + estimateMessageTokens(m),
    0,
  );

  // 未超预算，直接返回
  if (totalTokens <= maxTokens) {
    return { messages, truncated: 0, estimatedTokens: totalTokens };
  }

  // 找 system message 的位置
  const systemIdx = messages.findIndex((m) => m.getType() === "system");
  const systemTokens =
    systemIdx >= 0 ? estimateMessageTokens(messages[systemIdx]) : 0;

  // 可丢弃的中间部分（system 之后的非 system 消息，到倒数 minRecent 条之前）
  const discardableStart = systemIdx >= 0 ? systemIdx + 1 : 0;
  const discardableEnd = Math.max(
    discardableStart,
    messages.length - minRecent,
  );

  let budgetUsed = 0;
  const kept: BaseMessage[] = [];

  // 保留 system message
  if (systemIdx >= 0) {
    kept.push(messages[systemIdx]);
    budgetUsed += systemTokens;
  }

  // 从后往前保留（优先保留最近的消息）
  const fromEnd: BaseMessage[] = [];
  for (let i = messages.length - 1; i >= discardableStart; i--) {
    const msgTokens = estimateMessageTokens(messages[i]);
    if (budgetUsed + msgTokens <= maxTokens) {
      fromEnd.unshift(messages[i]);
      budgetUsed += msgTokens;
    } else {
      // 预算不够，跳过这条及之前所有可丢弃的
      break;
    }
  }

  const result = [
    ...(systemIdx >= 0 ? [messages[systemIdx]] : []),
    ...fromEnd,
  ];

  const truncated = messages.length - result.length;

  if (truncated > 0) {
    log.info(
      `[ContextManager] 截断 ${truncated} 条旧消息，` +
        `保留 ${result.length} 条，估算 ${estimateTokensOld(result)} tokens`,
    );
  }

  return {
    messages: result,
    truncated,
    estimatedTokens: estimateTokensOld(result),
  };
}

/** 内部：计算一组消息的 token 估算 */
function estimateTokensOld(messages: BaseMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
}

/**
 * 获取截断摘要信息（可插入到 system prompt 中提示模型）
 */
export function getTruncationNote(truncated: number): string {
  if (truncated <= 0) return "";
  return `（注：因对话过长，已自动省略 ${truncated} 条较早的消息以保持在上下文限制内。）`;
}
