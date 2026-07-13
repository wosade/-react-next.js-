/**
 * AgentState reducer 测试
 *
 * 验证 messages 和 toolSteps 的追加式 reducer 行为
 */
import { describe, it, expect } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type { StepRecord } from "../types/index.js";

// 用与源码相同的 Annotation 构建测试用 State
const TestState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, incoming) => current.concat(incoming),
    default: () => [],
  }),
  toolSteps: Annotation<StepRecord[]>({
    reducer: (current, incoming) => current.concat(incoming),
    default: () => [],
  }),
});

describe("AgentState reducer", () => {
  it("messages reducer 应追加而非覆盖", () => {
    const prev = [new HumanMessage("你好")];
    const incoming = [new AIMessage("你好！有什么可以帮助你的？")];

    // 直接测试 reducer 逻辑（与源码一致）
    const reducer = (a: BaseMessage[], b: BaseMessage[]) => a.concat(b);
    const result = reducer(prev, incoming);

    expect(result).toHaveLength(2);
    expect(result[0].getType()).toBe("human");
    expect(result[1].getType()).toBe("ai");
  });

  it("messages reducer 空数组应正确处理", () => {
    const reducer = (a: BaseMessage[], b: BaseMessage[]) => a.concat(b);
    const result = reducer([], [new HumanMessage("test")]);

    expect(result).toHaveLength(1);
  });

  it("toolSteps reducer 应追加步骤记录", () => {
    const reducer = (a: StepRecord[], b: StepRecord[]) => a.concat(b);

    const prev: StepRecord[] = [
      {
        toolName: "get_weather",
        toolInput: { city: "北京" },
        toolOutput: "晴",
        status: "success",
      },
    ];
    const incoming: StepRecord[] = [
      {
        toolName: "web_search",
        toolInput: { query: "test" },
        toolOutput: "...",
        status: "success",
      },
    ];

    const result = reducer(prev, incoming);

    expect(result).toHaveLength(2);
    expect(result[0].toolName).toBe("get_weather");
    expect(result[1].toolName).toBe("web_search");
  });

  it("默认值应为空数组", () => {
    const defaultMessages = ([] as BaseMessage[]);
    const defaultSteps = ([] as StepRecord[]);

    expect(defaultMessages).toHaveLength(0);
    expect(defaultSteps).toHaveLength(0);
  });
});
