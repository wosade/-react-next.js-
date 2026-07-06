import { useState } from 'react';
import { ChevronRight, Check, X, Loader2 } from 'lucide-react';
import type { ToolCall } from '@/shared/types';
import styles from './ToolCallCard.module.less';

const LABELS: Record<string, string> = {
  get_weather: '天气查询',
  search_knowledge: '知识库检索',
  query_database: '数据库查询',
};

interface Props { toolCall: ToolCall }

const STATUS_MAP: Record<ToolCall['status'], { cls: string; label: string; icon: React.ReactNode }> = {
  pending:  { cls: styles.statusPending,  label: '等待中', icon: <Loader2 size={10} className={styles.spin} /> },
  running:  { cls: styles.statusRunning,  label: '执行中', icon: <Loader2 size={10} className={styles.spin} /> },
  done:     { cls: styles.statusDone,     label: '完成',   icon: <Check size={10} /> },
  error:    { cls: styles.statusError,    label: '失败',   icon: <X size={10} /> },
};

export default function ToolCallCard({ toolCall }: Props) {
  const [open, setOpen] = useState(false);
  const { cls, label, icon } = STATUS_MAP[toolCall.status];
  const display = LABELS[toolCall.name] || toolCall.name;
  const resultStr = typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result, null, 2);

  return (
    <div className={`${styles.card} ${cls}`}>
      <button className={styles.header} onClick={() => setOpen(!open)}>
        <span className={styles.headerLeft}>
          <span className={styles.dot}>{icon}</span>
          <span className={styles.name}>{display}</span>
          <span className={`${styles.badge} ${cls}`}>{label}</span>
        </span>
        <ChevronRight size={12} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.body}>
          <div className={styles.section}>
            <span className={styles.label}>参数</span>
            <pre className={styles.code}>{JSON.stringify(toolCall.args, null, 2)}</pre>
          </div>
          {resultStr && (
            <div className={styles.section}>
              <span className={styles.label}>结果</span>
              <pre className={styles.code}>{resultStr}</pre>
            </div>
          )}
          {toolCall.error && (
            <div className={styles.section}>
              <span className={styles.labelError}>错误</span>
              <pre className={styles.codeError}>{toolCall.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
