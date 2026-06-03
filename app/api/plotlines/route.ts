import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';

    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM story_plotlines WHERE novel_id = ? ORDER BY name').all(novelId) as any[];

    const plotlines = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      status: row.status || 'active',
      startChapter: row.start_chapter,
      endChapter: row.end_chapter,
    }));

    return NextResponse.json(plotlines);
  } catch (error) {
    console.error('Failed to get plotlines:', error);
    return NextResponse.json({ error: '获取情节线失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId = 'default', id, name, description, status, startChapter, endChapter } = body;

    if (!id || !name) {
      return NextResponse.json({ error: '缺少 id 或 name' }, { status: 400 });
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO story_plotlines (id, novel_id, name, status, start_chapter, end_chapter, description, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = ?, status = ?, start_chapter = ?, end_chapter = ?, description = ?, updated_at = ?
    `).run(
      id, novelId, name, status || 'active', startChapter || null, endChapter || null, description || '', now,
      name, status || 'active', startChapter || null, endChapter || null, description || '', now
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save plotline:', error);
    return NextResponse.json({ error: '保存情节线失败' }, { status: 500 });
  }
}
