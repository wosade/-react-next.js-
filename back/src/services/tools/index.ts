import { z } from 'zod';

// 导入各工具的 Schema + Definition + Handler
import { weatherSchema, weatherDefinition, getWeather } from './weather.js';
import {
  searchKnowledgeSchema,
  searchKnowledgeDefinition,
  searchKnowledgeTool,
} from './searchKnowledge.js';
import {
  queryDatabaseSchema,
  queryDatabaseDefinition,
  queryDatabaseTool,
} from './queryDatabase.js';

// ── 工具注册表类型 ────────────────────────────────────────

type ToolHandler = (args: any) => Promise<string>;

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

interface ToolEntry {
  schema: z.ZodTypeAny;
  definition: ToolDefinition;
  handler: ToolHandler;
}

// ── 注册所有工具 ──────────────────────────────────────────
// 新增工具只需在这里加一行即可

const toolRegistry = new Map<string, ToolEntry>([
  [
    'get_weather',
    { schema: weatherSchema, definition: weatherDefinition, handler: (args) => getWeather(args) },
  ],
  [
    'search_knowledge',
    { schema: searchKnowledgeSchema, definition: searchKnowledgeDefinition, handler: (args) => searchKnowledgeTool(args) },
  ],
  [
    'query_database',
    { schema: queryDatabaseSchema, definition: queryDatabaseDefinition, handler: (args) => queryDatabaseTool(args) },
  ],
]);

// ── 自动生成 OpenAI Tool Definitions ──────────────────────

export const TOOL_DEFINITIONS = Array.from(toolRegistry.values()).map(
  (entry) => entry.definition,
);

// ── 带 Zod 校验的工具执行入口 ──────────────────────────────

/**
 * 执行工具调用
 *
 * 1. 用 Zod Schema 校验 LLM 传过来的参数
 * 2. 校验失败 → 返回结构化的错误信息（帮助 LLM 自我纠正）
 * 3. 校验通过 → 调用 handler 执行
 */
export async function executeTool(
  name: string,
  rawArgs: Record<string, any>,
): Promise<string> {
  const entry = toolRegistry.get(name);
  if (!entry) {
    return `❌ 未知工具: "${name}"。可用工具: ${[...toolRegistry.keys()].join(', ')}`;
  }

  // ─── Zod 校验 ───
  const result = entry.schema.safeParse(rawArgs);
  if (!result.success) {
    // 格式化错误信息，方便 LLM 理解并重试
    const issues = (result.error.issues as Array<{ path: (string | number)[]; message: string }>)
      .map((i) => `  - \`${i.path.join('.') || '(root)'}\`: ${i.message}`)
      .join('\n');
    return (
      `❌ 调用 "${name}" 参数校验失败:\n${issues}\n\n` +
      `请根据 Schema 修正参数后重新调用。`
    );
  }

  // ─── 执行 ───
  return entry.handler(result.data);
}

// ── 辅助函数：按名称获取工具 Schema（调试/文档用） ─────────

export function getToolSchema(name: string): z.ZodTypeAny | undefined {
  return toolRegistry.get(name)?.schema;
}
