import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Square, Bot, User } from 'lucide-react';
import { fetchConversation } from '@/features/chat/api/conversation';
import ToolCallCard from '@/features/chat/components/ToolCallCard';
import type { ToolCall } from '@/shared/types';
import styles from './index.module.less';
import { fetchEventSource } from '@microsoft/fetch-event-source';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export default function ChatWindow() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // load history on session change
  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setInput('');

    if (!sessionId) {
      setMessages([]);
      return;
    }
    fetchConversation(sessionId)
      .then((conv: any) => {
        const list = conv.messages ?? [];
        setMessages(
          list.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
            toolCalls: m.steps?.map((s: any, i: number) => ({
              id: `${m.id}-step-${i}`,
              name: s.toolName,
              args: s.toolInput,
              result: s.toolOutput,
              status: s.status === 'success' ? 'done' as const : 'error' as const,
            })),
          })),
        );
        scrollDown();
      })
      .catch(console.error);
  }, [sessionId]);

  const scrollDown = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  // ---- send message via SSE ----
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    setInput('');

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content, timestamp: Date.now() };
    const agentId = `a-${Date.now()}`;
    const agentMsg: Message = { id: agentId, role: 'agent', content: '', timestamp: Date.now(), toolCalls: [] };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setLoading(true);
    scrollDown();

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let text = '';

    try {
      await fetchEventSource('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ message: content, conversationId: sessionId }),
        signal: ctrl.signal,
        onmessage(e) {
          const data = JSON.parse(e.data);

          if (data.type === 'content' && data.content) {
            text += data.content;
            setMessages((prev) =>
              prev.map((m) => (m.id === agentId ? { ...m, content: text } : m)),
            );
          }

          if (data.type === 'tool_step' && data.step) {
            const tc: ToolCall = {
              id: `${agentId}-step-${Date.now()}`,
              name: data.step.toolName,
              args: data.step.toolInput,
              result: data.step.toolOutput,
              status: data.step.status === 'success' ? 'done' : 'error',
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentId
                  ? { ...m, toolCalls: [...(m.toolCalls ?? []), tc] }
                  : m,
              ),
            );
          }
        },
        onerror(err) { throw err; },
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.filter((m) => m.id !== agentId).concat({
          id: `e-${Date.now()}`,
          role: 'agent',
          content: `请求失败: ${err.message}`,
          timestamp: Date.now(),
        }),
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
      scrollDown();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };

  // auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---- render ----
  return (
    <div className={styles.wrapper}>
      {/* messages */}
      <div className={styles.messages}>
        {messages.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <span className={styles.emptyMark}>▣</span>
            <h3 className={styles.emptyTitle}>开始对话</h3>
            <p className={styles.emptyHint}>向 AI 助手提问，它可以搜索知识库、查询数据、获取天气</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? styles.rowRight : styles.rowLeft}>
            {msg.role === 'agent' && (
              <div className={styles.avatar}><Bot size={16} /></div>
            )}

            <div className={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAgent}>
              {msg.content && <div className={styles.bubbleText}>{msg.content}</div>}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className={styles.toolCalls}>
                  {msg.toolCalls.map((tc) => (
                    <ToolCallCard key={tc.id} toolCall={tc} />
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className={styles.avatarUser}><User size={16} /></div>
            )}
          </div>
        ))}

        {/* thinking indicator */}
        {loading && (
          <div className={styles.rowLeft}>
            <div className={styles.avatar}><Bot size={16} /></div>
            <div className={styles.thinkingBar}>
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className={styles.inputBar}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          rows={1}
          className={styles.textarea}
          disabled={loading}
        />
        {loading ? (
          <button onClick={handleStop} className={styles.btnStop} title="停止生成">
            <Square size={16} />
          </button>
        ) : (
          <button onClick={handleSend} disabled={!input.trim()} className={styles.btnSend} title="发送">
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
