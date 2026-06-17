/** 工具调用状态 */
export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

/** 一次工具调用的完整信息 */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: ToolCallStatus;
}

/** 工具定义（注册到 Agent 的工具） */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/** 消息角色 */
export type MessageRole = 'user' | 'agent' | 'tool';

/** 一条对话消息 */
export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Agent 消息可能携带的工具调用记录 */
  toolCalls?: ToolCall[];
  timestamp: number;
}

/** 一条历史会话 */
export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: number;
}
