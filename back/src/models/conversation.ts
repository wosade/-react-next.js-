/**
 * 会话模型 — 纯数据库 CRUD
 */
import pool from '../lib/db.js';
import { generateId, nowISO } from '../lib/utils.js';
import type { Conversation, ConversationDetail, Message } from '../types/index.js';

// ========== 数据库行类型（snake_case） ==========

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  last_message: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  created_at: string;
}

// ========== 行 → 业务对象 ==========

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    lastMessage: row.last_message,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Message['role'],
    content: row.content,
    toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    createdAt: row.created_at,
  };
}

// ========== 会话 CRUD ==========

/** 查询指定用户的所有会话（按更新时间倒序） */
export async function findAllConversations(userId: string): Promise<Conversation[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
  );
  return (rows as ConversationRow[]).map(toConversation);
}

/** 根据 ID 获取单个会话详情（含消息列表） */
export async function findConversationById(id: string): Promise<ConversationDetail | null> {
  const [convRows] = await pool.execute(
    'SELECT * FROM conversations WHERE id = ?',
    [id],
  );
  const convList = convRows as ConversationRow[];
  if (convList.length === 0) return null;

  const [msgRows] = await pool.execute(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [id],
  );

  return {
    ...toConversation(convList[0]),
    messages: (msgRows as MessageRow[]).map(toMessage),
  };
}

/** 创建新会话 */
export async function createConversation(userId: string, title?: string): Promise<Conversation> {
  const id = generateId();
  const now = nowISO();

  await pool.execute(
    'INSERT INTO conversations (id, user_id, title, last_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, title ?? '新对话', '', now, now],
  );

  return { id, title: title ?? '新对话', lastMessage: '', updatedAt: now };
}

/** 更新会话 */
export async function updateConversation(
  id: string,
  data: Partial<Pick<Conversation, 'title' | 'lastMessage'>>,
): Promise<Conversation | null> {
  const fields: string[] = [];
  const values: string[] = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.lastMessage !== undefined) {
    fields.push('last_message = ?');
    values.push(data.lastMessage);
  }
  if (fields.length === 0) return findConversationById(id);

  const now = nowISO();
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await pool.execute(
    `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  return findConversationById(id);
}

/** 删除会话 */
export async function deleteConversation(id: string): Promise<boolean> {
  const [result] = await pool.execute('DELETE FROM conversations WHERE id = ?', [id]);
  return (result as any).affectedRows > 0;
}

// ========== 消息 CRUD ==========

/** 获取会话的消息列表 */
export async function findMessages(conversationId: string): Promise<Message[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId],
  );
  return (rows as MessageRow[]).map(toMessage);
}

/** 添加消息到会话 */
export async function addMessage(
  conversationId: string,
  msg: Pick<Message, 'role' | 'content' | 'toolCalls'>,
): Promise<Message | null> {
  // 确认会话存在
  const [convRows] = await pool.execute(
    'SELECT id FROM conversations WHERE id = ?',
    [conversationId],
  );
  if ((convRows as any[]).length === 0) return null;

  const id = generateId();
  const now = nowISO();

  await pool.execute(
    'INSERT INTO messages (id, conversation_id, role, content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, conversationId, msg.role, msg.content, msg.toolCalls ? JSON.stringify(msg.toolCalls) : null, now],
  );

  // 同步更新会话的 lastMessage
  const preview = msg.content.slice(0, 20) + (msg.content.length > 20 ? '…' : '');
  await pool.execute(
    'UPDATE conversations SET last_message = ?, updated_at = ? WHERE id = ?',
    [preview, now, conversationId],
  );

  return {
    id,
    conversationId,
    role: msg.role,
    content: msg.content,
    toolCalls: msg.toolCalls,
    createdAt: now,
  };
}
