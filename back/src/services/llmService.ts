import { ChatOpenAI } from "@langchain/openai";

const MODEL = process.env.LLM_MODEL || "deepseek-ai/DeepSeek-V4-Flash";
const LLM_API_KEY =
  process.env.LLM_API_KEY ||
  "sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua";
const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "https://api.siliconflow.cn/v1";

let _client: ChatOpenAI | null = null;

export function getChatModel(): ChatOpenAI {
  if (!_client) {
    _client = new ChatOpenAI({
      model: MODEL,
      apiKey: LLM_API_KEY,
      configuration: {
        baseURL: LLM_BASE_URL,
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