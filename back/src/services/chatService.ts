import { chatWithTools } from './llmService.js';
import { executeTool, TOOL_DEFINITIONS } from './tools/index.js';

export type AgentEvent =
  | { type: 'status'; tool: string }
  | { type: 'content'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

// Agent 循环：LLM 调用工具 → 拿结果 → 再调 LLM → 直到输出最终文本
export async function* runAgent(
  userMessage: string,
  history: any[] = [],
): AsyncGenerator<AgentEvent> {
  const messages: any[] = [
    {
      role: 'system',
      content:
        '你是智能助手，可以使用工具帮用户查询信息。查到结果后用自己的话回复用户，不要编造数据。',
    },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const MAX_ROUNDS = 5;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = await chatWithTools(messages, TOOL_DEFINITIONS);

    // 流式解析：同时处理 文本 和 工具调用
    const toolCallMap = new Map<
      number,
      { id: string; name: string; args: string }
    >();
    let hasToolCalls = false;
    let hasContent = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // 流式文本输出
      if (delta?.content) {
        hasContent = true;
        yield { type: 'content', content: delta.content };
      }

      // 流式 tool_calls 累积
      if (delta?.tool_calls) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallMap.has(idx)) {
            toolCallMap.set(idx, { id: tc.id || '', name: '', args: '' });
          }
          const entry = toolCallMap.get(idx)!;
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name += tc.function.name;
          if (tc.function?.arguments) entry.args += tc.function.arguments;
        }
      }
    }

    // 有工具调用 → 执行 → 结果写回消息 → 继续循环
    if (hasToolCalls && toolCallMap.size > 0) {
      const calls = Array.from(toolCallMap.values());

      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.args },
        })),
      });

      for (const tc of calls) {
        yield { type: 'status', tool: tc.name };

        let args: Record<string, any> = {};
        try {
          args = JSON.parse(tc.args);
        } catch {}

        const result = await executeTool(tc.name, args);

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      continue; // 回到循环头，把工具结果交给 LLM
    }

    if (!hasContent) {
      yield { type: 'content', content: '抱歉，我暂时无法回答。' };
    }
    break;
  }

  yield { type: 'done' };
}
