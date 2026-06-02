import { NextRequest, NextResponse } from 'next/server';
import { createNovel, getNovels, getNovel, updateNovel, deleteNovel, permanentlyDeleteNovel, getNovelStats } from '@/lib/novels';

// 获取小说列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('id');
    const status = searchParams.get('status') as 'active' | 'archived' | 'draft' | null;

    // 获取单个小说
    if (novelId) {
      const novel = await getNovel(novelId);
      if (!novel) {
        return NextResponse.json({ error: '小说不存在' }, { status: 404 });
      }

      // 获取统计信息
      const stats = await getNovelStats(novelId);
      return NextResponse.json({ novel, stats });
    }

    // 获取小说列表
    const novels = await getNovels(status || undefined);
    return NextResponse.json({ novels });
  } catch (error) {
    console.error('Failed to get novels:', error);
    return NextResponse.json(
      { error: '获取小说列表失败' },
      { status: 500 }
    );
  }
}

// 创建小说
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, author, projectPath } = body;

    if (!title) {
      return NextResponse.json({ error: '小说标题不能为空' }, { status: 400 });
    }

    const novel = await createNovel(title, {
      description,
      author,
      projectPath,
    });

    return NextResponse.json({ success: true, novel });
  } catch (error) {
    console.error('Failed to create novel:', error);
    return NextResponse.json(
      { error: '创建小说失败' },
      { status: 500 }
    );
  }
}

// 更新小说
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: '小说 ID 不能为空' }, { status: 400 });
    }

    await updateNovel(id, updates);
    const novel = await getNovel(id);

    return NextResponse.json({ success: true, novel });
  } catch (error) {
    console.error('Failed to update novel:', error);
    return NextResponse.json(
      { error: '更新小说失败' },
      { status: 500 }
    );
  }
}

// 删除小说
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!novelId) {
      return NextResponse.json({ error: '小说 ID 不能为空' }, { status: 400 });
    }

    if (permanent) {
      await permanentlyDeleteNovel(novelId);
    } else {
      await deleteNovel(novelId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete novel:', error);
    return NextResponse.json(
      { error: '删除小说失败' },
      { status: 500 }
    );
  }
}
