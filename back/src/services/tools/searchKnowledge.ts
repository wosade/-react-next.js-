/**
 * search_knowledge 工具 — Agent 用它检索知识库文档
 */

import { searchKnowledge } from '../rag/ragService.js';

/**
 * 工具执行函数
 * @param query 用户想问的问题
 * @param topK 返回几条最相关的文档片段，默认 5
 */
export async function searchKnowledgeTool(args: {
  query: string;
  topK?: number;
}): Promise<string> {
  return searchKnowledge(args.query, args.topK ?? 5);
}
