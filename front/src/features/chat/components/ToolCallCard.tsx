import React, { useState } from 'react';
import { Wrench, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import type { ToolCall } from '@/shared/types';
import styles from './ToolCallCard.module.less';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

const STATUS_STYLE: Record<
  ToolCall['status'],
  { card: string; text: string; icon: React.ReactNode }
> = {
  pending: {
    card: styles.cardPending,
    text: styles.textPending,
    icon: <Loader2 className={styles.spinIcon} />,
  },
  running: {
    card: styles.cardRunning,
    text: styles.textRunning,
    icon: <Loader2 className={styles.spinIcon} />,
  },
  done: {
    card: styles.cardDone,
    text: styles.textDone,
    icon: <Check className={styles.statusIcon} />,
  },
  error: {
    card: styles.cardError,
    text: styles.textError,
    icon: <X className={styles.statusIcon} />,
  },
};

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { card, text, icon } = STATUS_STYLE[toolCall.status];

  return (
    <div className={`${styles.card} ${card}`}>
      <button
        className={styles.header}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={styles.headerLeft}>
          <Wrench size={14} />
          <span className={styles.toolName}>{toolCall.name}</span>
          <span className={`${styles.status} ${text}`}>
            {icon}
            {toolCall.status}
          </span>
        </div>
        <ChevronRight
          size={14}
          className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
        />
      </button>

      {expanded && (
        <div className={styles.body}>
          <div className={styles.section}>
            <span className={styles.label}>参数</span>
            <pre className={styles.code}>
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div className={styles.section}>
              <span className={styles.label}>结果</span>
              <pre className={styles.code}>
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.error && (
            <div className={styles.section}>
              <span className={styles.label}>错误</span>
              <pre className={styles.code}>{toolCall.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}