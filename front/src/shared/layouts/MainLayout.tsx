import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Wrench, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import styles from './MainLayout.module.less';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>🤖 Agent</span>
          <nav className={styles.nav}>
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                isActive ? styles.navItemActive : styles.navItem
              }
            >
              <MessageSquare size={16} />
              聊天
            </NavLink>
            <NavLink
              to="/tools"
              className={({ isActive }) =>
                isActive ? styles.navItemActive : styles.navItem
              }
            >
              <Wrench size={16} />
              工具
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                isActive ? styles.navItemActive : styles.navItem
              }
            >
              <Settings size={16} />
              设置
            </NavLink>
          </nav>
        </div>

        <div className={styles.headerRight}>
          {user && <span className={styles.username}>{user.username}</span>}
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={16} />
            退出
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}