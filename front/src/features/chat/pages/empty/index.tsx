import styles from './index.module.less';

export default function EmptyState() {
  return (
    <div className={styles.container}>
      <span className={styles.mark}>▣</span>
      <h2 className={styles.title}>选择或创建一个对话</h2>
      <p className={styles.desc}>从左侧选择已有会话，或点击 + 开始新的对话</p>
    </div>
  );
}
