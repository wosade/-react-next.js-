import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import styles from './ChatInput.module.less';

export interface ToolOption {
  name: string;
  label: string;
  icon?: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  tools?: ToolOption[];
  selectedTools?: Set<string>;
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

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.wrapper}>
      {tools.length > 0 && (
        <div className={styles.toolBar}>
          {tools.map((tool) => (
            <button
              key={tool.name}
              className={`${styles.toolChip} ${
                selectedTools.has(tool.name) ? styles.toolChipActive : ''
              }`}
              onClick={() => onToggleTool?.(tool.name)}
              disabled={disabled}
            >
              {tool.icon && <span className={styles.toolIcon}>{tool.icon}</span>}
              {tool.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          rows={1}
          className={styles.textarea}
          disabled={disabled}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          className={styles.sendBtn}
        >
          {disabled ? <Loader2 className={styles.spinIcon} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}