import request from '@/api/request';

export async function sendMessage(message: string, sessionId?: string): Promise<{ reply: string }> {
  const res = await request.post<{ reply: string }>('/chat/send', { message, sessionId });
  return res.data;
}