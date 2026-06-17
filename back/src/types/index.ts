/** 消息角色 */
export type MessageRole = 'user' | 'agent' | 'tool';

/** 工具调用状态 */
export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

/** 工具调用记录 */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: ToolCallStatus;
}

/** 一条消息 */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  createdAt: string;
}

/** 会话 */
export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

/** 会话详情（含消息列表） */
export interface ConversationDetail extends Conversation {
  messages: Message[];
}
