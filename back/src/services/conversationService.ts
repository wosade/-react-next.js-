import * as conversationModel from '../models/conversation.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Conversation, ConversationDetail, Message } from '../types/index.js';

/** 获取所有会话列表 */
export async function getConversationList(): Promise<Conversation[]> {
  return conversationModel.findAllConversations();
}

/** 获取单个会话详情 */
export async function getConversation(id: string): Promise<ConversationDetail> {
  const conv = await conversationModel.findConversationById(id);
  if (!conv) {
    throw new AppError(404, '会话不存在');
  }
  return conv;
}

/** 创建新会话 */
export async function createConversation(title?: string): Promise<Conversation> {
  return conversationModel.createConversation(title);
}

/** 更新会话 */
export async function updateConversation(
  id: string,
  data: { title?: string; lastMessage?: string },
): Promise<Conversation> {
  const conv = await conversationModel.updateConversation(id, data);
  if (!conv) {
    throw new AppError(404, '会话不存在');
  }
  return conv;
}

/** 删除会话 */
export async function deleteConversation(id: string): Promise<void> {
  const existed = await conversationModel.deleteConversation(id);
  if (!existed) {
    throw new AppError(404, '会话不存在');
  }
}

/** 添加消息到会话 */
export async function addMessage(
  conversationId: string,
  msg: Pick<Message, 'role' | 'content' | 'toolCalls'>,
): Promise<Message> {
  const message = await conversationModel.addMessage(conversationId, msg);
  if (!message) {
    throw new AppError(404, '会话不存在');
  }
  return message;
}
