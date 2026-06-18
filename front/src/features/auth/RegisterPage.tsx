import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import request from '@/api/request';
import styles from './RegisterPage.module.less';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      await request.post('/auth/register', { username, password });
      // 注册成功，跳转登录页
      navigate('/login', { replace: true });
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
            autoComplete="new-password"
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
            placeholder="请再次输入密码"
            autoComplete="new-password"
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
