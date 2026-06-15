export interface AgentMessage {
  role: 'user' | 'agent' | 'tool';
  content: string;
  toolCall?: ToolCall;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}
