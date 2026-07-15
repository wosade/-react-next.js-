import request from '@/api/request';
import type { DocumentRecord } from '@/shared/types';

/** GET /api/knowledge */
export async function listDocuments(): Promise<DocumentRecord[]> {
  const res = await request.get<{ data: DocumentRecord[] }>('/knowledge');
  return res.data.data;
}

/** POST /api/knowledge/upload (multipart/form-data) */
export async function uploadDocument(file: File): Promise<{ documentId: string; chunkCount: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await request.post<{ data: { documentId: string; chunkCount: number } }>(
    '/knowledge/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

/** GET /api/knowledge/:id/download → 触发浏览器下载 */
export async function downloadDocument(id: string, fileName: string): Promise<void> {
  const res = await request.get(`/knowledge/${id}/download`, {
    responseType: 'blob',
  });

  // 从 response 创建临时 URL 并触发下载
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/** DELETE /api/knowledge/:id */
export async function deleteDocument(id: string): Promise<void> {
  await request.delete(`/knowledge/${id}`);
}
