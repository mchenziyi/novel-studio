import fs from 'fs/promises';
import path from 'path';
import { Chapter, Character, Outline } from '@/types';
import { getDatabase } from './database';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

// 读取章节列表
export async function getChapters(novelId?: string): Promise<Chapter[]> {
  const db = getDatabase();
  let query = 'SELECT * FROM chapters';
  const params: string[] = [];
  
  if (novelId) {
    query += ' WHERE novel_id = ?';
    params.push(novelId);
  }
  
  query += ' ORDER BY CAST(id AS INTEGER)';
  
  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    content: row.content,
    wordCount: row.word_count,
    file: row.file,
    status: row.status,
    lastModified: row.last_modified ? new Date(row.last_modified) : undefined,
  }));
}

// 读取单个章节
export async function getChapter(id: string, novelId?: string): Promise<Chapter | null> {
  const db = getDatabase();
  let query = 'SELECT * FROM chapters WHERE id = ?';
  const params: any[] = [id];
  
  if (novelId) {
    query += ' AND novel_id = ?';
    params.push(novelId);
  }
  
  const row = db.prepare(query).get(...params) as any;
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    wordCount: row.word_count,
    file: row.file,
    status: row.status,
    lastModified: row.last_modified ? new Date(row.last_modified) : undefined,
  };
}

// 更新章节
export async function updateChapter(id: string, content: string, novelId?: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  let query = 'UPDATE chapters SET content = ?, word_count = ?, last_modified = ?, updated_at = ? WHERE id = ?';
  const params: any[] = [content, content.length, now, now, id];
  
  if (novelId) {
    query += ' AND novel_id = ?';
    params.push(novelId);
  }

  const result = db.prepare(query).run(...params);

  if (result.changes === 0) {
    throw new Error(`Chapter ${id} not found`);
  }

  // Also update the file system for backward compatibility
  try {
    const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
    const files = await fs.readdir(chaptersDir);
    for (const file of files) {
      if (file.startsWith(`${id}_`) && file.endsWith('.md')) {
        await fs.writeFile(path.join(chaptersDir, file), content, 'utf-8');
        break;
      }
    }
  } catch (error) {
    // File system update is optional
    console.warn('Failed to update file system:', error);
  }
}

// 创建新章节
// 创建章节
export async function createChapter(id: string, title: string, content: string, novelId: string = 'default'): Promise<Chapter> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const file = `${id}_${title}.md`;

  db.prepare('INSERT INTO chapters (id, novel_id, title, content, word_count, file, status, last_modified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, novelId, title, content, content.length, file, 'pending', now, now, now);

  // Also create the file
  try {
    const chaptersDir = path.join(PROJECT_ROOT, 'chapters');
    await fs.writeFile(path.join(chaptersDir, file), content, 'utf-8');
  } catch (error) {
    console.warn('Failed to create file:', error);
  }

  return { id, title, content, wordCount: content.length, file, status: 'pending', lastModified: new Date(now) };
}

// 删除章节
export async function deleteChapter(id: string): Promise<void> {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM chapters WHERE id = ?').run(id);

  if (result.changes === 0) {
    throw new Error(`Chapter ${id} not found`);
  }
}

// 读取角色列表
export async function getCharacters(novelId?: string): Promise<Character[]> {
  const db = getDatabase();
  let query = 'SELECT * FROM characters';
  const params: string[] = [];
  
  if (novelId) {
    query += ' WHERE novel_id = ?';
    params.push(novelId);
  }
  
  const rows = db.prepare(query).all(...params) as any[];

  return rows.map(row => {
    const relations = db.prepare('SELECT * FROM character_relations WHERE source_id = ?').all(row.id) as any[];
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      status: row.status,
      description: row.description || '',
      relations: relations.map(r => ({
        target: r.target_id,
        type: r.type,
        strength: r.strength,
        description: r.description,
      })),
      firstAppearance: row.first_appearance || 1,
      lastAppearance: row.last_appearance,
    };
  });
}

// 读取单个角色
export async function getCharacter(id: string): Promise<Character | null> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any;
  if (!row) return null;

  const relations = db.prepare('SELECT * FROM character_relations WHERE source_id = ?').all(id) as any[];
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    status: row.status,
    description: row.description || '',
    relations: relations.map(r => ({
      target: r.target_id,
      type: r.type,
      strength: r.strength,
      description: r.description,
    })),
    firstAppearance: row.first_appearance || 1,
    lastAppearance: row.last_appearance,
  };
}

// 读取伏笔列表
export async function getForeshadowing(novelId?: string): Promise<any[]> {
  const db = getDatabase();
  
  // 如果指定了 novelId，只从数据库读取
  if (novelId) {
    let query = 'SELECT * FROM foreshadowing WHERE novel_id = ? ORDER BY planted_chapter ASC';
    const rows = db.prepare(query).all(novelId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      description: row.description || '',
      plantedChapter: row.planted_chapter,
      resolvedChapter: row.resolved_chapter,
    }));
  }

  // 如果没有指定 novelId，从文件系统读取（兼容旧数据）
  try {
    const filePath = path.join(PROJECT_ROOT, '故事/伏笔池.md');
    const content = await fs.readFile(filePath, 'utf-8');
    return parseForeshadowing(content);
  } catch (error) {
    console.error('Failed to read foreshadowing:', error);
    return [];
  }
}

// 解析伏笔池
function parseForeshadowing(content: string): any[] {
  const lines = content.split('\n');
  const items: any[] = [];
  let currentSection = '';
  let headerSkipped = false;
  let separatorSkipped = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 检测章节标题
    if (trimmedLine.startsWith('## ')) {
      currentSection = trimmedLine.substring(3).trim();
      headerSkipped = false;
      separatorSkipped = false;
      continue;
    }

    // 跳过表头行
    if (trimmedLine.startsWith('|') && !headerSkipped && !trimmedLine.includes('---')) {
      headerSkipped = true;
      continue;
    }

    // 跳过分隔行
    if (trimmedLine.startsWith('|') && trimmedLine.includes('---')) {
      separatorSkipped = true;
      continue;
    }

    // 解析数据行
    if (trimmedLine.startsWith('|') && headerSkipped && separatorSkipped) {
      const cells = trimmedLine.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length < 3) continue;

      const item: any = {
        id: '',
        name: '',
        status: 'planted',
        plantedChapter: null,
        resolvedChapter: null,
        relatedChapters: [],
        description: '',
        section: currentSection,
      };

      if (currentSection.includes('章新增')) {
        // 67章新增格式: hook_id | 内容 | 状态 | src_fact
        item.id = cells[0] || `foreshadow-${items.length + 1}`;
        item.name = cells[1] || '';
        item.description = cells[1] || '';

        // 状态映射
        const statusValue = cells[2] || '';
        const statusMap: Record<string, string> = {
          'open': 'progressing',
          'dormant': 'planted',
          'foreshadowing': 'progressing',
        };
        item.status = statusMap[statusValue] || 'planted';

        // 从 hook_id 提取章节号
        const hookMatch = item.id.match(/hook-(\d+)-/);
        if (hookMatch) {
          item.plantedChapter = parseInt(hookMatch[1]);
        }
      } else if (currentSection.includes('活跃伏笔')) {
        // 活跃伏笔格式: hook_id | 类型 | 章节 | 内容摘要 | 状态 | 关联事实
        item.id = cells[0] || `foreshadow-${items.length + 1}`;

        // 章节号
        if (cells[2] && /^\d+$/.test(cells[2])) {
          item.plantedChapter = parseInt(cells[2]);
        }

        // 内容摘要
        item.name = cells[3] || '';
        item.description = cells[3] || '';

        // 状态映射
        const statusValue = cells[4] || '';
        if (statusValue.includes('已回收')) {
          item.status = 'resolved';
        } else if (statusValue.includes('推进中')) {
          item.status = 'progressing';
        } else if (statusValue.includes('待推进')) {
          item.status = 'planted';
        } else {
          item.status = 'planted';
        }

        // 关联事实
        if (cells[5]) {
          const factMatches = cells[5].match(/\d+/g);
          if (factMatches) {
            item.relatedChapters = factMatches.map(Number).filter(n => n > 0 && n < 1000);
          }
        }
      } else if (currentSection.includes('推进/回收')) {
        // 推进/回收记录格式: hook_id | 章节 | 推进内容 | 状态变更
        item.id = cells[0] || `foreshadow-${items.length + 1}`;
        item.name = cells[2] || '';
        item.description = cells[2] || '';

        // 章节号
        if (cells[1] && /^\d+$/.test(cells[1])) {
          item.plantedChapter = parseInt(cells[1]);
        }

        // 从状态变更中提取状态
        if (cells[3]) {
          if (cells[3].includes('已回收')) {
            item.status = 'resolved';
          } else if (cells[3].includes('推进')) {
            item.status = 'progressing';
          }
        }
      }

      // 如果没有 name，使用 id
      if (!item.name && item.id) {
        item.name = item.id;
      }

      if (item.id) {
        items.push(item);
      }
    }
  }

  return items;
}

// 读取大纲
export async function getOutline(novelId?: string): Promise<Outline> {
  const db = getDatabase();
  
  // 如果指定了 novelId，从数据库读取
  if (novelId) {
    const row = db.prepare('SELECT * FROM outline WHERE novel_id = ?').get(novelId) as any;
    if (row) {
      return parseOutline(row.content);
    }
    // 如果数据库没有，返回空
    return { title: '', synopsis: '', volumes: [] };
  }

  // 如果没有指定 novelId，从数据库读取默认大纲
  const row = db.prepare('SELECT * FROM outline WHERE id = ?').get('main') as any;

  if (row) {
    return parseOutline(row.content);
  }

  // Fallback to file system
  try {
    const filePath = path.join(PROJECT_ROOT, '00-大纲.md');
    const content = await fs.readFile(filePath, 'utf-8');
    return parseOutline(content);
  } catch (error) {
    return { title: '', synopsis: '', volumes: [] };
  }
}

// 解析大纲
function parseOutline(content: string): Outline {
  const lines = content.split('\n');
  let title = '';
  let synopsis = '';
  const volumes: any[] = [];
  let currentVolume: any = null;
  let currentChapter: any = null;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
    } else if (line.startsWith('## ') && !line.startsWith('### ')) {
      if (currentVolume) {
        volumes.push(currentVolume);
      }
      currentVolume = {
        id: line.substring(3).trim(),
        title: line.substring(3).trim(),
        description: '',
        chapters: [],
      };
    } else if (line.startsWith('### ') && currentVolume) {
      if (currentChapter) {
        currentVolume.chapters.push(currentChapter);
      }
      currentChapter = {
        id: line.substring(4).trim(),
        title: line.substring(4).trim(),
        summary: '',
        keyEvents: [],
        status: 'planned',
      };
    } else if (currentChapter && line.startsWith('- ')) {
      currentChapter.keyEvents.push(line.substring(2).trim());
    } else if (currentVolume && !currentChapter && line.trim()) {
      currentVolume.description += line + '\n';
    } else if (!currentVolume && line.trim() && !title) {
      synopsis += line + '\n';
    }
  }

  if (currentChapter && currentVolume) {
    currentVolume.chapters.push(currentChapter);
  }
  if (currentVolume) {
    volumes.push(currentVolume);
  }

  return {
    title,
    synopsis: synopsis.trim(),
    volumes,
  };
}

// 读取同步状态
export async function getSyncStatus(): Promise<any> {
  try {
    const filePath = path.join(PROJECT_ROOT, '故事/同步状态.md');
    const content = await fs.readFile(filePath, 'utf-8');
    return parseSyncStatus(content);
  } catch (error) {
    return {
      mode: '',
      syncedTo: '',
      totalFacts: 0,
      latestChapter: 0,
      canContinue: false,
      pendingChapters: [],
    };
  }
}

// 解析同步状态
function parseSyncStatus(content: string): any {
  const lines = content.split('\n');
  const status: any = {
    mode: '',
    syncedTo: '',
    totalFacts: 0,
    latestChapter: 0,
    canContinue: false,
    pendingChapters: [],
  };

  for (const line of lines) {
    if (line.startsWith('- 模式：')) {
      status.mode = line.substring(5).trim();
    } else if (line.startsWith('- 已同步至：')) {
      status.syncedTo = line.substring(7).trim();
      const match = status.syncedTo.match(/第(\d+)章/);
      if (match) {
        status.syncedTo = parseInt(match[1]);
      }
    } else if (line.startsWith('- 累计')) {
      const match = line.match(/(\d+) 条事实/);
      if (match) {
        status.totalFacts = parseInt(match[1]);
      }
    } else if (line.startsWith('- 最新已创作章节：')) {
      const match = line.match(/第(\d+)章/);
      if (match) {
        status.latestChapter = parseInt(match[1]);
      }
    } else if (line.startsWith('- 是否允许继续写新章：')) {
      status.canContinue = line.includes('是');
    } else if (line.startsWith('- [ ] 第')) {
      const match = line.match(/第(\d+)章/);
      if (match) {
        status.pendingChapters.push(parseInt(match[1]));
      }
    }
  }

  return status;
}

// 读取模型配置
export async function getModelConfigs(): Promise<any[]> {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM model_configs ORDER BY is_default DESC, name').all() as any[];

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    enabled: Boolean(row.enabled),
    isDefault: Boolean(row.is_default),
    settings: JSON.parse(row.settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// 保存模型配置
export async function saveModelConfig(config: any): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (config.isDefault) {
    db.prepare('UPDATE model_configs SET is_default = 0').run();
  }

  db.prepare(`
    INSERT OR REPLACE INTO model_configs (id, name, provider, enabled, is_default, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(config.id, config.name, config.provider, config.enabled ? 1 : 0, config.isDefault ? 1 : 0, JSON.stringify(config.settings), config.createdAt || now, now);
}

// 删除模型配置
export async function deleteModelConfig(id: string): Promise<void> {
  const db = getDatabase();
  db.prepare('DELETE FROM model_configs WHERE id = ?').run(id);
}

// 读取设置
export async function getSettings(): Promise<any> {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM settings').all() as any[];

  const settings: any = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings;
}

// 保存设置
export async function saveSetting(key: string, value: any): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
    .run(key, serialized, now);
}

// 搜索章节
export async function searchChapters(query: string, novelId?: string): Promise<Chapter[]> {
  const db = getDatabase();
  let sql = `
    SELECT * FROM chapters
    WHERE (title LIKE ? OR content LIKE ?)
  `;
  const params: any[] = [`%${query}%`, `%${query}%`];
  
  if (novelId) {
    sql += ' AND novel_id = ?';
    params.push(novelId);
  }
  
  sql += ' ORDER BY CAST(id AS INTEGER)';
  
  const rows = db.prepare(sql).all(...params) as any[];

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    content: row.content,
    wordCount: row.word_count,
    file: row.file,
    status: row.status,
    lastModified: row.last_modified ? new Date(row.last_modified) : undefined,
  }));
}

// 获取统计信息
export async function getStats(novelId?: string): Promise<any> {
  const db = getDatabase();
  
  const novelCondition = novelId ? 'WHERE novel_id = ?' : '';
  const novelParams = novelId ? [novelId] : [];

  const chapterCount = (db.prepare(`SELECT COUNT(*) as count FROM chapters ${novelCondition}`).get(...novelParams) as any).count;
  const totalWords = (db.prepare(`SELECT SUM(word_count) as total FROM chapters ${novelCondition}`).get(...novelParams) as any).total || 0;
  const characterCount = (db.prepare(`SELECT COUNT(*) as count FROM characters ${novelCondition}`).get(...novelParams) as any).count;
  const foreshadowingCount = (db.prepare(`SELECT COUNT(*) as count FROM foreshadowing ${novelCondition}`).get(...novelParams) as any).count;

  const pendingCondition = novelId ? "WHERE status = 'pending' AND novel_id = ?" : "WHERE status = 'pending'";
  const pendingParams = novelId ? [novelId] : [];
  const pendingChapters = (db.prepare(`SELECT COUNT(*) as count FROM chapters ${pendingCondition}`).get(...pendingParams) as any).count;
  
  const auditCondition = novelId ? "WHERE status = 'audit' AND novel_id = ?" : "WHERE status = 'audit'";
  const auditParams = novelId ? [novelId] : [];
  const auditChapters = (db.prepare(`SELECT COUNT(*) as count FROM chapters ${auditCondition}`).get(...auditParams) as any).count;

  const recentSql = `SELECT id, title, word_count, last_modified FROM chapters ${novelCondition} ORDER BY last_modified DESC LIMIT 5`;
  const recentChapters = db.prepare(recentSql).all(...novelParams) as any[];

  return {
    chapterCount,
    totalWords,
    characterCount,
    foreshadowingCount,
    pendingChapters,
    auditChapters,
    recentChapters: recentChapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      wordCount: ch.word_count,
      lastModified: ch.last_modified,
    })),
  };
}
