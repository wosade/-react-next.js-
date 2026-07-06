export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: ToolCallStatus;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export type MessageRole = 'user' | 'agent' | 'tool';

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  thinking?: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  createdAt: string;
}