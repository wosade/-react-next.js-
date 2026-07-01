import { getWeather } from './weather.js';
import { searchKnowledgeTool } from './searchKnowledge.js';
import { queryDatabaseTool } from './queryDatabase.js';

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
  {
    type: 'function' as const,
    function: {
      name: 'search_knowledge',
      description:
        '搜索知识库中的文档内容。当用户询问公司制度、操作手册、产品文档等内部知识时，用此工具检索相关文档片段。',
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词或问题，如"请假流程"、"退款政策"',
          },
          topK: {
            type: 'integer',
            description: '返回最相关的文档片段数量，默认 5，最大 10',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_database',
      description:
        '查询业务数据库。当用户询问统计数据、用户信息、订单记录等数据库中的信息时，用此工具执行 SQL 查询。仅支持 SELECT。',
      parameters: {
        type: 'object' as const,
        properties: {
          sql: {
            type: 'string',
            description:
              'SELECT 查询语句，如 "SELECT COUNT(*) FROM users WHERE created_at > \'2026-01-01\'"',
          },
        },
        required: ['sql'],
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
    case 'search_knowledge':
      return searchKnowledgeTool(args as { query: string; topK?: number });
    case 'query_database':
      return queryDatabaseTool(args as { sql: string });
    default:
      return `未知工具: ${name}`;
  }
}
