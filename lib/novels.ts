import { getDatabase } from './database';

export interface Novel {
  id: string;
  title: string;
  description?: string;
  author?: string;
  cover_image?: string;
  project_path?: string;
  status: 'active' | 'archived' | 'draft';
  created_at: string;
  updated_at: string;
}

// 生成 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// 创建小说
export function createNovel(
  title: string,
  options?: {
    description?: string;
    author?: string;
    projectPath?: string;
  }
): Novel {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO novels (id, title, description, author, project_path, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, title, options?.description || null, options?.author || null, options?.projectPath || null, now, now);

  return {
    id,
    title,
    description: options?.description,
    author: options?.author,
    project_path: options?.projectPath,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

// 获取所有小说
export function getNovels(status?: 'active' | 'archived' | 'draft'): Novel[] {
  const db = getDatabase();

  if (status) {
    return db.prepare('SELECT * FROM novels WHERE status = ? ORDER BY updated_at DESC').all(status) as Novel[];
  }

  return db.prepare('SELECT * FROM novels ORDER BY updated_at DESC').all() as Novel[];
}

// 获取单个小说
export function getNovel(novelId: string): Novel | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM novels WHERE id = ?').get(novelId) as Novel | null;
}

// 更新小说
export function updateNovel(
  novelId: string,
  updates: Partial<Pick<Novel, 'title' | 'description' | 'author' | 'cover_image' | 'project_path' | 'status'>>
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.author !== undefined) {
    fields.push('author = ?');
    values.push(updates.author);
  }
  if (updates.cover_image !== undefined) {
    fields.push('cover_image = ?');
    values.push(updates.cover_image);
  }
  if (updates.project_path !== undefined) {
    fields.push('project_path = ?');
    values.push(updates.project_path);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(novelId);

  db.prepare(`
    UPDATE novels 
    SET ${fields.join(', ')}
    WHERE id = ?
  `).run(...values);
}

// 删除小说（软删除，设置为 archived）
export function deleteNovel(novelId: string): void {
  updateNovel(novelId, { status: 'archived' });
}

// 永久删除小说
export function permanentlyDeleteNovel(novelId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM novels WHERE id = ?').run(novelId);
}

// 获取小说统计
export function getNovelStats(novelId: string): {
  chapterCount: number;
  totalWords: number;
  characterCount: number;
  foreshadowingCount: number;
} {
  const db = getDatabase();

  const chapterStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(word_count), 0) as total_words 
    FROM chapters WHERE novel_id = ?
  `).get(novelId) as any;

  const characterCount = (db.prepare('SELECT COUNT(*) as count FROM characters WHERE novel_id = ?').get(novelId) as any).count;
  const foreshadowingCount = (db.prepare('SELECT COUNT(*) as count FROM foreshadowing WHERE novel_id = ?').get(novelId) as any).count;

  return {
    chapterCount: chapterStats.count,
    totalWords: chapterStats.total_words,
    characterCount,
    foreshadowingCount,
  };
}

// 获取默认小说（如果只有一个小说，自动返回它）
export function getDefaultNovel(): Novel | null {
  const db = getDatabase();
  const novels = db.prepare("SELECT * FROM novels WHERE status = 'active' ORDER BY created_at ASC").all() as Novel[];

  if (novels.length === 0) {
    // 如果没有小说，创建一个默认的
    return createNovel('开局屠村现场-他们说我疯了', {
      description: '网络小说',
      author: 'mchenziyi',
    });
  }

  return novels[0];
}

// 确保默认小说存在
export function ensureDefaultNovel(): string {
  const defaultNovel = getDefaultNovel();
  return defaultNovel?.id || 'default';
}
