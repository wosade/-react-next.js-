import { z } from 'zod';

/** get_weather 工具参数 Schema */
export const weatherSchema = z.object({
  city: z.string().describe('城市名称，如 北京、上海、深圳'),
});

/** OpenAI function definition（与 Schema 保持一致） */
export const weatherDefinition = {
  type: 'function' as const,
  function: {
    name: 'get_weather',
    description: '查询指定城市的实时天气信息',
    parameters: {
      type: 'object' as const,
      properties: {
        city: { type: 'string' as const, description: '城市名称，如 北京、上海、深圳' },
      },
      required: ['city'],
    },
  },
};

// ---- 执行函数 ----

const mockData: Record<string, string> = {
  '北京': '晴，25°C，湿度 45%，风力 2级',
  '上海': '多云，28°C，湿度 60%，风力 3级',
  '深圳': '阵雨，30°C，湿度 75%，风力 4级',
  '杭州': '阴，22°C，湿度 55%，风力 2级',
  '广州': '雷阵雨，32°C，湿度 80%，风力 3级',
  '成都': '小雨，20°C，湿度 70%，风力 1级',
};

export async function getWeather(
  args: z.infer<typeof weatherSchema>,
): Promise<string> {
  const { city } = args;
  const result = mockData[city];
  if (result) return `${city}今日天气：${result}`;
  return `抱歉当前无法查询该城市的天气，请稍后重试`;
}
