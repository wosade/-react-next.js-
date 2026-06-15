'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: 实际的登录逻辑，调用 API
      console.log('登录信息:', { username, password });
      
      // 模拟登录成功，跳转到首页
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">智能记账系统</h1>
          <p className="text-gray-600 mt-2">AI 语音 + 小票识别</p>
        </div>

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

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            还没有账号？{' '}
            <a href="#" className="text-blue-600 hover:underline font-medium">
              立即注册
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
