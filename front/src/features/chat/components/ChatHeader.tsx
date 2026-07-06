import React from 'react';
import { Bot, Circle, Wrench } from 'lucide-react';
import styles from './ChatHeader.module.less';

interface ChatHeaderProps {
  title?: string;
  isProcessing?: boolean;
  toolCount?: number;
}

export default function ChatHeader({
  title = 'Agent 对话',
  isProcessing = false,
  toolCount = 0,
}: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.iconBox}>
          <Bot className={styles.botIcon} strokeWidth={1.5} />
        </div>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.statusRow}>
            <Circle
              className={`${styles.statusDot} ${
                isProcessing ? styles.statusDotProcessing : styles.statusDotReady
              }`}
              size={6}
              fill="currentColor"
            />
            <span className={styles.statusText}>
              {isProcessing ? '处理中…' : '就绪'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.rightSection}>
        {toolCount > 0 && (
          <span className={styles.toolBadge}>
            <Wrench size={14} />
            {toolCount} 个工具
          </span>
        )}
      </div>
    </header>
  );
}