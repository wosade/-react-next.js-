/**
 * MCP 工具适配器 — 将 MCP Tool 定义转为 LangChain DynamicStructuredTool
 */
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

/**
 * 将 JSON Schema 转为 Zod schema（简化版，覆盖常见字段）
 */
function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || !schema.properties) {
    return z.object({}).passthrough();
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  const required: string[] = schema.required || [];

  for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
    let zodField: z.ZodTypeAny;

    switch (prop.type) {
      case "string":
        zodField = z.string();
        if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0) {
          zodField = z.enum(prop.enum as [string, ...string[]]);
        }
        break;
      case "number":
      case "integer":
        zodField = z.number();
        break;
      case "boolean":
        zodField = z.boolean();
        break;
      case "array":
        zodField = z.array(
          prop.items ? jsonSchemaToZod(prop.items) : z.any(),
        );
        break;
      case "object":
        zodField = jsonSchemaToZod(prop);
        break;
      default:
        zodField = z.any();
    }

    // 描述
    if (prop.description) {
      zodField = zodField.describe(prop.description);
    }

    // 可选
    if (!required.includes(key)) {
      zodField = zodField.optional();
    }

    shape[key] = zodField;
  }

  return z.object(shape);
}

/**
 * 创建 LangChain StructuredTool，代理调用到 MCP client
 */
export function createMCPTool(
  toolDef: {
    name: string;
    description?: string;
    inputSchema?: any;
  },
  mcpClient: Client,
  serverId: string,
): DynamicStructuredTool {
  const zodSchema = jsonSchemaToZod(toolDef.inputSchema);

  return new DynamicStructuredTool({
    name: `mcp_${serverId.slice(0, 8)}_${toolDef.name}`,
    description:
      `[MCP] ${toolDef.description || toolDef.name}` +
      ` (来自外部 MCP 服务)`,
    schema: zodSchema,
    func: async (args: any) => {
      const result = await mcpClient.callTool({
        name: toolDef.name,
        arguments: args,
      });

      // MCP 返回的是 content 数组，提取文本
      if (result.content && Array.isArray(result.content)) {
        return result.content
          .map((c: any) => {
            if (c.type === "text") return c.text;
            if (c.type === "resource") return `[资源: ${c.resource?.uri}]`;
            return JSON.stringify(c);
          })
          .join("\n");
      }

      return JSON.stringify(result);
    },
  });
}
