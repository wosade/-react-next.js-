import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { fetchConversations, createConversation, deleteConversation } from '@/features/chat/api/conversation';
import type { Conversation } from '@/shared/types';
import ConversationList from './ConversationList';
import styles from './index.module.less';

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
        <ConversationList
          conversations={conversations}
          activeId={sessionId}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      </div>
    </aside>
  );
}