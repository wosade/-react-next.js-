import React, { useRef, useEffect } from 'react';
import type { AgentMessage } from '@/shared/types';
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className={styles.container}>
      {messages.length === 0 && !isLoading ? (
        <EmptyChat onExampleClick={onExampleClick} />
      ) : (
        messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
      )}
      {isLoading && <ChatTyping />}
      <div ref={bottomRef} />
    </div>
  );
}