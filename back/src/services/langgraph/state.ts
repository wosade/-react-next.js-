import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type { StepRecord } from "../../types/index.js";

/**
 * Agent 状态定义
 *
 * messages  — LangGraph 标准消息通道，reducer 为追加模式
 * toolSteps — 工具调用记录，供 chatService 收集后批量入库
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, incoming) => current.concat(incoming),
    default: () => [],
  }),
  toolSteps: Annotation<StepRecord[]>({
    reducer: (current, incoming) => current.concat(incoming),
    default: () => [],
  }),
});
