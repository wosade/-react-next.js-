'use client';

import React from 'react';
import LoginForm from '@/components/forms/LoginForm';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async (username: string, password: string) => {
    // TODO: 实际的登录逻辑，调用 API
    console.log('登录信息:', { username, password });
    
    // 模拟登录成功，跳转到首页
    setTimeout(() => {
      router.push('/');
    }, 1000);
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

        <LoginForm onLogin={handleLogin} />

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
