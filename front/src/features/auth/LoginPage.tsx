import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import request from '@/api/request';
import styles from './LoginPage.module.less';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname || '/chat';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await request.post<{
        data: { token: string; refreshToken: string; user: { id: string; username: string } };
      }>('/auth/login', { username, password });

      const { token, refreshToken, user } = res.data.data;
      login(token, refreshToken, user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        '登录失败，请重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>登录</h1>

        {error && <div className={styles.error}>{error}</div>}

        <label className={styles.label}>
          用户名
          <input
            className={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            autoComplete="username"
            required
          />
        </label>

        <label className={styles.label}>
          密码
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            autoComplete="current-password"
            required
          />
        </label>

        <button className={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? '登录中…' : '登录'}
        </button>

        <p className={styles.footer}>
          还没有账号？
          <Link to="/register" className={styles.link}>
            立即注册
          </Link>
        </p>
      </form>
    </div>
  );
}
