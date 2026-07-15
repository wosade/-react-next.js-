import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Trash2, Download, FileText, Loader2 } from 'lucide-react';
import { listDocuments, uploadDocument, downloadDocument, deleteDocument } from '@/features/chat/api/knowledge';
import type { DocumentRecord } from '@/shared/types';
import styles from './index.module.less';

export default function KnowledgePage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setDocs(await listDocuments());
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      await downloadDocument(id, name);
    } catch (err: any) {
      alert(err.response?.data?.error || '下载失败');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除「${name}」？`)) return;
    try {
      await deleteDocument(id);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const fmt = (b: number) =>
    b < 1024 ? `${b}B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const total = docs.reduce((s, d) => s + d.size, 0);
  const chunks = docs.reduce((s, d) => s + d.chunkCount, 0);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>知识库</h1>
          <p className={styles.sub}>已上传 {docs.length} 个文档，共 {chunks} 个向量片段，{fmt(total)}</p>
        </div>
        <button className={styles.uploadBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 size={14} className={styles.spin} /> 上传中…</> : <><Upload size={14} /> 上传文档</>}
        </button>
        <input ref={inputRef} type="file" onChange={handleUpload} hidden accept=".txt,.pdf,.md,.csv,.json,.doc,.docx" />
      </div>

      {loading ? (
        <div className={styles.center}><Loader2 size={20} className={styles.spin} /> 加载中…</div>
      ) : docs.length === 0 ? (
        <div className={styles.empty}>
          <FileText size={40} strokeWidth={1} />
          <p className={styles.emptyTitle}>暂无文档</p>
          <p className={styles.emptyHint}>上传 PDF、Word、TXT、Markdown 等格式，构建你的专属知识库</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.trh}>
            <span className={styles.cn}>文档名称</span>
            <span className={styles.ct}>类型</span>
            <span className={styles.cs}>大小</span>
            <span className={styles.cc}>片段</span>
            <span className={styles.cd}>上传时间</span>
            <span className={styles.ca} />
          </div>
          {docs.map((d) => (
            <div key={d.id} className={styles.tr}>
              <span className={styles.cn}><FileText size={13} className={styles.ficon} />{d.name}</span>
              <span className={styles.ct}><span className={styles.badge}>{d.type.toUpperCase()}</span></span>
              <span className={styles.cs}>{fmt(d.size)}</span>
              <span className={styles.cc}>{d.chunkCount}</span>
              <span className={styles.cd}>{new Date(d.createdAt).toLocaleDateString('zh-CN')}</span>
              <span className={styles.ca}>
                <button className={styles.dlBtn} onClick={() => handleDownload(d.id, d.name)} title="下载">
                  <Download size={13} />
                </button>
                <button className={styles.delBtn} onClick={() => handleDelete(d.id, d.name)} title="删除">
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
