import request from '@/api/request';
import type { Conversation } from '@/shared/types';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await request.get<{ data: Conversation[] }>('/conversations');
  return res.data.data;
}

export async function createConversation(title?: string): Promise<Conversation> {
  const res = await request.post<{ data: Conversation }>('/conversations', { title });
  return res.data.data;
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const res = await request.get<{ data: Conversation }>(`/conversations/${id}`);
  return res.data.data;
}

export async function deleteConversation(id: string): Promise<void> {
  await request.delete(`/conversations/${id}`);
}