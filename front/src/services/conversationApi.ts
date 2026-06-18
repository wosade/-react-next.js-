import { apiClient } from '@/lib/api/client';
import type { Conversation } from '@/types/agent';

interface ApiResponse<T> {
  data: T;
}

/** 获取会话列表 */
export async function fetchConversations(): Promise<Conversation[]> {
  const res = await apiClient<ApiResponse<Conversation[]>>('/conversations');
  return res.data.map(toConversation);
}

/** 创建新会话 */
export async function createConversation(title?: string): Promise<Conversation> {
  const res = await apiClient<ApiResponse<Conversation>>('/conversations', {
    method: 'POST',
    body: title ? { title } : undefined,
  });
  return toConversation(res.data);
}

/** 删除会话 */
export async function deleteConversation(id: string): Promise<void> {
  await apiClient(`/conversations/${id}`, { method: 'DELETE' });
}

function toConversation(raw: Conversation): Conversation {
  return {
    ...raw,
    updatedAt: new Date(raw.updatedAt as unknown as string).getTime(),
  };
}
