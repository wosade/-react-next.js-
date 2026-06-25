import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from '@/shared/components/RequireAuth';
import MainLayout from '@/shared/layouts/MainLayout';
import ChatLayout from '@/shared/layouts/ChatLayout';
import EmptyState from '@/features/chat/pages/empty';
import LoginPage from '@/features/auth/pages/login';
import RegisterPage from '@/features/auth/pages/register';
import ChatWindow from '@/features/chat/pages/window';
import SettingsPage from '@/features/settings/pages';
import ToolsPage from '@/features/tools/pages';
import NotFoundPage from '@/features/misc/pages/not-found';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route path="/chat" element={<ChatLayout />}>
          <Route index element={<EmptyState />} />
          <Route path=":sessionId" element={<ChatWindow />} />
        </Route>

        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/chat" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}