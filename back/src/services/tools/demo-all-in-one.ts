/**
 * ═══════════════════════════════════════════════════════════
 *  AI 工具调用 — 完整演示（LangChain + LangGraph 版）
 * ═══════════════════════════════════════════════════════════
 *
 *  运行方式：npx tsx src/services/tools/demo-all-in-one.ts
 *
 *  流程：
 *    用户输入 → LangGraph Agent → 判断要不要调工具 → 调工具 → 结果喂回 LLM → 最终回答
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import type { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const MODEL = process.env.LLM_MODEL || "deepseek-ai/DeepSeek-V4-Flash";
const LLM_API_KEY =
  process.env.LLM_API_KEY ||
  "sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua";
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://api.siliconflow.cn/v1";

const llm = new ChatOpenAI({
  model: MODEL,
  apiKey: LLM_API_KEY,
  configuration: { baseURL: LLM_BASE_URL },
  streaming: true,
  temperature: 0.7,
});

// ══════════════════════════════════════════════════════════════
//  1. 工具定义（LangChain DynamicStructuredTool）
// ══════════════════════════════════════════════════════════════

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "北京": { lat: 39.9042, lon: 116.4074 },
  "上海": { lat: 31.2304, lon: 121.4737 },
  "深圳": { lat: 22.5431, lon: 114.0579 },
  "杭州": { lat: 30.2741, lon: 120.1551 },
  "广州": { lat: 23.1291, lon: 113.2644 },
  "成都": { lat: 30.5728, lon: 104.0668 },
  "武汉": { lat: 30.5928, lon: 114.3055 },
};

const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "查询指定城市的实时天气信息",
  schema: z.object({ city: z.string().describe("城市名称") }),
  func: async ({ city }) => {
    const coords = CITY_COORDS[city];
    if (!coords) return `未找到城市"${city}"`;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
    const res = await fetch(url);
    const data = (await res.json()) as any;
    const cw = data.current_weather;
    if (!cw) return `${city}天气数据暂不可用`;
    return `${city}天气：温度 ${cw.temperature}°C，风速 ${cw.windspeed}km/h`;
  },
});

const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算。支持加减乘除、括号、sqrt、pow、sin、cos 等。",
  schema: z.object({
    expression: z.string().describe('数学表达式，如 "2 + 3 * 4"'),
  }),
  func: async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch {
      return `表达式 "${expression}" 计算失败，请检查格式`;
    }
  },
});

const ipLookupTool = new DynamicStructuredTool({
  name: "ip_lookup",
  description: "查询 IP 地址的归属地信息（国家、城市、ISP 等）",
  schema: z.object({ ip: z.string().describe("IP 地址") }),
  func: async ({ ip }) => {
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
      const data = (await res.json()) as any;
      if (data.status === "fail") return `查询失败: ${data.message}`;
      return `IP ${ip} → ${data.country} ${data.regionName} ${data.city}，ISP: ${data.isp}`;
    } catch (err: any) {
      return `IP 查询失败: ${err.message}`;
    }
  },
});

const ALL_TOOLS = [weatherTool, calculatorTool, ipLookupTool];
const toolByName = new Map(ALL_TOOLS.map((t) => [t.name, t]));

// ══════════════════════════════════════════════════════════════
//  2. LangGraph Agent 构建
// ══════════════════════════════════════════════════════════════

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

const llmWithTools = llm.bindTools(ALL_TOOLS);

async function callModel(state: typeof AgentState.State) {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

async function executeTools(state: typeof AgentState.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];
  const toolMessages: ToolMessage[] = [];

  for (const tc of toolCalls) {
    const tool = toolByName.get(tc.name);
    let output: string;
    try {
      output = tool ? await tool.invoke(tc.args) : `未知工具: "${tc.name}"`;
    } catch (err: any) {
      output = `工具执行失败: ${err.message}`;
    }
    toolMessages.push(new ToolMessage({ content: output, tool_call_id: tc.id! }));
  }

  return { messages: toolMessages };
}

function shouldContinue(state: typeof AgentState.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) return "tools";
  return END;
}

const agent = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addNode("tools", executeTools)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, { tools: "tools", [END]: END })
  .addEdge("tools", "agent")
  .compile();

// ══════════════════════════════════════════════════════════════
//  3. 运行
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  AI 工具调用 完整演示 (LangGraph)");
  console.log("═══════════════════════════════════════\n");

  const userMessage = process.argv[2] || "北京今天天气怎么样？顺便算一下 123 * 456";

  console.log(`👤 用户: ${userMessage}\n`);
  console.log("🤖 AI 回复:");

  const stream = agent.streamEvents(
    {
      messages: [
        {
          role: "system",
          content: "你是智能助手。遇到需要计算、查天气、查IP时，请调用对应工具获取数据，然后用你自己的话回答用户。",
        } as any,
        { role: "user", content: userMessage } as any,
      ],
    },
    { version: "v2", recursionLimit: 10 },
  );

  for await (const event of stream) {
    const ev = event as any;
    if (ev.event === "on_chat_model_stream") {
      const content = ev.data?.chunk?.content;
      if (content) process.stdout.write(content);
    }
    if (ev.event === "on_tool_start") {
      console.log(`\n🔧 调用工具: ${ev.name}`);
    }
    if (ev.event === "on_tool_end") {
      const output = ev.data?.output;
      const outputStr = typeof output === "string" ? output : output?.content || JSON.stringify(output);
      console.log(`📤 结果: ${String(outputStr).slice(0, 200)}`);
    }
  }

  console.log("\n\n✅ 完成");
}

main().catch(console.error);