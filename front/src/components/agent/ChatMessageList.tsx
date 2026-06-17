'use client';

import React, { useRef, useEffect } from 'react';
import type { AgentMessage } from '@/types/agent';
import ChatMessage from './ChatMessage';
import ChatTyping from './ChatTyping';
import EmptyChat from './EmptyChat';
import styles from './ChatMessageList.module.less';

interface ChatMessageListProps {
  messages: AgentMessage[];
  isLoading: boolean;
  onExampleClick: (example: string) => void;
}

export default function ChatMessageList({
  messages,
  isLoading,
  onExampleClick,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  /** 新消息到达或 loading 状态变化时自动滚动到底部 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className={styles.container}>
      {messages.length === 0 && !isLoading ? (
        <EmptyChat onExampleClick={onExampleClick} />
      ) : (
        <div className={styles.inner}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isLoading && <ChatTyping />}

          {/* 滚动锚点 */}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
