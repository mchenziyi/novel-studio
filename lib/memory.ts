import { getDatabase } from './database';

export type MemoryCategory = 
  | 'character'      // 角色设定（性别、性格、关系等）
  | 'world_rule'     // 世界规则（设定、机制等）
  | 'writing_style'  // 写作风格（禁止的模式、推荐的方式等）
  | 'plot_rule'      // 剧情规则（时间线、逻辑等）
  | 'user_preference' // 用户偏好（喜欢什么、讨厌什么）
  | 'correction'     // 纠正记录（之前犯的错）
  | 'fact';          // 事实（从对话中学到的）

export interface Memory {
  id: string;
  novelId: string;
  category: MemoryCategory;
  key: string;        // 关键词/主题
  content: string;    // 记忆内容
  source?: string;    // 来源（从哪次对话学到的）
  importance: number; // 重要性 1-5
  useCount: number;   // 使用次数
  createdAt: string;
  updatedAt: string;
}

// 生成 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// 创建记忆
export function createMemory(
  novelId: string,
  category: MemoryCategory,
  key: string,
  content: string,
  source?: string,
  importance: number = 3
): Memory {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO memories (id, novel_id, category, key, content, source, importance, use_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, novelId, category, key, content, source || null, importance, now, now);

  return {
    id,
    novelId,
    category,
    key,
    content,
    source,
    importance,
    useCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// 获取所有记忆
export function getMemories(novelId: string, category?: MemoryCategory): Memory[] {
  const db = getDatabase();

  if (category) {
    return db.prepare(`
      SELECT * FROM memories 
      WHERE novel_id = ? AND category = ?
      ORDER BY importance DESC, use_count DESC
    `).all(novelId, category) as Memory[];
  }

  return db.prepare(`
    SELECT * FROM memories 
    WHERE novel_id = ?
    ORDER BY importance DESC, use_count DESC
  `).all(novelId) as Memory[];
}

// 搜索记忆
export function searchMemories(novelId: string, query: string): Memory[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM memories 
    WHERE novel_id = ? AND (key LIKE ? OR content LIKE ?)
    ORDER BY importance DESC, use_count DESC
  `).all(novelId, `%${query}%`, `%${query}%`) as Memory[];
}

// 获取相关记忆（根据关键词）
export function getRelevantMemories(novelId: string, keywords: string[]): Memory[] {
  const db = getDatabase();
  
  const conditions = keywords.map(() => '(key LIKE ? OR content LIKE ?)').join(' OR ');
  const params = [novelId, ...keywords.flatMap(k => [`%${k}%`, `%${k}%`])];

  return db.prepare(`
    SELECT * FROM memories 
    WHERE novel_id = ? AND (${conditions})
    ORDER BY importance DESC, use_count DESC
    LIMIT 20
  `).all(...params) as Memory[];
}

// 更新记忆
export function updateMemory(
  id: string,
  updates: Partial<Pick<Memory, 'content' | 'importance' | 'category'>>
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.importance !== undefined) {
    fields.push('importance = ?');
    values.push(updates.importance);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`
    UPDATE memories 
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...values);
}

// 增加使用次数
export function incrementMemoryUsage(id: string): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE memories 
    SET use_count = use_count + 1, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);
}

// 删除记忆
export function deleteMemory(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM memories WHERE id = ?').run(id);
}

// 格式化记忆为上下文
export function formatMemoriesForContext(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const grouped: Record<string, Memory[]> = {};
  memories.forEach(m => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  const categoryLabels: Record<string, string> = {
    character: '角色设定',
    world_rule: '世界规则',
    writing_style: '写作风格',
    plot_rule: '剧情规则',
  };

  let result = '## 已学习的知识\n\n';
  
  Object.entries(grouped).forEach(([category, items]) => {
    result += `### ${categoryLabels[category] || category}\n`;
    items.forEach(m => {
      result += `- **${m.key}**: ${m.content}\n`;
    });
    result += '\n';
  });

  return result;
}
