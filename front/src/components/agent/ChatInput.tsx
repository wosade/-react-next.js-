'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import styles from './ChatInput.module.less';

/** 可用工具的定义 */
export interface ToolOption {
  name: string;
  label: string;
  icon?: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  /** 可用工具列表 */
  tools?: ToolOption[];
  /** 当前选中的工具名称集合 */
  selectedTools?: Set<string>;
  /** 切换工具选中状态 */
  onToggleTool?: (name: string) => void;
}

export default function ChatInput({
  onSend,
  disabled,
  tools = [],
  selectedTools = new Set(),
  onToggleTool,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 自动调整 textarea 高度 */
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  /** 发送消息后重新聚焦 */
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* 工具标签行 */}
      {tools.length > 0 && (
        <div className={styles.toolsRow}>
          <span className={styles.toolsLabel}>工具:</span>
          {tools.map((tool) => {
            const isSelected = selectedTools.has(tool.name);
            return (
              <button
                key={tool.name}
                onClick={() => onToggleTool?.(tool.name)}
                disabled={disabled}
                className={isSelected ? styles.toolBtnSelected : styles.toolBtn}
              >
                {tool.icon && <span>{tool.icon}</span>}
                {tool.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 输入框 + 发送按钮 */}
      <div className={styles.inputRow}>
        {/* 输入框 */}
        <div className={styles.inputWrapper}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={disabled ? 'Agent 正在思考…' : '输入消息，Enter 发送，Shift+Enter 换行'}
            className={styles.textarea}
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className={styles.sendBtn}
          aria-label="发送消息"
        >
          {disabled ? (
            <Loader2 className={styles.spinIcon} size={20} strokeWidth={2} />
          ) : (
            <Send size={20} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
