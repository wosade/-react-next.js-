
import React, { useState } from 'react';
import { Wrench, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import type { ToolCall } from '@/types/agent';
import styles from './ToolCallCard.module.less';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

/** 状态对应的样式类名与图标 */
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

/** 状态中文映射 */
const STATUS_LABEL: Record<ToolCall['status'], string> = {
  pending: '等待中',
  running: '执行中',
  done: '已完成',
  error: '出错',
};

export default function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLE[toolCall.status];

  const hasArgs = Object.keys(toolCall.args).length > 0;

  return (
    <div className={`${styles.card} ${style.card}`}>
      {/* 头部：点击展开/折叠 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={styles.header}
      >
        {/* 状态图标 */}
        <span className={style.text}>{style.icon}</span>

        {/* 工具图标 */}
        <Wrench className={styles.toolIcon} strokeWidth={1.5} />

        {/* 工具名称 */}
        <span className={styles.toolName}>{toolCall.name}</span>

        {/* 状态标签 */}
        <span className={`${styles.statusLabel} ${style.text}`}>
          {STATUS_LABEL[toolCall.status]}
        </span>

        {/* 展开箭头 */}
        <ChevronRight
          className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ''}`}
          strokeWidth={1.5}
        />
      </button>

      {/* 展开内容：参数与结果 */}
      {expanded && (
        <div className={styles.content}>
          {/* 参数 */}
          {hasArgs && (
            <div className={styles.contentSection}>
              <span className={styles.sectionLabel}>参数</span>
              <pre className={styles.codeBlock}>
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}

          {/* 结果 */}
          {toolCall.result !== undefined && (
            <div className={styles.contentSection}>
              <span className={styles.sectionLabel}>结果</span>
              <pre className={styles.codeBlockResult}>
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {/* 错误信息 */}
          {toolCall.status === 'error' && toolCall.error && (
            <div className={styles.contentSection}>
              <span className={styles.sectionLabelError}>错误信息</span>
              <pre className={styles.codeBlockError}>
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
