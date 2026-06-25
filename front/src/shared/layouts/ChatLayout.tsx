import { Outlet } from 'react-router-dom';
import Sidebar from '@/features/chat/pages/sidebar';
import styles from './ChatLayout.module.less';

export default function ChatLayout() {
  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}