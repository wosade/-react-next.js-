import { OpenAIEmbeddings } from "@langchain/openai";
import { config } from "../../lib/envConfig.js";

let _embeddings: OpenAIEmbeddings | null = null;

function getEmbeddings(): OpenAIEmbeddings {
  if (!_embeddings) {
    _embeddings = new OpenAIEmbeddings({
      model: config.embeddingModel,
      apiKey: config.llmApiKey,
      configuration: {
        baseURL: config.llmBaseUrl,
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
