import { MessageSquare, Trash2 } from 'lucide-react';
import type { Conversation } from '@/shared/types';
import styles from './index.module.less';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

interface Props {
  conversations: Conversation[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ConversationList({ conversations, activeId, onSelect, onDelete }: Props) {
  if (conversations.length === 0) {
    return (
      <div className={styles.empty}>
        <MessageSquare size={28} strokeWidth={1.2} className={styles.emptyIcon} />
        <p className={styles.emptyText}>暂无对话记录</p>
      </div>
    );
  }

  return (
    <div className={styles.listInner}>
      {conversations.map((c) => {
        const isActive = activeId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={isActive ? styles.itemActive : styles.item}
          >
            <div className={styles.itemHead}>
              <span className={styles.itemIcon} />
              <span className={styles.itemTitle}>{c.title || '新对话'}</span>
            </div>
            <p className={styles.itemPreview}>{c.lastMessage || '—'}</p>
            <div className={styles.itemMeta}>
              <span className={styles.itemTime}>{relativeTime(c.updatedAt)}</span>
              <span
                className={styles.itemDelete}
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                title="删除"
              >
                <Trash2 size={11} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
