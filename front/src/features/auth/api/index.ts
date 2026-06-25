import request from '@/api/request';

export async function login(username: string, password: string) {
  const res = await request.post<{
    data: { token: string; refreshToken: string; user: { id: string; username: string } };
  }>('/auth/login', { username, password });
  return res.data.data;
}

export async function register(username: string, password: string) {
  await request.post('/auth/register', { username, password });
}