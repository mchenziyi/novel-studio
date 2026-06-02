import { getDatabase } from './database';

export interface ChatSession {
  id: string;
  title: string;
  chapter_id?: string;
  context: 'write' | 'edit' | 'brainstorm' | 'analyze';
  model?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string;
  created_at: string;
}

// 生成 UUID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// 创建会话
export function createChatSession(
  title: string,
  chapterId?: string,
  context: string = 'brainstorm',
  model?: string
): ChatSession {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO chat_sessions (id, title, chapter_id, context, model, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, chapterId || null, context, model || null, now, now);

  return {
    id,
    title,
    chapter_id: chapterId,
    context: context as ChatSession['context'],
    model,
    created_at: now,
    updated_at: now,
  };
}

// 获取会话列表
export function getChatSessions(chapterId?: string, novelId?: string, includeDeleted: boolean = false): ChatSession[] {
  const db = getDatabase();

  const deletedCondition = includeDeleted ? '' : 'AND deleted_at IS NULL';
  const novelCondition = novelId ? 'AND novel_id = ?' : '';
  const novelParams = novelId ? [novelId] : [];

  if (chapterId) {
    return db.prepare(`
      SELECT * FROM chat_sessions 
      WHERE chapter_id = ? ${deletedCondition} ${novelCondition}
      ORDER BY updated_at DESC
    `).all(chapterId, ...novelParams) as ChatSession[];
  }

  return db.prepare(`
    SELECT * FROM chat_sessions 
    WHERE 1=1 ${deletedCondition} ${novelCondition}
    ORDER BY updated_at DESC
  `).all(...novelParams) as ChatSession[];
}

// 获取单个会话
export function getChatSession(sessionId: string): ChatSession | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(sessionId) as ChatSession | null;
}

// 更新会话
export function updateChatSession(
  sessionId: string,
  updates: Partial<Pick<ChatSession, 'title' | 'context' | 'model'>>
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.context !== undefined) {
    fields.push('context = ?');
    values.push(updates.context);
  }
  if (updates.model !== undefined) {
    fields.push('model = ?');
    values.push(updates.model);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(sessionId);

  db.prepare(`
    UPDATE chat_sessions 
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...values);
}

// 删除会话（软删除）
export function deleteChatSession(sessionId: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare('UPDATE chat_sessions SET deleted_at = ? WHERE id = ?').run(now, sessionId);
}

// 恢复已删除的会话
export function restoreChatSession(sessionId: string): void {
  const db = getDatabase();
  db.prepare('UPDATE chat_sessions SET deleted_at = NULL WHERE id = ?').run(sessionId);
}

// 永久删除会话（硬删除）
export function permanentlyDeleteChatSession(sessionId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(sessionId);
}

// 添加消息
export function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: Record<string, any>
): ChatMessage {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  const metadataStr = metadata ? JSON.stringify(metadata) : null;

  db.prepare(`
    INSERT INTO chat_messages (id, session_id, role, content, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, sessionId, role, content, metadataStr, now);

  // 更新会话的 updated_at
  db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);

  return {
    id,
    session_id: sessionId,
    role,
    content,
    metadata: metadataStr || undefined,
    created_at: now,
  };
}

// 获取会话的消息
export function getChatMessages(sessionId: string): ChatMessage[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM chat_messages 
    WHERE session_id = ? 
    ORDER BY created_at ASC
  `).all(sessionId) as ChatMessage[];
}

// 获取会话的最后 N 条消息
export function getRecentMessages(sessionId: string, limit: number = 50): ChatMessage[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM chat_messages 
    WHERE session_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(sessionId, limit).reverse() as ChatMessage[];
}

// 自动生成会话标题（取用户第一条消息的前 30 个字符）
export function generateSessionTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/[\n\r]/g, ' ').trim();
  if (cleaned.length <= 30) {
    return cleaned;
  }
  return cleaned.substring(0, 30) + '...';
}

// 获取章节相关的所有会话消息（用于 Agent 学习）
export function getChapterChatHistory(chapterId: string): Array<{
  session: ChatSession;
  messages: ChatMessage[];
}> {
  const sessions = getChatSessions(chapterId);
  return sessions.map(session => ({
    session,
    messages: getChatMessages(session.id),
  }));
}
