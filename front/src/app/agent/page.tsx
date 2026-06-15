'use client';

import React, { useState } from 'react';
import ChatMessage from '@/components/agent/ChatMessage';
import ChatInput from '@/components/agent/ChatInput';
import type { AgentMessage } from '@/types/agent';

export default function AgentPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (input: string) => {
    // 1. 添加用户消息
    const userMessage: AgentMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // 2. 模拟 Agent 思考（后续替换成真正的工具调用逻辑）
    setTimeout(() => {
      const agentReply: AgentMessage = {
        role: 'agent',
        content: `收到！你说了: "${input}"`,
      };
      setMessages((prev) => [...prev, agentReply]);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">🤖 Agent 对话</h1>
          <p className="text-sm text-gray-500 mt-1">
            与 AI Agent 对话，它会调用工具帮你完成任务
          </p>
        </div>
      </header>

      {/* 消息区域 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
          {/* 消息列表 */}
          <div className="flex-1 p-6 overflow-y-auto space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-lg">开始一段对话吧</p>
                <p className="text-sm mt-1">试试说 &quot;帮我查一下用户信息&quot;</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="text-left">
                <div className="inline-block px-4 py-2 rounded-2xl bg-gray-100 text-gray-500">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 输入区域 */}
          <div className="border-t border-gray-200 p-4">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
