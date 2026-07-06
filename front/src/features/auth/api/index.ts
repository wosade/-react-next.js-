import request from '@/api/request';

interface AuthPayload {
  token: string;
  refreshToken: string;
  user: { id: string; username: string };
}

export interface UserProfile {
  id: string;
  username: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
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
export async function getMe(): Promise<UserProfile> {
  const res = await request.get<{ data: UserProfile }>('/auth/me');
  return res.data.data;
}

/** PUT /api/auth/smtp */
export async function updateSmtp(config: SmtpConfig): Promise<void> {
  await request.put('/auth/smtp', config);
}