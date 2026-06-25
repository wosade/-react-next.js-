import React from 'react';
import styles from './ChatTyping.module.less';

export default function ChatTyping() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.avatar}>
        <span>🤖</span>
      </div>

      <div className={styles.bubble}>
        <span
          className={styles.dot}
          style={{ animationDelay: '0ms' }}
        />
        <span
          className={styles.dot}
          style={{ animationDelay: '150ms' }}
        />
        <span
          className={styles.dot}
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}