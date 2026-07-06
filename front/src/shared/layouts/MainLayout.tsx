import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Database, Wrench, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import styles from './MainLayout.module.less';

interface NavItem {
  to: string;
  match: string;
  icon: React.ReactNode;
  label: string;
}

const NAV: NavItem[] = [
  { to: '/chat', match: '/chat', icon: <MessageSquare size={16} />, label: '对话' },
  { to: '/knowledge', match: '/knowledge', icon: <Database size={16} />, label: '知识库' },
  { to: '/tools', match: '/tools', icon: <Wrench size={16} />, label: '工具' },
  { to: '/settings', match: '/settings', icon: <Settings size={16} />, label: '设置' },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.shell}>
      {/* ---- narrow side nav ---- */}
      <nav className={styles.navRail}>
        <NavLink to="/chat" className={styles.brand}>
          <span className={styles.brandMark}>▣</span>
        </NavLink>

        <div className={styles.navLinks}>
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.match);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={active ? styles.navLinkActive : styles.navLink}
                title={item.label}
              >
                {item.icon}
              </NavLink>
            );
          })}
        </div>

        <div className={styles.navBottom}>
          {user && (
            <span className={styles.avatar} title={user.username}>
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
          <button onClick={handleLogout} className={styles.logoutBtn} title="退出登录">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* ---- main area ---- */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
