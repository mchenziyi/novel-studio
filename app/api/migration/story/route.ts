import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
  addStoryFact,
  addStoryHook,
  upsertStorySummary,
  upsertStoryState,
  upsertStoryCharacter,
  addStoryResource,
  upsertStoryPlotline,
  upsertStorySync,
} from '@/lib/story-data';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

// 解析事实总账
async function parseFactLedger(novelId: string): Promise<number> {
  try {
    const content = await fs.readFile(path.join(PROJECT_ROOT, '故事/总账/事实总账.md'), 'utf-8');
    const lines = content.split('\n');
    let count = 0;

    for (const line of lines) {
      // 匹配 | F-0047-01 | 47 | 角色行为 | ... |
      const match = line.match(/^\|\s*(F-\d{4}-\d{2})\s*\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
      if (match) {
        const [, id, chapter, category, subject, content] = match;
        addStoryFact(novelId, {
          id: id.trim(),
          chapter: parseInt(chapter),
          category: category.trim(),
          subject: subject.trim(),
          content: content.trim(),
        });
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error('Failed to parse fact ledger:', error);
    return 0;
  }
}

// 解析伏笔池
async function parseHooks(novelId: string): Promise<number> {
  try {
    const content = await fs.readFile(path.join(PROJECT_ROOT, '故事/伏笔池.md'), 'utf-8');
    const lines = content.split('\n');
    let count = 0;

    for (const line of lines) {
      // 匹配 | hook-47-01 | 内容 | open | F-0047-01 |
      const match = line.match(/^\|\s*(hook-\d+-\d+)\s*\|\s*([^|]+)\|\s*(open|progressing|resolved)\s*\|\s*([^|]*)\|/);
      if (match) {
        const [, id, content, status, factIds] = match;
        const chapterMatch = id.match(/hook-(\d+)-/);
        addStoryHook(novelId, {
          id: id.trim(),
          chapter: chapterMatch ? parseInt(chapterMatch[1]) : undefined,
          type: status === 'resolved' ? 'resolved' : 'planted',
          content: content.trim(),
          fact_ids: factIds.trim() || undefined,
          status: status.trim(),
        });
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error('Failed to parse hooks:', error);
    return 0;
  }
}

// 解析角色矩阵
async function parseCharacters(novelId: string): Promise<number> {
  try {
    const content = await fs.readFile(path.join(PROJECT_ROOT, '故事/角色矩阵.md'), 'utf-8');
    // 简单解析：按 ## 分割角色
    const sections = content.split(/^## /m);
    let count = 0;

    for (const section of sections) {
      if (!section.trim()) continue;
      const lines = section.split('\n');
      const name = lines[0]?.trim();
      if (!name || name.startsWith('#')) continue;

      // 提取角色信息
      const roleMatch = section.match(/角色定位[：:]\s*([^\n]+)/);
      const statusMatch = section.match(/状态[：:]\s*([^\n]+)/);
      const personalityMatch = section.match(/性格[：:]\s*([^\n]+)/);

      upsertStoryCharacter(novelId, {
        name,
        role: roleMatch?.[1]?.trim(),
        status: statusMatch?.[1]?.trim(),
        personality: personalityMatch?.[1]?.trim(),
      });
      count++;
    }

    return count;
  } catch (error) {
    console.error('Failed to parse characters:', error);
    return 0;
  }
}

// 解析同步状态
async function parseSyncStatus(novelId: string): Promise<boolean> {
  try {
    const content = await fs.readFile(path.join(PROJECT_ROOT, '故事/同步状态.md'), 'utf-8');
    
    const syncedMatch = content.match(/已同步至：第(\d+)章/);
    const totalFactsMatch = content.match(/累计\s*(\d+)\s*条事实/);
    const latestMatch = content.match(/最新已创作章节：第(\d+)章/);
    const canContinueMatch = content.match(/是否允许继续写新章：\*\*是\*\*/);

    upsertStorySync(novelId, {
      synced_chapter: syncedMatch ? parseInt(syncedMatch[1]) : 0,
      total_facts: totalFactsMatch ? parseInt(totalFactsMatch[1]) : 0,
      latest_chapter: latestMatch ? parseInt(latestMatch[1]) : 0,
      can_continue: canContinueMatch ? 1 : 0,
    });

    return true;
  } catch (error) {
    console.error('Failed to parse sync status:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';

    const results = {
      facts: await parseFactLedger(novelId),
      hooks: await parseHooks(novelId),
      characters: await parseCharacters(novelId),
      sync: await parseSyncStatus(novelId),
    };

    return NextResponse.json({
      success: true,
      message: '故事数据迁移完成',
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: '迁移失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
