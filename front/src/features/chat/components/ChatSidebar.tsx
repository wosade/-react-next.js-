import React from 'react';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import type { Conversation } from '@/shared/types';
import styles from './ChatSidebar.module.less';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: ChatSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <button
          onClick={onNew}
          className={styles.newChatBtn}
        >
          <Plus className={styles.plusIcon} strokeWidth={2} />
          新建对话
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.list}>
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className={`${styles.item} ${
              conv.id === activeId ? styles.itemActive : ''
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare size={16} className={styles.itemIcon} />
            <div className={styles.itemContent}>
              <span className={styles.itemTitle}>{conv.title}</span>
              <span className={styles.itemTime}>
                <Clock size={12} />
                {relativeTime(Number(conv.updatedAt))}
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}