import { useState, useRef } from 'react';
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

  /** 自动滚动到底部 */
  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    setLoading(true);
    try {
      const res = await request.post<{ reply: string }>('/chat/send', {
        message: content,
      });

      const agentMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'agent',
        content: res.data.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'agent',
        content: `❌ 调用失败: ${err?.response?.data?.error || err?.message || '未知错误'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
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
        {messages.length === 0 && !loading && (
          <p className={styles.loadingHint}>
            👋 开始对话吧，输入消息后按 Enter 发送
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === 'user' ? styles.userMsg : styles.agentMsg
            }
          >
            <div className={styles.bubble}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className={styles.agentMsg}>
            <div className={styles.bubble}>⏳ 思考中…</div>
          </div>
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
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className={styles.sendBtn}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
