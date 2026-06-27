import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import request from '@/api/request';
import styles from './index.module.less';
import {fetchEventSource} from '@microsoft/fetch-event-source'
import { Button, message } from 'antd'

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
        body:JSON.stringify({message:content}),
        signal:Controller.signal,
        onmessage(e){
          const data=JSON.parse(e.data);
          if(data.content){
            fullcontent+=data.content
            agentMessage.content=fullcontent
            setMessages((perv)=>
              perv.map(item=>item.id===agentMessage.id?agentMessage:item)
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
