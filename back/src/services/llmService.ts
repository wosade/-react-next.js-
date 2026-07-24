import { ChatOpenAI } from "@langchain/openai";

const LLM_MODEL = process.env.LLM_MODEL;
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL;

if (!LLM_API_KEY) {
  throw new Error(
    'LLM_API_KEY 未配置。请在 back/.env/.env.back 中设置 LLM_API_KEY',
  );
}
if (!LLM_BASE_URL) {
  throw new Error(
    'LLM_BASE_URL 未配置。请在 back/.env/.env.back 中设置 LLM_BASE_URL',
  );
}

let _client: ChatOpenAI | null = null;

export function getChatModel(): ChatOpenAI {
  if (!_client) {
    _client = new ChatOpenAI({
      model: LLM_MODEL!,
      apiKey: LLM_API_KEY,
      configuration: {
        baseURL: LLM_BASE_URL,
      },
      streaming: true,
      // 随机参数 越大越随机
      temperature: 0.7,
    });
  }
  return _client;
}

export function resetChatModel(): void {
  _client = null;
}
