import { OpenAIEmbeddings } from "@langchain/openai";

let _embeddings: OpenAIEmbeddings | null = null;

function getEmbeddings(): OpenAIEmbeddings {
  if (!_embeddings) {
    _embeddings = new OpenAIEmbeddings({
      model: process.env.EMBEDDING_MODEL || "BAAI/bge-large-zh-v1.5",
      apiKey: process.env.LLM_API_KEY!,
      configuration: {
        baseURL: process.env.LLM_BASE_URL!,
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
