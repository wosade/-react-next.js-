import { chatWithTools } from './llmService.js';
import { executeTool, TOOL_DEFINITIONS } from './tools/index.js';
import type { StepRecord } from '../types/index.js';

export type AgentEvent =
  | { type: 'status'; tool: string }
  | { type: 'content'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string }|{type:'tool_step';step:StepRecord};

// Agent 循环：LLM 调用工具 → 拿结果 → 再调 LLM → 直到输出最终文本
export async function* runAgent(
  userMessage: string,
  history: any[] = [],
): AsyncGenerator<AgentEvent> {
  const messages: any[] = [
    {
      role: 'system',
      content:
        '你是智能助手，可以使用工具帮用户查询信息。\n\n' +
        '可用工具：\n' +
        '1. get_weather — 查天气\n' +
        '2. search_knowledge — 搜索知识库中的文档（公司制度、手册、产品文档等内部知识优先用此工具检索）\n' +
        '3. query_database — 查询业务数据库（统计、用户、订单等）\n\n' +
        '原则：\n' +
        '- 内部知识类问题必须先用 search_knowledge 检索，再用文档内容回答\n' +
        '- 统计数据类问题用 query_database 查询\n' +
        '- 查到的数据如实汇报，不要编造\n' +
        '- 用自己的话组织语言，不要直接复制粘贴文档原文',
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
          if (tc.function?.arguments) 
            entry.args += tc.function.arguments;
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

        let toolOutput:string=''
        let status:'success'|'error'
        try{
          toolOutput=await executeTool(tc.name,args)
          status='success'
        } catch(err:any){
          toolOutput=err.message||String(err);
          status='error'
        }
        // 展示给前端的输出做截断，避免把知识库检索的完整文档片段全部展示
        const maxDisplayLen = 300;
        const displayOutput =
          toolOutput.length > maxDisplayLen
            ? toolOutput.slice(0, maxDisplayLen) +
              `\n\n... (共 ${toolOutput.length} 字符，已截断展示)`
            : toolOutput;

        yield{
          type:'tool_step',
          step:{
            toolName:tc.name,
            toolInput:args,
            toolOutput: displayOutput,
            status
          }
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: toolOutput,
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
