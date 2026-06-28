import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { fetchConversation } from '@/features/chat/api/conversation';
import ToolCallCard from '@/features/chat/components/ToolCallCard';
import type { ToolCall } from '@/shared/types';
import styles from './index.module.less';
import {fetchEventSource} from '@microsoft/fetch-event-source'

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

  // 切换会话时加载历史消息
  useEffect(() => {
    if (!sessionId) return;
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
        scrollToBottom();
      })
      .catch((err) => console.error('加载会话详情失败:', err));
  }, [sessionId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
// 元素变页面不渲染
  const abortRef = useRef<AbortController | null>(null);

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
    // 创建 agent返回的消息
    const agentId=`a-${Date.now()}`;
    // 存单条agent的消息
    const agentMessage:Message={
      id:agentId,
      role:'agent',
      content:'',
      timestamp:Date.now(),
    }
    setMessages((prev)=>[...prev,agentMessage])
    setLoading(true);
    // 用fetch-eventsoruce实现ai流式对话效果
    const Controller=new AbortController()
    abortRef.current=Controller
    let fullcontent=""
    try{
      await fetchEventSource('/api/chat/send',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${localStorage.getItem('token')}` 
        },
        body:JSON.stringify({message:content, conversationId: sessionId}),
        signal:Controller.signal,
        onmessage(e){
          const data=JSON.parse(e.data);
          // 流式文本
          if(data.type === 'content' && data.content){
            fullcontent+=data.content
            agentMessage.content=fullcontent
            setMessages((prev)=>
              prev.map(item=>item.id===agentMessage.id?{...agentMessage}:item)
            )
          }
          // 工具步骤
          if(data.type === 'tool_step' && data.step){
            const tc: ToolCall = {
              id: `${agentId}-step-${Date.now()}`,
              name: data.step.toolName,
              args: data.step.toolInput,
              result: data.step.toolOutput,
              status: data.step.status === 'success' ? 'done' : 'error',
            };
            agentMessage.toolCalls = [...(agentMessage.toolCalls ?? []), tc];
            setMessages((prev)=>
              prev.map(item=>item.id===agentMessage.id?{...agentMessage, toolCalls: agentMessage.toolCalls}:item)
            )
          }
        },
        onerror(error){
          throw error
        }
      })
    } catch(error:any){
      if(error.name==='AbortError'){
        return
      }
      setMessages((prev)=>[
        ...prev.filter(item=>item.id!==agentMessage.id),
        {
          id:`e-${Date.now}`,
          role:'agent',
          content:`调用失败:${error.message}`,
          timestamp:Date.now()
        }
      ]
      )
    }finally{
      setLoading(false)
      abortRef.current.abort()
      abortRef.current=null;
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
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {msg.toolCalls.map((tc) => (
                  <ToolCallCard key={tc.id} toolCall={tc} />
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className={styles.agentMsg}>
            <div className={styles.bubble}>⏳ 思考中…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

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
