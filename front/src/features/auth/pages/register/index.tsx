import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '@/features/auth/api';
import { useAuth } from '@/shared/contexts/AuthContext';
import styles from './index.module.less';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: doLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const result = await register(username, password);
      doLogin(result.token, result.refreshToken, result.user);
      navigate('/chat', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        '注册失败，请重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>注册</h1>

        {error && <div className={styles.error}>{error}</div>}

        <label className={styles.label}>
          用户名
          <input
            className={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className={styles.label}>
          密码
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label className={styles.label}>
          确认密码
          <input
            className={styles.input}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>

        <button className={styles.submitBtn} type="submit" disabled={loading}>
          {loading ? '注册中…' : '注册'}
        </button>

        <p className={styles.footer}>
          已有账号？
          <Link to="/login" className={styles.link}>
            立即登录
          </Link>
        </p>
      </form>
    </div>
  );
}