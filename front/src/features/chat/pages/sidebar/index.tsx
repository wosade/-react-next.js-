import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, MessageSquare, Clock, Leaf, Trash2 } from 'lucide-react';
import { fetchConversations, createConversation, deleteConversation } from '@/features/chat/api/conversation';
import type { Conversation } from '@/shared/types';
import styles from './index.module.less';

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(isoString).toLocaleDateString('zh-CN');
}

export default function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const loadList = async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch (err) {
      console.error('加载会话列表失败:', err);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleNew = async () => {
    if (creating) return;
    try {
      setCreating(true);
      const conv = await createConversation();
      await loadList();
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      console.error('创建会话失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    await loadList();
    navigate('/chat');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <button onClick={handleNew} disabled={creating} className={styles.newChatBtn}>
          <Plus className={styles.plusIcon} strokeWidth={2} />
          {creating ? '创建中…' : '新建对话'}
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.list}>
        {conversations.length === 0 ? (
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
            {conversations.map((c) => {
              const isActive = sessionId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={isActive ? styles.convItemActive : styles.convItem}
                >
                  <div className={styles.convHeader}>
                    <MessageSquare
                      className={isActive ? styles.convIconActive : styles.convIcon}
                      size={14}
                    />
                    <span className={isActive ? styles.convTitleActive : styles.convTitleInactive}>
                      {c.title || '新对话'}
                    </span>
                  </div>
                  <p className={styles.convPreview}>{c.lastMessage || '暂无消息'}</p>
                  <div className={styles.convMeta}>
                    <Clock size={12} className={styles.convTimeIcon} />
                    <span className={styles.convTime}>{relativeTime(c.updatedAt)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      className={styles.deleteBtn}
                    >
                      <Trash2 size={12} />
                    </button>
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