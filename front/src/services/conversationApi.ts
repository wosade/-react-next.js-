import request from '@/api/request';
import type { Conversation } from '@/types/agent';

/** 获取当前用户的会话列表 */
export async function fetchConversations(): Promise<Conversation[]> {
  const res = await request.get<{ data: Conversation[] }>('/conversations');
  return res.data.data;
}

/** 创建新会话，返回新会话对象 */
export async function createConversation(title?: string): Promise<Conversation> {
  const res = await request.post<{ data: Conversation }>('/conversations', { title });
  return res.data.data;
}

/** 获取单个会话详情 */
export async function fetchConversation(id: string): Promise<Conversation> {
  const res = await request.get<{ data: Conversation }>(`/conversations/${id}`);
  return res.data.data;
}

/** 删除会话 */
export async function deleteConversation(id: string): Promise<void> {
   await request.delete(`/conversations/${id}`);
}
