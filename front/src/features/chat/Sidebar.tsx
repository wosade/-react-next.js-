import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import request from '@/api/request';
import styles from './Sidebar.module.less';

interface Session {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: number;
}

/** 格式化相对时间 */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

export default function Sidebar() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const navigate = useNavigate();
  const { sessionId } = useParams();

  /** 加载会话列表 */
  const fetchSessions = async () => {
    try {
      const res = await request.get<{ data: Session[] }>('/sessions');
      setSessions(res.data.data);
    } catch (err) {
      console.error('加载会话列表失败:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  /** 新建会话后导航到 /chat，用户在输入框发送消息时后端创建 */
  const handleNew = () => {
    navigate('/chat');
  };

  /** 点击会话跳转 */
  const handleSelect = (id: string) => {
    navigate(`/chat/${id}`);
  };

  return (
    <aside className={styles.sidebar}>
      {/* 新建对话 */}
      <div className={styles.topSection}>
        <button onClick={handleNew} className={styles.newChatBtn}>
          <Plus className={styles.plusIcon} strokeWidth={2} />
          新建对话
        </button>
      </div>

      <div className={styles.divider} />

      {/* 会话列表 */}
      <div className={styles.list}>
        {sessions.length === 0 ? (
          <div className={styles.empty}>
            <MessageSquare className={styles.emptyIcon} strokeWidth={1.5} />
            <p className={styles.emptyText}>
              暂无历史会话
              <br />
              点击上方按钮开始对话
            </p>
          </div>
        ) : (
          <div className={styles.listInner}>
            {sessions.map((s) => {
              const isActive = sessionId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className={isActive ? styles.convItemActive : styles.convItem}
                >
                  <div className={styles.convHeader}>
                    <MessageSquare
                      className={isActive ? styles.convIconActive : styles.convIcon}
                      strokeWidth={1.5}
                    />
                    <span
                      className={`${styles.convTitle} ${
                        isActive ? styles.convTitleActive : styles.convTitleInactive
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  <p className={styles.convPreview}>{s.lastMessage}</p>
                  <div className={styles.convMeta}>
                    <Clock className={styles.convTimeIcon} strokeWidth={1.5} />
                    <span className={styles.convTime}>
                      {relativeTime(s.updatedAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
