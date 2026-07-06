import request from '@/api/request';

interface AuthPayload {
  token: string;
  refreshToken: string;
  user: { id: string; username: string };
}

/** POST /api/auth/login */
export async function login(username: string, password: string): Promise<AuthPayload> {
  const res = await request.post<{ data: AuthPayload }>('/auth/login', { username, password });
  return res.data.data;
}

/** POST /api/auth/register */
export async function register(username: string, password: string): Promise<AuthPayload> {
  const res = await request.post<{ data: AuthPayload }>('/auth/register', { username, password });
  return res.data.data;
}

/** GET /api/auth/me */
export async function getMe(): Promise<{ id: string; username: string }> {
  const res = await request.get<{ data: { id: string; username: string } }>('/auth/me');
  return res.data.data;
}
