import OpenAI from 'openai';

const client = new OpenAI({
  apiKey:
    process.env.LLM_API_KEY ||
    "sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua",
  baseURL: process.env.LLM_BASE_URL || "https://api.siliconflow.cn/v1",
});

const MODEL = process.env.LLM_MODEL || "deepseek-ai/DeepSeek-V4-Flash";

/**
 * 一次性问答：发送消息列表，返回模型的完整回复文本。
 * 不做流式、不调用工具。
 */
export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  });
  console.log(response.choices[0].message)
  return response.choices[0]?.message?.content || '';
}
chat([{role:'user',content:'123'}])