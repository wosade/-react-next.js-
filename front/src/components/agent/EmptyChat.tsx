'use client';

import React from 'react';
import { MessageSquare, Lightbulb, ArrowRight } from 'lucide-react';
import styles from './EmptyChat.module.less';

interface EmptyChatProps {
  /** 用户点击示例后触发的回调 */
  onExampleClick?: (example: string) => void;
}

/** 建议的示例对话，帮助用户快速上手 */
const EXAMPLES = [
  { icon: '📊', text: '帮我查询今天的销售数据' },
  { icon: '📧', text: '给张三发一封邮件，确认明天的会议' },
  { icon: '🔍', text: '分析最近的用户反馈并给出摘要' },
];

export default function EmptyChat({ onExampleClick }: EmptyChatProps) {
  return (
    <div className={styles.container}>
      {/* 图标 */}
      <div className={styles.iconBox}>
        <MessageSquare className={styles.icon} strokeWidth={1.5} />
      </div>

      {/* 标题与说明 */}
      <h2 className={styles.title}>
        开始与 Agent 对话
      </h2>
      <p className={styles.description}>
        Agent 可以调用工具帮你完成任务，<br />
        每次工具调用都会透明展示在对话中
      </p>

      {/* 示例提示 */}
      <div className={styles.examples}>
        <div className={styles.examplesHeader}>
          <Lightbulb className={styles.bulbIcon} strokeWidth={1.5} />
          <span className={styles.examplesLabel}>
            试试这样说
          </span>
        </div>
        {EXAMPLES.map((example, i) => (
          <button
            key={i}
            onClick={() => onExampleClick?.(example.text)}
            className={styles.exampleBtn}
          >
            <span className={styles.exampleIcon}>{example.icon}</span>
            <span className={styles.exampleText}>{example.text}</span>
            <ArrowRight className={styles.arrowIcon} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
