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
      setConversations(await fetchConversations());
    } catch {
      // silent
    }
  };

  useEffect(() => { loadList(); }, []);

  const handleNew = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const conv = await createConversation();
      await loadList();
      navigate(`/chat/${conv.id}`);
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.head}>
        <h2 className={styles.headTitle}>历史对话</h2>
        <button onClick={handleNew} disabled={creating} className={styles.newBtn} title="新建对话">
          <Plus size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className={styles.listArea}>
        <ConversationList
          conversations={conversations}
          activeId={sessionId}
          onSelect={(id) => navigate(`/chat/${id}`)}
          onDelete={async (id) => {
            await deleteConversation(id);
            await loadList();
            if (sessionId === id) navigate('/chat');
          }}
        />
      </div>
    </aside>
  );
}
