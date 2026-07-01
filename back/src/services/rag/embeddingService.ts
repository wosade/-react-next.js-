/**
 * Embedding 服务 — 调 SiliconFlow（OpenAI 兼容）向量化 API
 */
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey:
    process.env.LLM_API_KEY ||
    'sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua',
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
});

/** 中文 embedding 模型（1024 维） */
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || 'BAAI/bge-large-zh-v1.5';

/**
 * 批量文本 → 向量数组
 * 传多段文本一次请求完成，减少 API 调用次数
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

/**
 * 单条查询文本 → 向量
 */
export async function embedQuery(text: string): Promise<number[]> {
  const embeddings = await embedTexts([text]);
  return embeddings[0];
}
