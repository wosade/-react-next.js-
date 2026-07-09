import { z } from 'zod';
import { searchKnowledge } from '../rag/ragService.js';
import { cacheGet } from '../../lib/cache.js';

const TTL = 600; // 知识库搜索缓存 10 分钟

/** search_knowledge 工具参数 Schema */
export const searchKnowledgeSchema = z.object({
  query: z.string().describe('搜索关键词或问题，如"请假流程"、"退款政策"'),
  topK: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('返回最相关的文档片段数量，默认 5，最大 10'),
});

/** OpenAI function definition（与 Schema 保持一致） */
export const searchKnowledgeDefinition = {
  type: 'function' as const,
  function: {
    name: 'search_knowledge',
    description:
      '搜索知识库中的文档内容。当用户询问公司制度、操作手册、产品文档等内部知识时，用此工具检索相关文档片段。',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: '搜索关键词或问题，如"请假流程"、"退款政策"',
        },
        topK: {
          type: 'integer' as const,
          description: '返回最相关的文档片段数量，默认 5，最大 10',
        },
      },
      required: ['query'],
    },
  },
};

// ---- 执行函数 ----

export async function searchKnowledgeTool(
  args: z.infer<typeof searchKnowledgeSchema>,
): Promise<string> {
  return cacheGet(
    `knowledge:${args.query}:${args.topK}`,
    () => searchKnowledge(args.query, args.topK),
    TTL,
  );
}