'use client';

import React from 'react';
import type { AgentMessage } from '@/types/agent';

interface ChatMessageProps {
  message: AgentMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  return (
    <div className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}>
      {/* 角色标识 */}
      <div className="text-xs text-gray-500 mb-1">
        {isUser ? '👤 你' : isTool ? '🔧 工具' : '🤖 Agent'}
      </div>

      {/* 消息气泡 */}
      <div
        className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : isTool
              ? 'bg-yellow-100 text-gray-800 rounded-bl-md font-mono text-xs'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {message.content}

        {/* 如果 Agent 调用了工具，显示工具调用信息 */}
        {message.toolCall && (
          <div className="mt-2 pt-2 border-t border-gray-300 text-xs opacity-75">
            🔧 调用了工具: {message.toolCall.name}
          </div>
        )}
      </div>
    </div>
  );
}
