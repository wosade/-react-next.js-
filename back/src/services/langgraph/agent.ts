import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";
import { AgentState } from "./state.js";
import { ALL_TOOLS, toolByName } from "./tools.js";
import { getChatModel } from "../llmService.js";
import type { StepRecord } from "../../types/index.js";

/** 工具执行超时（毫秒） */
const TOOL_TIMEOUT_MS = 15_000;

let _agent: ReturnType<typeof buildAgent> | null = null;

export function buildAgent() {
  const llm = getChatModel();
  const llmWithTools = llm.bindTools(ALL_TOOLS);

  async function callModel(state: typeof AgentState.State) {
    const systemMsg = state.messages.find(
      (m) => m.getType() === "system"
    );
    const messages = systemMsg ? state.messages : [...state.messages];

    const response = await llmWithTools.invoke(messages);
    return { messages: [response] };
  }

  async function executeTools(state: typeof AgentState.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMessage.tool_calls || [];

    const toolMessages: ToolMessage[] = [];
    const steps: StepRecord[] = [];

    for (const tc of toolCalls) {
      const tool = (toolByName as Map<string, StructuredTool>).get(tc.name);
      let output: string;
      let status: "success" | "error" = "success";

      try {
        if (tool) {
          // 带超时的工具调用
          output = await Promise.race([
            tool.invoke(tc.args as any),
            new Promise<string>((_, reject) =>
              setTimeout(
                () => reject(new Error(`工具 "${tc.name}" 执行超时（${TOOL_TIMEOUT_MS / 1000}s）`)),
                TOOL_TIMEOUT_MS,
              ),
            ),
          ]);
        } else {
          output = `未知工具: "${tc.name}"。可用: ${[...toolByName.keys()].join(", ")}`;
          status = "error";
        }
      } catch (err: any) {
        output = err.message || String(err);
        status = "error";
      }

      const maxDisplayLen = 300;
      const displayOutput =
        output.length > maxDisplayLen
          ? output.slice(0, maxDisplayLen) +
            `\n\n... (共 ${output.length} 字符，已截断展示)`
          : output;

      toolMessages.push(
        new ToolMessage({
          content: output,
          tool_call_id: tc.id!,
        }),
      );

      steps.push({
        toolName: tc.name,
        toolInput: tc.args as Record<string, unknown>,
        toolOutput: displayOutput,
        status,
      });
    }

    return { messages: toolMessages, toolSteps: steps };
  }

  function shouldContinue(state: typeof AgentState.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    return END;
  }

  // MemorySaver：内存级 checkpointer，服务重启后状态丢失
  // 生产环境可替换为 SqliteSaver / PostgresSaver
  const checkpointer = new MemorySaver();

  const workflow = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("tools", executeTools)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent");

  return workflow.compile({ checkpointer });
}

export function getAgent() {
  if (!_agent) {
    _agent = buildAgent();
  }
  return _agent;
}

/** 重置 Agent 实例（配置变更后调用） */
export function resetAgent(): void {
  _agent = null;
}
