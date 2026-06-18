import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import request from '@/api/request';
import styles from './ChatWindow.module.less';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export default function ChatWindow() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** sessionId 变化时重新拉取消息 */
  useEffect(() => {
    if (!sessionId) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await request.get<{ data: Message[] }>(
          `/sessions/${sessionId}/messages`,
        );
        setMessages(res.data.data);
      } catch (err) {
        console.error('加载消息失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [sessionId]);

  /** 自动滚动到底部 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;
    const content = input.trim();
    setInput('');

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // TODO: 后续替换为 SSE 流式调用
      const res = await request.post<{ data: Message }>(
        `/sessions/${sessionId}/messages`,
        { content },
      );
      setMessages((prev) => [...prev, res.data.data]);
    } catch (err) {
      console.error('发送消息失败:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* 消息列表 */}
      <div className={styles.messageList}>
        {loading && messages.length === 0 ? (
          <p className={styles.loadingHint}>加载中…</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === 'user' ? styles.userMsg : styles.agentMsg
              }
            >
              <div className={styles.bubble}>{msg.content}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入栏 */}
      <div className={styles.inputBar}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          rows={1}
          className={styles.textarea}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={styles.sendBtn}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
