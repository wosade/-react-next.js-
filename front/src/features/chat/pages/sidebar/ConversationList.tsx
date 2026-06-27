import { MessageSquare, Clock, Trash2 } from 'lucide-react';
import type { Conversation } from '@/shared/types';
import styles from './index.module.less';

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(isoString).toLocaleDateString('zh-CN');
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
        <MessageSquare className={styles.emptyIcon} strokeWidth={1.5} />
        <p className={styles.emptyText}>
          暂无历史会话
          <br />
          点击上方按钮开始对话
        </p>
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
            className={isActive ? styles.convItemActive : styles.convItem}
          >
            <div className={styles.convHeader}>
              <MessageSquare
                className={isActive ? styles.convIconActive : styles.convIcon}
                size={14}
              />
              <span className={isActive ? styles.convTitleActive : styles.convTitleInactive}>
                {c.title || '新对话'}
              </span>
            </div>
            <p className={styles.convPreview}>{c.lastMessage || '暂无消息'}</p>
            <div className={styles.convMeta}>
              <Clock size={12} className={styles.convTimeIcon} />
              <span className={styles.convTime}>{relativeTime(c.updatedAt)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className={styles.deleteBtn}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </button>
        );
      })}
    </div>
  );
}