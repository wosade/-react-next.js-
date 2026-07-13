import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";
import { AgentState } from "./state.js";
import { ALL_TOOLS, toolByName } from "./tools.js";
import type { StepRecord } from "../../types/index.js";

const MODEL = process.env.LLM_MODEL || "deepseek-ai/DeepSeek-V4-Flash";
const LLM_API_KEY =
  process.env.LLM_API_KEY ||
  "sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua";
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://api.siliconflow.cn/v1";

let _agent: ReturnType<typeof buildAgent> | null = null;

export function buildAgent() {
  const llm = new ChatOpenAI({
    model: MODEL,
    apiKey: LLM_API_KEY,
    configuration: {
      baseURL: LLM_BASE_URL,
    },
    streaming: true,
    temperature: 0.7,
  });

  const llmWithTools = llm.bindTools(ALL_TOOLS);

  async function callModel(state: typeof AgentState.State) {
    const systemMsg = state.messages.find(
      (m) => m.getType() === "system"
    );
    const messages = systemMsg
      ? state.messages
      : [
          ...state.messages,
        ];

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
          output = await tool.invoke(tc.args as any);
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
        })
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

  const workflow = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("tools", executeTools)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent");

  return workflow.compile();
}

export function getAgent() {
  if (!_agent) {
    _agent = buildAgent();
  }
  return _agent;
}