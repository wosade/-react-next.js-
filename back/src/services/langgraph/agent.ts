import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { AgentState } from "./state.js";
import { getAllTools, getToolByName } from "./tools.js";
import { getChatModel } from "../llmService.js";
import type { StepRecord } from "../../types/index.js";
import { log } from "../../lib/logger.js";

/** 工具执行超时（毫秒） */
const TOOL_TIMEOUT_MS = 15_000;

let _agents: Map<string, ReturnType<typeof buildAgent>> = new Map();

export function buildAgent(userId?: string) {
  const llm = getChatModel();
  const llmWithTools = llm.bindTools(getAllTools(userId));

  async function callModel(state: typeof AgentState.State) {
    const systemMsg = state.messages.find(
      (m) => m.getType() === "system"
    );
    const messages = systemMsg ? state.messages : [...state.messages];

    const response = await llmWithTools.invoke(messages);

    // 某些模型（如 DeepSeek-R1）可能把 tool_calls 放在 additional_kwargs 里
    if (
      (!response.tool_calls || response.tool_calls.length === 0) &&
      response.additional_kwargs?.tool_calls?.length
    ) {
      log.info(
        `[agent] tool_calls 在 additional_kwargs 中，共 ${response.additional_kwargs.tool_calls.length} 个，已提取`,
      );
      response.tool_calls = response.additional_kwargs.tool_calls as any;
    }

    return { messages: [response] };
  }

  async function executeTools(state: typeof AgentState.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    let toolCalls = lastMessage.tool_calls || [];

    // 如果标准 tool_calls 为空，尝试 additional_kwargs
    if (toolCalls.length === 0 && lastMessage.additional_kwargs?.tool_calls?.length) {
      toolCalls = lastMessage.additional_kwargs.tool_calls as any;
    }

    const toolMessages: ToolMessage[] = [];
    const steps: StepRecord[] = [];

    for (const tc of toolCalls) {
      const tool = getToolByName(tc.name, userId);
      let output: string;
      let status: "success" | "error" = "success";

      try {
        if (tool) {
          // 带超时的工具调用
          output = await Promise.race([
            (tool as any).invoke(tc.args),
            new Promise<string>((_, reject) =>
              setTimeout(
                () => reject(new Error(`工具 "${tc.name}" 执行超时（${TOOL_TIMEOUT_MS / 1000}s）`)),
                TOOL_TIMEOUT_MS,
              ),
            ),
          ]);
        } else {
          const availableTools = getAllTools(userId).map((t) => t.name).join(", ");
          output = `未知工具: "${tc.name}"。可用: ${availableTools}`;
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
    // 检查标准 tool_calls 和 additional_kwargs 中的 tool_calls
    const toolCalls =
      lastMessage.tool_calls?.length
        ? lastMessage.tool_calls
        : lastMessage.additional_kwargs?.tool_calls;
    if (toolCalls?.length) {
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

export function getAgent(userId?: string) {
  const key = userId || "__anonymous__";
  if (!_agents.has(key)) {
    _agents.set(key, buildAgent(userId));
  }
  return _agents.get(key)!;
}

/** 重置 Agent 实例（配置变更后调用）
 *  @param userId — 指定则仅重置该用户；不指定则重置所有
 */
export function resetAgent(userId?: string): void {
  if (userId) {
    _agents.delete(userId);
    log.info(`[agent] 已重置用户 ${userId} 的 Agent`);
  } else {
    _agents.clear();
    log.info("[agent] 已重置所有 Agent");
  }
}
