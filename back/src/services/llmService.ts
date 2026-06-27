import OpenAI from 'openai';

const client = new OpenAI({
  apiKey:
    process.env.LLM_API_KEY ||
    'sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua',
  baseURL: process.env.LLM_BASE_URL || 'https://api.siliconflow.cn/v1',
});

const MODEL = process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V4-Flash';

// 流式调 LLM，可选带上工具定义
export async function chatWithTools(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  return client.chat.completions.create({
    model: MODEL,
    messages,
    stream: true,
    ...(tools?.length ? { tools } : {}),
  });
}

// 兼容旧调用：一次性问答
export async function chat(
  messages: { role: string; content: string }[],
): Promise<AsyncIterable<any>> {
  return chatWithTools(
    messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  );
}
