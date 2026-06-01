import { NextRequest, NextResponse } from 'next/server';
import { getChapter, updateChapter } from '@/lib/file-system';
import { saveChapterWithVersion } from '@/lib/version-control';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chapter = await getChapter(id);
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Failed to fetch chapter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, source = 'manual', agentName, description } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // 保存章节并创建版本
    const version = await saveChapterWithVersion(id, content, source, {
      agentName,
      description,
    });

    // 获取更新后的章节
    const chapter = await getChapter(id);

    return NextResponse.json({
      ...chapter,
      version,
    });
  } catch (error) {
    console.error('Failed to update chapter:', error);
    return NextResponse.json(
      { error: 'Failed to update chapter' },
      { status: 500 }
    );
  }
}
