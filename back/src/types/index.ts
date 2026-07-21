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
  thinking?: string;
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

/** 步骤记录 — Agent 循环中收集到临时数组，用于批量插入 steps 表 */
export interface StepRecord {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: string;
  status: 'success' | 'error';
}

/** 数据库 steps 表的完整行 */
export interface Step extends StepRecord {
  id: string;
  messageId: string;
  stepOrder: number;
  createdAt: string;
}

/** 查询历史时，agent 消息附带 steps */
export interface MessageWithSteps extends Message {
  steps?: Step[];
}
