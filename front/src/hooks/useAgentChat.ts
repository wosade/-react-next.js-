'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AgentMessage, ToolCall, Conversation } from '@/types/agent';
import { generateId } from '@/lib/utils';
import type { ToolOption } from '@/components/agent/ChatInput';
import { fetchConversations, createConversation as createConversationApi } from '@/services/conversationApi';

/** 可用工具列表 */
export const AVAILABLE_TOOLS: ToolOption[] = [
  { name: 'search', label: '搜索', icon: '🔍' },
  { name: 'database', label: '数据库', icon: '🗄️' },
  { name: 'email', label: '邮件', icon: '📧' },
  { name: 'calendar', label: '日历', icon: '📅' },
];

export function useAgentChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  /** 初始化：从后端加载会话列表 */
  useEffect(() => {
    fetchConversations()
      .then(setConversations)
      .catch((err) => console.error('加载会话列表失败:', err));
  }, []);

  /** 切换工具选中 */
  const handleToggleTool = useCallback((name: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  /** 新建对话 */
  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await createConversationApi();
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setIsLoading(false);
    } catch (err) {
      console.error('创建会话失败:', err);
    }
  }, []);

  /** 选择历史会话 */
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setMessages([]);
    setIsLoading(false);
  }, []);

  /** 发送消息 */
  const handleSend = useCallback(
    async (content: string) => {
      let convId = activeConvId;

      // 还没有会话则先创建一个
      if (!convId) {
        try {
          const conv = await createConversationApi();
          setConversations((prev) => [conv, ...prev]);
          convId = conv.id;
          setActiveConvId(convId);
        } catch (err) {
          console.error('自动创建会话失败:', err);
          return;
        }
      }

      // 用户消息
      const userMsg: AgentMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // 更新侧边栏
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                title: content.slice(0, 20) + (content.length > 20 ? '…' : ''),
                lastMessage: content,
                updatedAt: Date.now(),
              }
            : c,
        ),
      );

      // 模拟 Agent 处理（后续替换为 SSE 调用）
      await new Promise((r) => setTimeout(r, 800));

      const toolCalls: ToolCall[] = Array.from(selectedTools).map((toolName) => ({
        id: generateId(),
        name: toolName,
        args: { query: content },
        result: { status: 'ok', data: `来自 ${toolName} 工具的模拟结果` },
        status: 'done' as const,
      }));

      const agentMsg: AgentMessage = {
        id: generateId(),
        role: 'agent',
        content: `已收到你的消息：「${content}」\n\n${
          toolCalls.length > 0
            ? `调用了 ${toolCalls.length} 个工具来查询相关信息，以下是执行结果。`
            : '未启用任何工具，直接回复。'
        }`,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, agentMsg]);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, updatedAt: Date.now() } : c,
        ),
      );

      setIsLoading(false);
    },
    [activeConvId, selectedTools],
  );

  /** 点示例快速填入 */
  const handleExampleClick = useCallback(
    (example: string) => {
      handleSend(example);
    },
    [handleSend],
  );

  return {
    conversations,
    activeConvId,
    activeConv,
    messages,
    isLoading,
    selectedTools,
    handleToggleTool,
    handleNewConversation,
    handleSelectConversation,
    handleSend,
    handleExampleClick,
  };
}
