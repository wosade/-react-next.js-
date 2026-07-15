import { ChatOpenAI } from "@langchain/openai";

let _client: ChatOpenAI | null = null;

export function getChatModel(): ChatOpenAI {
  if (!_client) {
    _client = new ChatOpenAI({
      model: process.env.LLM_MODEL!,
      apiKey: process.env.LLM_API_KEY!,
      configuration: {
        baseURL: process.env.LLM_BASE_URL!,
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
