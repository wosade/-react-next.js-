'use client';

import React from 'react';
import { User, Bot } from 'lucide-react';
import type { AgentMessage } from '@/types/agent';
import ToolCallCard from './ToolCallCard';
import styles from './ChatMessage.module.less';

interface ChatMessageProps {
  message: AgentMessage;
}

/** 格式化时间戳为 HH:MM */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  return (
    <div className={`${styles.row} ${isUser ? styles.rowReverse : ''}`}>
      {/* 头像 */}
      <div
        className={`${styles.avatar} ${
          isUser ? styles.avatarUser : isTool ? styles.avatarTool : styles.avatarAgent
        }`}
      >
        {isUser ? (
          <User className={styles.icon14} strokeWidth={2} />
        ) : isTool ? (
          <span>🔧</span>
        ) : (
          <Bot className={styles.iconSecondary} strokeWidth={1.5} />
        )}
      </div>

      {/* 气泡内容 */}
      <div className={`${styles.bubbleWrapper} ${styles.flexCol} ${isUser ? styles.itemsEnd : styles.itemsStart}`}>
        {/* 角色 + 时间 */}
        <div className={`${styles.meta} ${isUser ? styles.metaReverse : ''}`}>
          <span className={styles.roleLabel}>
            {isUser ? '你' : isTool ? '工具' : 'Agent'}
          </span>
          <span className={styles.timestamp}>{formatTime(message.timestamp)}</span>
        </div>

        {/* 消息气泡 */}
        <div
          className={`${styles.bubble} ${
            isUser ? styles.bubbleUser : isTool ? styles.bubbleTool : styles.bubbleAgent
          }`}
        >
          {/* 文本内容 */}
          <div className={styles.content}>{message.content}</div>

          {/* 工具调用卡片列表 */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className={styles.toolCalls}>
              {message.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
