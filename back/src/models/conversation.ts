import type { Conversation, ConversationDetail, Message } from '../types/index.js';

// ========== 内存存储（后续替换为数据库） ==========

const conversations: Map<string, Conversation> = new Map();
const messages: Map<string, Message[]> = new Map();

let idCounter = 0;

/** 生成唯一 ID */
function generateId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** 获取所有会话列表（按更新时间倒序） */
export async function findAllConversations(): Promise<Conversation[]> {
  const list = Array.from(conversations.values());
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return list;
}

/** 根据 ID 获取单个会话 */
export async function findConversationById(
  id: string,
): Promise<ConversationDetail | null> {
  const conv = conversations.get(id);
  if (!conv) return null;

  return {
    ...conv,
    messages: messages.get(id) ?? [],
  };
}

/** 创建新会话 */
export async function createConversation(
  title?: string,
): Promise<Conversation> {
  const now = new Date().toISOString();
  const conv: Conversation = {
    id: generateId(),
    title: title ?? '新对话',
    lastMessage: '',
    updatedAt: now,
  };
  conversations.set(conv.id, conv);
  messages.set(conv.id, []);
  return conv;
}

/** 更新会话 */
export async function updateConversation(
  id: string,
  data: Partial<Pick<Conversation, 'title' | 'lastMessage'>>,
): Promise<Conversation | null> {
  const conv = conversations.get(id);
  if (!conv) return null;

  Object.assign(conv, data, { updatedAt: new Date().toISOString() });
  return conv;
}

/** 删除会话 */
export async function deleteConversation(id: string): Promise<boolean> {
  const existed = conversations.has(id);
  conversations.delete(id);
  messages.delete(id);
  return existed;
}

/** 获取会话的消息列表 */
export async function findMessages(conversationId: string): Promise<Message[]> {
  return messages.get(conversationId) ?? [];
}

/** 添加消息到会话 */
export async function addMessage(
  conversationId: string,
  msg: Omit<Message, 'id' | 'conversationId' | 'createdAt'>,
): Promise<Message | null> {
  if (!conversations.has(conversationId)) return null;

  const message: Message = {
    ...msg,
    id: generateId(),
    conversationId,
    createdAt: new Date().toISOString(),
  };

  const list = messages.get(conversationId) ?? [];
  list.push(message);
  messages.set(conversationId, list);

  // 同步更新会话最后消息
  await updateConversation(conversationId, {
    lastMessage: msg.content.slice(0, 20) + (msg.content.length > 20 ? '…' : ''),
  });

  return message;
}
