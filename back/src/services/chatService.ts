import { getAgent } from "./langgraph/agent.js";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { manageContext, getTruncationNote } from "../lib/contextManager.js";
import { getSkill } from "./skills/index.js";
import type { StepRecord } from "../types/index.js";

export type AgentEvent =
  | { type: "status"; tool: string }
  | { type: "content"; content: string }
  | { type: "thinking"; content: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "tool_step"; step: StepRecord };

const SYSTEM_PROMPT =
  "你是智能助手，可以使用工具帮用户查询信息。\n\n" +
  "可用工具：\n" +
  "1. get_weather — 查询城市天气\n" +
  "2. search_knowledge — 搜索知识库中的内部文档（公司制度、操作手册等）\n" +
  "3. query_database — 查询业务数据库（统计分析）\n" +
  "4. web_search — 搜索互联网获取最新信息（新闻、百科、行业动态等外部知识）\n" +
  "5. send_email — 发送邮件\n\n" +
  "工具选择原则：\n" +
  "- 内部文档/制度类 → 用 search_knowledge\n" +
  "- 实时资讯/百科/外部知识 → 用 web_search\n" +
  "- 统计数据/报表 → 用 query_database\n" +
  "- 查天气 → 用 get_weather\n" +
  "- 发邮件 → 用 send_email\n" +
  "- 不确定时优先用 web_search，再根据结果判断是否需要其他工具\n" +
  "- 查到数据后如实汇报，用自己的话组织语言，不要复制粘贴";

/**
 * 运行 Agent，通过 AsyncGenerator 流式返回事件
 *
 * @param userMessage    用户最新消息
 * @param history        历史消息数组（role + content），首次对话为空
 * @param conversationId 会话 ID，用作 LangGraph thread_id 实现 checkpoint 持久化
 * @param skillName      可选：激活的技能名称
 * @param userId         当前用户 ID，用于工具隔离和 Agent 实例隔离
 */
export async function* runAgent(
  userMessage: string,
  history: any[] = [],
  conversationId?: string,
  skillName?: string,
  userId?: string,
): AsyncGenerator<AgentEvent> {
  const agent = getAgent(userId);

  // 根据技能选择系统提示词
  const skill = skillName ? getSkill(skillName) : undefined;
  const systemPrompt = skill
    ? `【当前角色】${skill.name} — ${skill.description}\n\n${skill.systemPrompt}`
    : SYSTEM_PROMPT;

  // 构建消息列表：System Prompt + 历史 + 新用户消息
  let messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...history.map((m) => {
      if (m.role === "assistant" || m.role === "agent") {
        return new AIMessage(m.content);
      }
      return new HumanMessage(m.content);
    }),
    new HumanMessage(userMessage),
  ];

  // ── 上下文窗口管理：过长历史自动截断 ──
  const ctx = manageContext(messages);
  messages = ctx.messages;
  if (ctx.truncated > 0) {
    // 在 system prompt 末尾追加截断提示
    const sysMsg = messages[0] as SystemMessage;
    messages[0] = new SystemMessage(
      sysMsg.content + "\n" + getTruncationNote(ctx.truncated),
    );
  }

  try {
    const stream = agent.streamEvents(
      { messages, toolSteps: [] },
      {
        version: "v2",
        // thread_id 让 LangGraph Checkpointer 在此会话内保持状态
        configurable: { thread_id: conversationId || "default", userId },
        recursionLimit: 10,
      },
    );

    let fullContent = "";
    let fullThinking = "";
    const emittedToolSteps = new Set<string>();

    for await (const event of stream) {
      const ev = event as any;

      if (ev.event === "on_chat_model_stream") {
        const chunk = ev.data?.chunk;
        // DeepSeek-R1 等推理模型的思考过程（reasoning_content）
        const reasoning =
          chunk?.reasoning_content ||
          chunk?.additional_kwargs?.reasoning_content;
        if (reasoning) {
          fullThinking += reasoning;
          yield { type: "thinking", content: reasoning };
        }
        // 最终回答
        const content = chunk?.content;
        if (content) {
          fullContent += content;
          yield { type: "content", content };
        }
      }

      if (ev.event === "on_tool_start") {
        yield { type: "status", tool: ev.name };
      }

      if (ev.event === "on_tool_end") {
        const toolName = ev.name;
        const toolOutput = ev.data?.output;
        const outputStr =
          typeof toolOutput === "string"
            ? toolOutput
            : toolOutput?.content
              ? String(toolOutput.content)
              : JSON.stringify(toolOutput || "");

        if (
          toolName &&
          !emittedToolSteps.has(toolName + outputStr.slice(0, 50))
        ) {
          emittedToolSteps.add(toolName + outputStr.slice(0, 50));

          const maxDisplayLen = 300;
          const displayOutput =
            outputStr.length > maxDisplayLen
              ? outputStr.slice(0, maxDisplayLen) +
                `\n\n... (共 ${outputStr.length} 字符，已截断展示)`
              : outputStr;

          yield {
            type: "tool_step",
            step: {
              toolName,
              toolInput: ev.data?.input || {},
              toolOutput: displayOutput,
              status: "success",
            },
          };
        }
      }

      if (ev.event === "on_tool_error") {
        yield {
          type: "tool_step",
          step: {
            toolName: ev.name || "unknown",
            toolInput: ev.data?.input || {},
            toolOutput: String(ev.data?.error || "工具执行失败"),
            status: "error",
          },
        };
      }
    }

    if (!fullContent) {
      yield { type: "content", content: "抱歉，我暂时无法回答。" };
    }
  } catch (err: any) {
    if (err.message?.includes("Recursion limit")) {
      yield {
        type: "content",
        content: "处理步骤较多，已提前结束。请尝试简化问题。",
      };
    } else {
      yield { type: "error", message: err.message || "Agent 执行出错" };
    }
  }

  yield { type: "done" };
}
