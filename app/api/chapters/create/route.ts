import { NextRequest, NextResponse } from 'next/server';
import { createChapter, getChapters, getChapter } from '@/lib/file-system';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content = '', novelId = 'default' } = body;

    if (!title) {
      return NextResponse.json(
        { error: '章节标题不能为空' },
        { status: 400 }
      );
    }

    // 获取现有章节，计算下一章 ID
    const existingChapters = await getChapters(novelId);
    const maxId = existingChapters.reduce((max, ch) => {
      const num = parseInt(ch.id);
      return num > max ? num : max;
    }, 0);
    
    // 确保 ID 不冲突（检查全局唯一性）
    let nextId = maxId + 1;
    let nextIdStr = String(nextId).padStart(4, '0');
    let existing = await getChapter(nextIdStr);
    
    while (existing) {
      nextId++;
      nextIdStr = String(nextId).padStart(4, '0');
      existing = await getChapter(nextIdStr);
    }

    // 创建章节
    const chapter = await createChapter(nextIdStr, title, content, novelId);

    return NextResponse.json({
      success: true,
      chapter,
    });
  } catch (error) {
    console.error('Failed to create chapter:', error);
    return NextResponse.json(
      { error: '创建章节失败' },
      { status: 500 }
    );
  }
}
