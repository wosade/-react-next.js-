/**
 * Agent 工具注册中心
 * 所有工具都在这里注册，Agent 通过这个索引查找可用的工具
 */

import type { ToolDefinition } from '@/types/agent';

// 工具集合
const tools: ToolDefinition[] = [];

/**
 * 注册一个新工具
 */
export function registerTool(tool: ToolDefinition): void {
  tools.push(tool);
}

/**
 * 获取所有已注册的工具
 */
export function getAllTools(): ToolDefinition[] {
  return tools;
}

/**
 * 根据名称查找工具
 */
export function findTool(name: string): ToolDefinition | undefined {
  return tools.find((t) => t.name === name);
}

export { tools };
