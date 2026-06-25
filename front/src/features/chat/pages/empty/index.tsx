import { MessageSquare } from 'lucide-react';
import styles from './index.module.less';

export default function EmptyState() {
  return (
    <div className={styles.container}>
      <div className={styles.iconBox}>
        <MessageSquare className={styles.icon} strokeWidth={1.5} />
      </div>
      <h2 className={styles.title}>选择或创建一个会话</h2>
      <p className={styles.description}>
        从左侧选择一个已有会话继续对话，
        <br />
        或点击「新建对话」开始新的聊天
      </p>
    </div>
  );
}