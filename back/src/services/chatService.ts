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
  userId?: string,
): AsyncGenerator<AgentEvent> {
  const messages: any[] = [
    {
      role: 'system',
      content:
        '你是智能助手，可以使用工具帮用户查询信息。\n\n' +
        '可用工具：\n' +
        '1. get_weather — 查询城市天气\n' +
        '2. search_knowledge — 搜索知识库中的内部文档（公司制度、操作手册等）\n' +
        '3. query_database — 查询业务数据库（统计分析）\n' +
        '4. web_search — 搜索互联网获取最新信息（新闻、百科、行业动态等外部知识）\n\n' +
        '工具选择原则：\n' +
        '- 内部文档/制度类 → 用 search_knowledge\n' +
        '- 实时资讯/百科/外部知识 → 用 web_search\n' +
        '- 统计数据/报表 → 用 query_database\n' +
        '- 查天气 → 用 get_weather\n' +
        '- 不确定时优先用 web_search，再根据结果判断是否需要其他工具\n' +
        '- 查到数据后如实汇报，用自己的话组织语言，不要复制粘贴',
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
          toolOutput=await executeTool(tc.name,args,userId)
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