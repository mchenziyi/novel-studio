import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

export async function POST(request: NextRequest) {
  try {
    const filePath = path.join(PROJECT_ROOT, '故事', '伏笔池.md');
    const content = await fs.readFile(filePath, 'utf-8');
    const db = getDatabase();

    // 清除旧的 foreshadowing 迁移数据（段落标题垃圾数据）
    db.prepare('DELETE FROM foreshadowing WHERE novel_id = ?').run('default');

    const hooks = parseHooks(content);
    let inserted = 0;

    for (const hook of hooks) {
      // 检查 story_hooks 是否已存在
      const existing = db.prepare('SELECT id FROM story_hooks WHERE id = ? AND novel_id = ?').get(hook.id, 'default');
      if (existing) continue;

      db.prepare(`
        INSERT INTO story_hooks (id, novel_id, chapter, type, content, fact_ids, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        hook.id,
        'default',
        hook.chapter,
        hook.type,
        hook.content,
        hook.factIds || null,
        hook.status,
        new Date().toISOString()
      );
      inserted++;
    }

    return NextResponse.json({ success: true, total: hooks.length, inserted });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

interface ParsedHook {
  id: string;
  chapter: number;
  type: string;
  content: string;
  factIds: string;
  status: string;
}

function parseHooks(content: string): ParsedHook[] {
  const hooks: ParsedHook[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  let headerSkipped = false;
  let separatorSkipped = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测章节标题
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.substring(3).trim();
      headerSkipped = false;
      separatorSkipped = false;
      continue;
    }

    // 跳过表头行
    if (trimmed.startsWith('|') && !headerSkipped && !trimmed.includes('---')) {
      headerSkipped = true;
      continue;
    }

    // 跳过分隔行
    if (trimmed.startsWith('|') && trimmed.includes('---')) {
      separatorSkipped = true;
      continue;
    }

    // 解析数据行
    if (trimmed.startsWith('|') && headerSkipped && separatorSkipped) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length < 3) continue;

      if (currentSection.includes('章新增')) {
        // 67章新增格式: hook_id | 内容 | 状态 | src_fact
        const hook = parseNewHook(cells, currentSection);
        if (hook) hooks.push(hook);
      } else if (currentSection.includes('活跃伏笔')) {
        // 活跃伏笔格式: hook_id | 类型 | 章节 | 内容摘要 | 状态 | 关联事实
        const hook = parseActiveHook(cells);
        if (hook) hooks.push(hook);
      }
    }
  }

  return hooks;
}

function parseNewHook(cells: string[], section: string): ParsedHook | null {
  const id = cells[0];
  if (!id || !id.startsWith('hook-')) return null;

  const chapterMatch = id.match(/hook-(\d+)-/);
  const chapter = chapterMatch ? parseInt(chapterMatch[1]) : 0;

  const statusMap: Record<string, string> = {
    'open': 'open',
    'dormant': 'dormant',
    'foreshadowing': 'progressing',
  };

  return {
    id,
    chapter,
    type: 'planted',
    content: cells[1] || '',
    factIds: cells[3] || '',
    status: statusMap[cells[2]] || 'open',
  };
}

function parseActiveHook(cells: string[]): ParsedHook | null {
  const id = cells[0];
  if (!id || !id.startsWith('hook-')) return null;

  const chapter = cells[2] && /^\d+$/.test(cells[2]) ? parseInt(cells[2]) : 0;
  const content = cells[3] || '';

  // 状态映射
  let status = 'open';
  const statusText = cells[4] || '';
  if (statusText.includes('已回收')) status = 'resolved';
  else if (statusText.includes('推进中')) status = 'progressing';
  else if (statusText.includes('待推进') || statusText.includes('待解')) status = 'open';

  return {
    id,
    chapter,
    type: cells[1] || 'planted',
    content,
    factIds: cells[5] || '',
    status,
  };
}
