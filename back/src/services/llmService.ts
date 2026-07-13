import { ChatOpenAI } from "@langchain/openai";
import { config } from "../lib/envConfig.js";

let _client: ChatOpenAI | null = null;

export function getChatModel(): ChatOpenAI {
  if (!_client) {
    _client = new ChatOpenAI({
      model: config.llmModel,
      apiKey: config.llmApiKey,
      configuration: {
        baseURL: config.llmBaseUrl,
      },
      streaming: true,
      temperature: 0.7,
    });
  }
  return _client;
}

export function resetChatModel(): void {
  _client = null;
}
