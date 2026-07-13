import { OpenAIEmbeddings } from "@langchain/openai";

const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "BAAI/bge-large-zh-v1.5";

const LLM_API_KEY =
  process.env.LLM_API_KEY ||
  "sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua";
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://api.siliconflow.cn/v1";

let _embeddings: OpenAIEmbeddings | null = null;

function getEmbeddings(): OpenAIEmbeddings {
  if (!_embeddings) {
    _embeddings = new OpenAIEmbeddings({
      model: EMBEDDING_MODEL,
      apiKey: LLM_API_KEY,
      configuration: {
        baseURL: LLM_BASE_URL,
      },
    });
  }
  return _embeddings;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings = getEmbeddings();
  const result = await embeddings.embedDocuments(texts);
  return result;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embeddings = getEmbeddings();
  const result = await embeddings.embedQuery(text);
  return result;
}