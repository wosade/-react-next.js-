
import React from 'react';
import { Bot, Circle } from 'lucide-react';
import styles from './ChatHeader.module.less';

interface ChatHeaderProps {
  /** 当前会话标题 */
  title?: string;
  /** Agent 是否正在处理中 */
  isProcessing?: boolean;
  /** 已注册的工具数量 */
  toolCount?: number;
}

export default function ChatHeader({
  title = 'Agent 对话',
  isProcessing = false,
  toolCount = 0,
}: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      {/* 左侧：会话标题 & 状态 */}
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
              fill="currentColor"
              strokeWidth={0}
            />
            <span className={styles.statusText}>
              {isProcessing ? '处理中…' : '就绪'}
            </span>
          </div>
        </div>
      </div>

      {/* 右侧：工具状态 */}
      {toolCount > 0 && (
        <div>
          <span className={styles.toolBadge}>
            🔧 {toolCount} 个工具可用
          </span>
        </div>
      )}
    </header>
  );
}
