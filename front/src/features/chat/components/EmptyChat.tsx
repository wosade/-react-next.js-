import React from 'react';
import { MessageSquare, Lightbulb, ArrowRight } from 'lucide-react';
import styles from './EmptyChat.module.less';

interface EmptyChatProps {
  onExampleClick?: (example: string) => void;
}

const EXAMPLES = [
  { icon: '📊', text: '帮我查询今天的销售数据' },
  { icon: '📧', text: '给张三发一封邮件，确认明天的会议' },
  { icon: '🔍', text: '分析最近的用户反馈并给出摘要' },
];

export default function EmptyChat({ onExampleClick }: EmptyChatProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconBox}>
        <MessageSquare className={styles.icon} strokeWidth={1.5} />
      </div>

      <h2 className={styles.title}>
        开始与 Agent 对话
      </h2>
      <p className={styles.description}>
        选择一个示例开始，或输入你的问题
      </p>

      <div className={styles.examples}>
        {EXAMPLES.map((item) => (
          <button
            key={item.text}
            className={styles.exampleCard}
            onClick={() => onExampleClick?.(item.text)}
          >
            <div className={styles.exampleHeader}>
              <span className={styles.exampleIcon}>{item.icon}</span>
              <Lightbulb size={14} className={styles.exampleHint} />
            </div>
            <p className={styles.exampleText}>{item.text}</p>
            <ArrowRight size={14} className={styles.exampleArrow} />
          </button>
        ))}
      </div>
    </div>
  );
}