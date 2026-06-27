import { getWeather } from './weather.js';

// 告诉大模型有哪些工具、什么参数
export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: '查询指定城市的实时天气信息',
      parameters: {
        type: 'object' as const,
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如 北京、上海、深圳',
          },
        },
        required: ['city'],
      },
    },
  },
];

// 根据工具名分发执行
export async function executeTool(
  name: string,
  args: Record<string, any>,
): Promise<string> {
  switch (name) {
    case 'get_weather':
      return getWeather(args.city);
    default:
      return `未知工具: ${name}`;
  }
}
