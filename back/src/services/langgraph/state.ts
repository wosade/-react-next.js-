import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type { StepRecord } from "../../types/index.js";

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