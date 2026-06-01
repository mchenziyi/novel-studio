import { NextRequest, NextResponse } from 'next/server';
import { getChapters, getCharacters, getForeshadowing } from '@/lib/file-system';

interface SearchResult {
  type: 'chapter' | 'character' | 'foreshadowing';
  id: string;
  title: string;
  content: string;
  matches: {
    text: string;
    index: number;
    context: string;
  }[];
  score: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const type = searchParams.get('type') || 'all'; // all, chapter, character, foreshadowing
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: query || '',
      });
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // 搜索章节
    if (type === 'all' || type === 'chapter') {
      try {
        const chapters = await getChapters();
        for (const chapter of chapters) {
          const matches = findMatches(chapter.content, query, chapter.title);
          if (matches.length > 0) {
            results.push({
              type: 'chapter',
              id: chapter.id,
              title: `第${chapter.id}章 ${chapter.title}`,
              content: chapter.content.substring(0, 200) + '...',
              matches,
              score: matches.length * 10,
            });
          }
        }
      } catch (error) {
        console.error('Failed to search chapters:', error);
      }
    }

    // 搜索角色
    if (type === 'all' || type === 'character') {
      try {
        const characters = await getCharacters();
        for (const char of characters) {
          const nameMatches = findMatches(char.name, query, char.name);
          const descMatches = findMatches(char.description, query, char.name);
          const allMatches = [...nameMatches, ...descMatches];

          if (allMatches.length > 0) {
            results.push({
              type: 'character',
              id: char.id,
              title: char.name,
              content: char.description,
              matches: allMatches,
              score: nameMatches.length * 20 + descMatches.length * 5,
            });
          }
        }
      } catch (error) {
        console.error('Failed to search characters:', error);
      }
    }

    // 搜索伏笔
    if (type === 'all' || type === 'foreshadowing') {
      try {
        const foreshadowing = await getForeshadowing();
        for (const item of foreshadowing) {
          const nameMatches = findMatches(item.name, query, item.name);
          const descMatches = findMatches(item.description, query, item.name);
          const allMatches = [...nameMatches, ...descMatches];

          if (allMatches.length > 0) {
            results.push({
              type: 'foreshadowing',
              id: item.id,
              title: item.name,
              content: item.description,
              matches: allMatches,
              score: nameMatches.length * 15 + descMatches.length * 5,
            });
          }
        }
      } catch (error) {
        console.error('Failed to search foreshadowing:', error);
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    // 限制结果数量
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      results: limitedResults,
      total: results.length,
      query,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

function findMatches(text: string, query: string, title: string): SearchResult['matches'] {
  const matches: SearchResult['matches'] = [];
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  let index = 0;
  while (index < textLower.length) {
    const matchIndex = textLower.indexOf(queryLower, index);
    if (matchIndex === -1) break;

    // 获取上下文
    const contextStart = Math.max(0, matchIndex - 30);
    const contextEnd = Math.min(text.length, matchIndex + query.length + 30);
    let context = text.substring(contextStart, contextEnd);
    if (contextStart > 0) context = '...' + context;
    if (contextEnd < text.length) context = context + '...';

    matches.push({
      text: text.substring(matchIndex, matchIndex + query.length),
      index: matchIndex,
      context,
    });

    index = matchIndex + 1;

    // 限制每个项目的匹配数量
    if (matches.length >= 3) break;
  }

  return matches;
}
