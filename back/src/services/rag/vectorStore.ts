/**
 * Qdrant 向量数据库客户端
 *
 * 职责：管理 collection、插入向量点、相似度搜索、按文档 ID 删除
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { log } from '../../lib/logger.js';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'agent_knowledge';

let client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (!client) {
    client = new QdrantClient({ url: QDRANT_URL, });
  }
  return client;
}

/** 单个向量块的存储结构 */
export interface ChunkRecord {
  id: string; // point id，UUID 格式
  text: string; // 原文片段
  embedding: number[]; // 向量
  documentId: string; // 所属文档 ID
  documentName: string; // 文档名
  chunkIndex: number; // 在文档中的块序号
}

/**
 * 确保 collection 存在（幂等）
 * 如果已存在但维度不匹配，会删除重建
 * @param vectorSize 向量维度，由 embedding 模型决定
 */
export async function ensureCollection(vectorSize: number): Promise<void> {
  try {
    const { collections } = await getClient().getCollections();
    const existing = collections.find((c) => c.name === COLLECTION_NAME);

    if (existing) {
      const config = await getClient().getCollection(COLLECTION_NAME);
      const existingSize = config.config?.params?.vectors?.size;
      if (existingSize && existingSize !== vectorSize) {
        log.warn(
          `[Qdrant] collection "${COLLECTION_NAME}" 维度不匹配 (现有 ${existingSize} ≠ 期望 ${vectorSize})，删除重建...`,
        );
        await getClient().deleteCollection(COLLECTION_NAME);
        await getClient().createCollection(COLLECTION_NAME, {
          vectors: { size: vectorSize, distance: 'Cosine' },
        });
        log.info(
          `[Qdrant] 重建 collection: ${COLLECTION_NAME} (${vectorSize}维, Cosine)`,
        );
        return;
      }
      log.info(
        `[Qdrant] collection "${COLLECTION_NAME}" 已存在 (${existingSize}维)`,
      );
      return;
    }

    await getClient().createCollection(COLLECTION_NAME, {
      vectors: { size: vectorSize, distance: 'Cosine' },
    });
    log.info(
      `[Qdrant] 创建 collection: ${COLLECTION_NAME} (${vectorSize}维, Cosine)`,
    );
  } catch (err: any) {
    throw new Error(
      `Qdrant 连接失败 (${QDRANT_URL})，请确认 Qdrant 已启动: ${err.message}`,
    );
  }
}

/**
 * 批量插入向量点到 Qdrant
 */
export async function insertChunks(chunks: ChunkRecord[]): Promise<void> {
  try {
    await getClient().upsert(COLLECTION_NAME, {
      wait: true,
      points: chunks.map((chunk) => ({
        id: chunk.id,
        vector: chunk.embedding,
        payload: {
          text: chunk.text,
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          chunkIndex: chunk.chunkIndex,
        },
      })),
    });
  } catch (err: any) {
    const detail = err.data?.status?.error || err.message;
    throw new Error(
      `Qdrant 写入失败 (${COLLECTION_NAME}): ${detail}\n` +
        `向量维度: ${chunks[0]?.embedding?.length || '?'}, 点数: ${chunks.length}`,
    );
  }
}

/**
 * 向量相似度搜索
 * @returns 匹配的文本片段 + 来源文档名 + 相似度分数
 */
export async function searchSimilar(
  queryVector: number[],
  topK: number = 5,
): Promise<Array<{ text: string; documentName: string; score: number }>> {
  const results = await getClient().search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });

  return results.map((r) => {
    const payload = r.payload as Record<string, any> | null;
    return {
      text: payload?.text || '',
      documentName: payload?.documentName || '',
      score: r.score,
    };
  });
}

/**
 * 按文档 ID 删除该文档的所有向量点
 */
export async function deleteByDocumentId(documentId: string): Promise<void> {
  await getClient().delete(COLLECTION_NAME, {
    filter: {
      must: [{ key: 'documentId', match: { value: documentId } }],
    },
  });
}