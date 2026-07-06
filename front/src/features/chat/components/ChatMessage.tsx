import React from 'react';
import { User, Bot } from 'lucide-react';
import type { AgentMessage } from '@/shared/types';
import ToolCallCard from './ToolCallCard';
import styles from './ChatMessage.module.less';

interface ChatMessageProps {
  message: AgentMessage;
}

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
      <div
        className={`${styles.avatar} ${
          isUser ? styles.avatarUser : isTool ? styles.avatarTool : styles.avatarAgent
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={styles.content}>
        <div
          className={`${styles.bubble} ${
            isUser ? styles.bubbleUser : isTool ? styles.bubbleTool : styles.bubbleAgent
          }`}
        >
          {/* 工具调用 — 放在对话框上部 */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className={styles.toolCalls}>
              {message.toolCalls.map((tc) => (
                <ToolCallCard key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}

          {/* 正文内容 — 放在工具调用下方 */}
          {message.content && <p className={styles.text}>{message.content}</p>}
        </div>

        <span className={styles.time}>{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}