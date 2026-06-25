import { Link } from 'react-router-dom';
import styles from './index.module.less';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>页面不存在</p>
      <Link to="/chat" className={styles.link}>
        返回首页
      </Link>
    </div>
  );
}