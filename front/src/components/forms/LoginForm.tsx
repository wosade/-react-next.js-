'use client';

import React, { useState } from 'react';

interface LoginFormProps {
  onLogin: (username: string, password: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onLogin(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
          用户名
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="请输入用户名"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          密码
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="请输入密码"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200 active:scale-98"
      >
        {isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
