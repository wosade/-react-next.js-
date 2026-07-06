import { useState, useEffect } from 'react';
import { Settings, User, Key, Palette, Server, Shield, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { getMe } from '@/features/auth/api';
import styles from './index.module.less';

type Tab = 'profile' | 'api' | 'appearance' | 'advanced';

const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
  { key: 'profile', icon: <User size={15} />, label: '个人信息' },
  { key: 'api', icon: <Key size={15} />, label: 'API 配置' },
  { key: 'appearance', icon: <Palette size={15} />, label: '外观' },
  { key: 'advanced', icon: <Server size={15} />, label: '高级' },
];

interface Profile {
  id: string;
  username: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tab === 'profile') {
      getMe().then(setProfile).catch(() => {});
    }
  }, [tab]);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}><Settings size={20} /> 设置</h1>
        <p className={styles.sub}>管理账户和应用偏好</p>
      </div>

      <div className={styles.layout}>
        {/* tabs */}
        <div className={styles.side}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={t.key === tab ? styles.sideOn : styles.sideItem}>
              {t.icon}
              <span>{t.label}</span>
              <ChevronRight size={13} className={styles.arrow} />
            </button>
          ))}
        </div>

        {/* content */}
        <div className={styles.main}>
          {tab === 'profile' && (
            <section className={styles.section}>
              <h2 className={styles.secTitle}><Shield size={14} /> 账户信息</h2>
              <div className={styles.row}>
                <span className={styles.lbl}>用户名</span>
                <span className={styles.val}>{profile?.username || user?.username || '—'}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.lbl}>用户 ID</span>
                <span className={styles.valMono}>{profile?.id || user?.id || '—'}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.lbl}>角色</span>
                <span className={styles.val}>普通用户</span>
              </div>

              <h3 className={styles.secTitle} style={{ marginTop: 24 }}>修改密码</h3>
              <div className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.lbl}>当前密码</span>
                  <input type="password" className={styles.inp} placeholder="输入当前密码" />
                </label>
                <label className={styles.field}>
                  <span className={styles.lbl}>新密码</span>
                  <input type="password" className={styles.inp} placeholder="输入新密码" />
                </label>
                <label className={styles.field}>
                  <span className={styles.lbl}>确认新密码</span>
                  <input type="password" className={styles.inp} placeholder="再次输入新密码" />
                </label>
                <button onClick={flash} className={styles.btn}>
                  {saved ? <><Check size={13} /> 已保存</> : '保存修改'}
                </button>
              </div>
            </section>
          )}

          {tab === 'api' && (
            <section className={styles.section}>
              <h2 className={styles.secTitle}><Key size={14} /> 模型</h2>
              <div className={styles.radioGroup}>
                {[
                  { id: 'deepseek-v4', label: 'DeepSeek V4', desc: '当前 LLM 模型' },
                  { id: 'gpt-4o', label: 'GPT-4o', desc: 'OpenAI 最新多模态模型' },
                  { id: 'claude-sonnet', label: 'Claude Sonnet', desc: '擅长长文本与代码' },
                ].map((m) => (
                  <label key={m.id} className={styles.radio}>
                    <input type="radio" name="model" defaultChecked={m.id === 'deepseek-v4'} />
                    <span>
                      <strong>{m.label}</strong>
                      <small>{m.desc}</small>
                    </span>
                  </label>
                ))}
              </div>

              <h3 className={styles.secTitle} style={{ marginTop: 24 }}>Embedding</h3>
              <div className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.lbl}>LLM API Key</span>
                  <input type="password" className={styles.inp} placeholder="sk-..." defaultValue="••••••••" />
                </label>
                <label className={styles.field}>
                  <span className={styles.lbl}>Embedding 模型</span>
                  <input type="text" className={styles.inp} defaultValue="BAAI/bge-large-zh-v1.5" disabled />
                </label>
                <button onClick={flash} className={styles.btn}>
                  {saved ? <><Check size={13} /> 已保存</> : '保存配置'}
                </button>
              </div>
            </section>
          )}

          {tab === 'appearance' && (
            <section className={styles.section}>
              <h2 className={styles.secTitle}><Palette size={14} /> 主题</h2>
              <div className={styles.radioGroup}>
                {[
                  { id: 'light', label: '浅色模式', desc: '当前主题' },
                  { id: 'dark', label: '深色模式', desc: '计划中' },
                  { id: 'auto', label: '跟随系统', desc: '计划中' },
                ].map((t) => (
                  <label key={t.id} className={styles.radio}>
                    <input type="radio" name="theme" defaultChecked={t.id === 'light'} />
                    <span><strong>{t.label}</strong><small>{t.desc}</small></span>
                  </label>
                ))}
              </div>
              <h3 className={styles.secTitle} style={{ marginTop: 24 }}>字体</h3>
              <div className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.lbl}>界面字号</span>
                  <select className={styles.sel} defaultValue="medium">
                    <option value="small">小 (13px)</option>
                    <option value="medium">中 (14px)</option>
                    <option value="large">大 (16px)</option>
                  </select>
                </label>
                <button onClick={flash} className={styles.btn}>
                  {saved ? <><Check size={13} /> 已保存</> : '保存'}
                </button>
              </div>
            </section>
          )}

          {tab === 'advanced' && (
            <section className={styles.section}>
              <h2 className={styles.secTitle}><Server size={14} /> 服务端点</h2>
              <div className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.lbl}>Qdrant 地址</span>
                  <input type="text" className={styles.inp} defaultValue="http://localhost:6333" />
                </label>
                <label className={styles.field}>
                  <span className={styles.lbl}>Embedding API</span>
                  <input type="text" className={styles.inp} defaultValue="http://localhost:11434" />
                </label>
                <label className={styles.field}>
                  <span className={styles.lbl}>MySQL</span>
                  <input type="text" className={styles.inp} defaultValue="localhost:3306" disabled />
                </label>
                <label className={styles.field}>
                  <span className={styles.lbl}>Redis</span>
                  <input type="text" className={styles.inp} defaultValue="localhost:6379" disabled />
                </label>
                <button onClick={flash} className={styles.btn}>
                  {saved ? <><Check size={13} /> 已保存</> : '保存配置'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
