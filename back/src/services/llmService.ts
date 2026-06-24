import OpenAI from 'openai';
import {ChatOpenAI} from '@langchain/openai'
import {json, z} from "zod"

// 原生的ai对话
const client = new OpenAI({
  apiKey:
    process.env.LLM_API_KEY ||
    "sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua",
  baseURL: process.env.LLM_BASE_URL || "https://api.siliconflow.cn/v1",
});

const MODEL = process.env.LLM_MODEL || "deepseek-ai/DeepSeek-V4-Flash";

// 让ai返回固定的格式 如：天气
const WeatherSchema = z.object({
  // 让zod 运行后也能检测类型
  pos: z.string().describe("位置"),
  date: z.string().describe("日期"),
});
type weather=z.infer<typeof WeatherSchema>
// // 结构化输出
// export async function getWeather(messages:any[],schema:z.ZodSchema<T>):Promise<weather> {
//   const response = await client.chat.completions.create({
//     model: MODEL,
//     messages,
//     // 开启联网搜索（如果平台支持）
//     extra_body: {
//       enable_search: true, // SiliconFlow 部分模型支持
//     } ,
//     // 关键：使用 response_format 强制返回 JSON
//     response_format: {
//       type: "json_object",
//     },
//   } as any);
//   console.log(response.choices[0].message.content)
//   return schema.parse(JSON.parse(response.choices[0].message.content!))
// }
// const weather=(pos:string,date:string)=>{
// getWeather(
//   [
//   {role:'system',content:`返回json信息格式必须有pos：位置 date：日期`},
//   {role:'user',content:`查${pos}${date}天气`}],WeatherSchema
// )
// }
// weather('北京','今天')
/**
 * 一次性问答：发送消息列表，返回模型的完整回复文本。
 * 不做流式、不调用工具。
 */
const model = new ChatOpenAI({
  modelName: "deepseek-ai/DeepSeek-V4-Flash",
  apiKey: "sk-hlktlwlhkbdwviqstrebieqggwgkutvabpyhhcqwydmniwua",
  configuration: {
    baseURL: "https://api.siliconflow.cn/v1",
  },
});
const stream=await model.stream("讲个笑话")
// for await(const chunk of stream){
//   // 不加 /n打印
//   process.stdout.write(chunk.content as string)
// }
// 结构化输出让输出为规定的json
const weatherSchema={
  pos:z.string().describe('位置'),
  weather:z.string().describe('温度')
}
const structerStream=model.withStructuredOutput(weatherSchema)
const res=await structerStream.invoke('北京天气怎么样')
console.log(res)
import { getCachedResponse, setCachedResponse } from './llmCache.js';

export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  // 1. 查 Redis 缓存，命中则直接返回
  const cached = await getCachedResponse(messages);
  if (cached) {
    return cached;
  }

  // 2. 未命中 → 调 LLM
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  });
  console.log(response.choices[0].message);
  const reply = response.choices[0]?.message?.content || '';

  // 3. 写入缓存（仅缓存有意义的回复）
  if (reply) {
    await setCachedResponse(messages, reply);
  }

  return reply;
}
// chat([{role:'user',content:'123'}])