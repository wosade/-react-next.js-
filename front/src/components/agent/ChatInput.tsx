'use client';

import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'Agent 思考中...' : '输入你的问题...'}
        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-all active:scale-95 disabled:cursor-not-allowed"
      >
        发送
      </button>
    </div>
  );
}
