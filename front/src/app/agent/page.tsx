'use client';

import { useAgentChat, AVAILABLE_TOOLS } from '@/hooks/useAgentChat';
import ChatSidebar from '@/components/agent/ChatSidebar';
import ChatHeader from '@/components/agent/ChatHeader';
import ChatMessageList from '@/components/agent/ChatMessageList';
import ChatInput from '@/components/agent/ChatInput';
import styles from './agent.module.less';

export default function AgentPage() {
  const chat = useAgentChat();

  return (
    <div className={styles.page}>
      {/* 左侧边栏 */}
      <ChatSidebar
        conversations={chat.conversations}
        activeId={chat.activeConvId}
        onSelect={chat.handleSelectConversation}
        onNew={chat.handleNewConversation}
      />

      {/* 右侧主区域 */}
      <div className={styles.mainArea}>
        <ChatHeader
          title={chat.activeConv?.title ?? 'Agent 对话'}
          isProcessing={chat.isLoading}
          toolCount={chat.selectedTools.size}
        />

        <ChatMessageList
          messages={chat.messages}
          isLoading={chat.isLoading}
          onExampleClick={chat.handleExampleClick}
        />

        <div className={styles.footerBar}>
          <div className={styles.footerInner}>
            <ChatInput
              onSend={chat.handleSend}
              disabled={chat.isLoading}
              tools={AVAILABLE_TOOLS}
              selectedTools={chat.selectedTools}
              onToggleTool={chat.handleToggleTool}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
