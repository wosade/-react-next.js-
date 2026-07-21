import { DynamicStructuredTool } from "@langchain/core/tools";
import { getWeather, weatherSchema } from "../tools/weather.js";
import { searchKnowledgeTool, searchKnowledgeSchema } from "../tools/searchKnowledge.js";
import { queryDatabaseTool, queryDatabaseSchema } from "../tools/queryDatabase.js";
import { webSearch, webSearchSchema } from "../tools/webSearch.js";
import { sendEmail, sendEmailSchema } from "../tools/sendEmail.js";
import { mcpManager } from "../mcp/index.js";

export const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "查询指定城市的实时天气信息",
  schema: weatherSchema,
  func: async (args) => getWeather(args),
});

export const searchKnowledge = new DynamicStructuredTool({
  name: "search_knowledge",
  description:
    "搜索知识库中的文档内容。当用户询问公司制度、操作手册、产品文档等内部知识时，用此工具检索相关文档片段。",
  schema: searchKnowledgeSchema,
  func: async (args) => searchKnowledgeTool(args),
});

export const queryDatabase = new DynamicStructuredTool({
  name: "query_database",
  description:
    "查询业务数据库。当用户询问统计数据、用户信息、订单记录等数据库中的信息时，用此工具执行 SQL 查询。仅支持 SELECT。",
  schema: queryDatabaseSchema,
  func: async (args) => queryDatabaseTool(args),
});

export const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description:
    "搜索互联网获取最新信息。当需要查询实时资讯、百科知识、行业动态等外部信息时使用。搜索结果包含标题、摘要和链接。",
  schema: webSearchSchema,
  func: async (args) => webSearch(args),
});

export const sendEmailTool = new DynamicStructuredTool({
  name: "send_email",
  description:
    "发送一封邮件到指定邮箱地址。发件人信息使用用户在设置中预配置的 SMTP 配置。",
  schema: sendEmailSchema,
  func: async (args, config) => {
    const userId = (config as any)?.configurable?.userId;
    if (!userId) {
      throw new Error("send_email 需要已登录用户");
    }
    return sendEmail(args, userId);
  },
});

/** 内置工具 */
export const BUILTIN_TOOLS = [
  weatherTool,
  searchKnowledge,
  queryDatabase,
  webSearchTool,
  sendEmailTool,
];

/**
 * 获取当前所有可用工具（内置 + MCP）
 * 每次调用时动态合并，确保 MCP 工具的增减能实时生效
 */
export function getAllTools() {
  const mcpTools = mcpManager.getAllTools();
  return [...BUILTIN_TOOLS, ...mcpTools];
}

/**
 * 按名称查找工具（动态版本）
 */
export function getToolByName(name: string) {
  return getAllTools().find((t) => t.name === name) || null;
}

/** @deprecated 使用 getAllTools() 代替 */
export const ALL_TOOLS = BUILTIN_TOOLS;

export const toolByName = new Map(
  BUILTIN_TOOLS.map((t) => [t.name, t])
);