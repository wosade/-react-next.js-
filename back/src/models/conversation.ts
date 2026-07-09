/**
 * 会话模型 — 纯数据库 CRUD
 *
 * 缓存策略：
 * - findAllConversations(userId): 读缓存
 * - findConversationById(id): 读缓存
 * - createConversation: 失效该用户会话列表缓存
 * - updateConversation: 失效该会话详情缓存和用户列表缓存
 * - deleteConversation: 失效该会话详情缓存和用户列表缓存
 */
import pool from '../lib/db.js';
import { generateId, nowISO } from '../lib/utils.js';
import { cacheGet, cacheDel } from '../lib/cache.js';
import { log } from '../lib/logger.js';
import type { Conversation, ConversationDetail, Message } from '../types/index.js';

const TTL_LIST = 300; // 会话列表 5 分钟
const TTL_DETAIL = 300; // 会话详情 5 分钟

function convListKey(userId: string) {
  return `conv:list:${userId}`;
}

function convDetailKey(id: string) {
  return `conv:detail:${id}`;
}

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
    toolCalls: row.tool_calls
      ? (typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls)
      : undefined,
    createdAt: row.created_at,
  };
}

// ========== 会话 CRUD ==========

/** 查询指定用户的所有会话（按更新时间倒序） */
export async function findAllConversations(userId: string): Promise<Conversation[]> {
  return cacheGet(
    convListKey(userId),
    async () => {
      const [rows] = await pool.execute(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
        [userId],
      );
      return (rows as ConversationRow[]).map(toConversation);
    },
    TTL_LIST,
  );
}

/** 根据 ID 获取单个会话详情（含消息列表） */
export async function findConversationById(id: string): Promise<ConversationDetail | null> {
  return cacheGet(
    convDetailKey(id),
    async () => {
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
    },
    TTL_DETAIL,
  );
}

/** 创建新会话 */
export async function createConversation(userId: string, title?: string): Promise<Conversation> {
  const id = generateId();
  const now = nowISO();

  await pool.execute(
    'INSERT INTO conversations (id, user_id, title, last_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, title ?? '新对话', '', now, now],
  );

  // 新创建会话 → 失效用户会话列表缓存
  await cacheDel(convListKey(userId));

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

  // 更新 → 失效会话详情缓存和用户列表缓存
  await cacheDel(convDetailKey(id));
  // 获取 user_id 用于失效列表缓存
  const [convRows] = await pool.execute(
    'SELECT user_id FROM conversations WHERE id = ?',
    [id],
  );
  const convList = convRows as any[];
  if (convList.length > 0) {
    await cacheDel(convListKey(convList[0].user_id));
  }

  return findConversationById(id);
}

/** 删除会话 */
export async function deleteConversation(id: string): Promise<boolean> {
  // 先查获取 user_id 用于失效缓存
  const [convRows] = await pool.execute(
    'SELECT user_id FROM conversations WHERE id = ?',
    [id],
  );
  const convList = convRows as any[];
  const userId = convList.length > 0 ? convList[0].user_id : null;

  // 删除消息
  await pool.execute('DELETE FROM messages WHERE conversation_id = ?', [id]);
  const [result] = await pool.execute('DELETE FROM conversations WHERE id = ?', [id]);
  const changed = (result as any).affectedRows > 0;

  // 删除 → 失效会话详情和用户列表缓存
  await cacheDel(convDetailKey(id));
  if (userId) {
    await cacheDel(convListKey(userId));
  }

  return changed;
}

// ========== 消息 CRUD ==========

/** 获取会话的消息列表 */
export async function findMessages(conversationId: string): Promise<Message[]> {
  // 消息列表已经缓存在 findConversationById 的 detail 缓存中
  // 单独调用时不缓存（单独调用场景极少）
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
    'SELECT id, user_id FROM conversations WHERE id = ?',
    [conversationId],
  );
  const convList = convRows as any[];
  if (convList.length === 0) return null;
  const { user_id: userId } = convList[0];

  const id = generateId();
  const now = nowISO();

  const res = await pool.execute(
    'INSERT INTO messages (id, conversation_id, role, content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, conversationId, msg.role, msg.content, msg.toolCalls ? JSON.stringify(msg.toolCalls) : null, now],
  );
  log.info(res);

  // 同步更新会话的 lastMessage
  const preview = msg.content.slice(0, 20) + (msg.content.length > 20 ? '…' : '');
  await pool.execute(
    'UPDATE conversations SET last_message = ?, updated_at = ? WHERE id = ?',
    [preview, now, conversationId],
  );

  // 添加消息 → 消息已变更 → 失效会话详情缓存和用户列表缓存
  await cacheDel(convDetailKey(conversationId));
  await cacheDel(convListKey(userId));

  return {
    id,
    conversationId,
    role: msg.role,
    content: msg.content,
    toolCalls: msg.toolCalls,
    createdAt: now,
  };
}