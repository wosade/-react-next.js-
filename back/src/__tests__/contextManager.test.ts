/**
 * 上下文窗口管理测试
 */
import { describe, it, expect } from "vitest";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import { manageContext, getTruncationNote } from "../lib/contextManager.js";

describe("manageContext", () => {
  it("短消息列表不应截断", () => {
    const messages = [
      new SystemMessage("你是助手"),
      new HumanMessage("你好"),
      new AIMessage("你好！"),
    ];

    const result = manageContext(messages);
    expect(result.truncated).toBe(0);
    expect(result.messages).toHaveLength(3);
  });

  it("应始终保留 system message", () => {
    const messages = [new SystemMessage("你是助手"), new HumanMessage("hi")];

    const result = manageContext(messages);
    expect(result.messages[0].getType()).toBe("system");
  });

  it("超长历史应截断旧消息，保留最近消息", () => {
    const messages = [
      new SystemMessage("你是助手"),
      // 大量旧消息（模拟长对话）
      ...Array.from({ length: 50 }, (_, i) =>
        i % 2 === 0
          ? new HumanMessage(`问题 ${i}: `.padEnd(500, "x"))
          : new AIMessage(`回答 ${i}: `.padEnd(500, "y")),
      ),
      new HumanMessage("最新问题"),
    ];

    const result = manageContext(messages, { maxTokens: 4000 });
    // 应该截断了一些旧消息
    expect(result.truncated).toBeGreaterThan(0);
    // 最新消息应该保留
    const lastMsg = result.messages[result.messages.length - 1];
    expect(lastMsg.content).toBe("最新问题");
    // system message 必须保留
    expect(result.messages[0].getType()).toBe("system");
  });

  it("极小的 token 预算至少保留 system + 最后一条", () => {
    const messages = [
      new SystemMessage("你是助手"),
      new HumanMessage("旧问题"),
      new AIMessage("旧回复"),
      new HumanMessage("最新问题"),
    ];

    // 极小预算
    const result = manageContext(messages, {
      maxTokens: 100,
      minRecentMessages: 1,
    });

    // system + 最后一条
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.messages[result.messages.length - 1].content).toBe(
      "最新问题",
    );
  });

  it("空消息列表应返回空", () => {
    const result = manageContext([]);
    expect(result.messages).toHaveLength(0);
    expect(result.truncated).toBe(0);
  });
});

describe("getTruncationNote", () => {
  it("截断数 > 0 应返回提示", () => {
    const note = getTruncationNote(5);
    expect(note).toContain("5");
    expect(note).toContain("省略");
  });

  it("截断数 = 0 应返回空字符串", () => {
    expect(getTruncationNote(0)).toBe("");
  });
});
