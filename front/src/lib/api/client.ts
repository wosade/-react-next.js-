/**
 * API 客户端
 */

import { API_BASE_URL } from '@/lib/constants';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
