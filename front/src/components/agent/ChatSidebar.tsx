'use client';

import React from 'react';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import type { Conversation } from '@/types/agent';
import styles from './ChatSidebar.module.less';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

/** 格式化相对时间 */
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
      {/* 顶部：新建对话按钮 */}
      <div className={styles.topSection}>
        <button
          onClick={onNew}
          className={styles.newChatBtn}
        >
          <Plus className={styles.plusIcon} strokeWidth={2} />
          新建对话
        </button>
      </div>

      {/* 分隔线 */}
      <div className={styles.divider} />

      {/* 会话列表 */}
      <div className={styles.list}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <MessageSquare className={styles.emptyIcon} strokeWidth={1.5} />
            <p className={styles.emptyText}>
              暂无历史会话
              <br />
              点击上方按钮开始对话
            </p>
          </div>
        ) : (
          <div className={styles.listInner}>
            {conversations.map((conv) => {
              const isActive = activeId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={isActive ? styles.convItemActive : styles.convItem}
                >
                  {/* 标题 */}
                  <div className={styles.convHeader}>
                    <MessageSquare
                      className={isActive ? styles.convIconActive : styles.convIcon}
                      strokeWidth={1.5}
                    />
                    <span
                      className={`${styles.convTitle} ${
                        isActive ? styles.convTitleActive : styles.convTitleInactive
                      }`}
                    >
                      {conv.title}
                    </span>
                  </div>

                  {/* 最后消息预览 */}
                  <p className={styles.convPreview}>{conv.lastMessage}</p>

                  {/* 时间 */}
                  <div className={styles.convMeta}>
                    <Clock className={styles.convTimeIcon} strokeWidth={1.5} />
                    <span className={styles.convTime}>
                      {relativeTime(conv.updatedAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
