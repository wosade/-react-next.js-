/**
 * RAG 编排服务 — 串联 解析→分块→向量化→存储 / 检索 两条链路
 */

import { v4 as uuidv4 } from 'uuid';
import { loadDocument, getDocType } from './documentLoader.js';
import { chunkText } from './chunker.js';
import { embedTexts, embedQuery } from './embeddingService.js';
import {
  ensureCollection,
  insertChunks,
  searchSimilar,
  deleteByDocumentId,
} from './vectorStore.js';

/**
 * 文档入库完整链路：
 *   解析文本 → 分块 → 批量向量化 → 存 Qdrant
 *
 * @returns 文档 ID 和分块数（调用方用来写 MySQL）
 */
export async function ingestDocument(
  filePath: string,
  fileName: string,
): Promise<{ documentId: string; chunkCount: number }> {
  const docType = getDocType(fileName);
  const documentId = uuidv4();

  // 1. 解析
  const text = await loadDocument(filePath, docType);
  if (!text || text.trim().length === 0) {
    throw new Error('文档内容为空，无法入库');
  }

  // 2. 分块
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error('文档分块后无内容');
  }

  // 3. 批量向量化（一次 API 请求）
  const embeddings = await embedTexts(chunks);

  // 4. 确保 Qdrant collection 存在（用第一批向量推断维度）
  await ensureCollection(embeddings[0].length);

  // 5. 插入 Qdrant（每个 point 用独立 UUID）
  await insertChunks(
    chunks.map((chunk, i) => ({
      id: uuidv4(),
      text: chunk,
      embedding: embeddings[i],
      documentId,
      documentName: fileName,
      chunkIndex: i,
    })),
  );

  return { documentId, chunkCount: chunks.length };
}

/**
 * 知识库检索 → 返回拼好的上下文字符串，可直接塞给 LLM
 */
export async function searchKnowledge(
  query: string,
  topK: number = 5,
): Promise<string> {
  const queryVector = await embedQuery(query);
  const results = await searchSimilar(queryVector, topK);

  if (results.length === 0) {
    return '未找到相关知识。';
  }

  // 拼接成方便 LLM 理解的格式
  return results
    .map((r, i) => `[来源${i + 1}: ${r.documentName}]\n${r.text}`)
    .join('\n\n---\n\n');
}

/**
 * 删除文档的向量数据（MySQL 记录由 route 层删除）
 */
export async function removeDocument(documentId: string): Promise<void> {
  await deleteByDocumentId(documentId);
}