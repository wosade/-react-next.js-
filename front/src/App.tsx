import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from '@/components/RequireAuth';
import MainLayout from '@/layouts/MainLayout';
import ChatLayout from '@/layouts/ChatLayout';
import EmptyState from '@/features/chat/EmptyState';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ChatWindow from '@/features/chat/ChatWindow';
import SettingsPage from '@/features/settings/SettingsPage';
import ToolsPage from '@/features/tools/ToolsPage';
import NotFoundPage from '@/features/misc/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* 不需要登录的页面 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 需要登录的页面 */}
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        {/* /chat 嵌套路由：Sidebar + Outlet */}
        <Route path="/chat" element={<ChatLayout />}>
          <Route index element={<EmptyState />} />
          <Route path=":sessionId" element={<ChatWindow />} />
        </Route>

        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
      </Route>

      {/* / 重定向到 /chat */}
      <Route path="/" element={<Navigate to="/chat" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
