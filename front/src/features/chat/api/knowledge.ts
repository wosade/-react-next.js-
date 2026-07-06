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

/** DELETE /api/knowledge/:id */
export async function deleteDocument(id: string): Promise<void> {
  await request.delete(`/knowledge/${id}`);
}
