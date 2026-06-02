import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';

    const db = getDatabase();
    const row = db.prepare('SELECT * FROM outline WHERE novel_id = ?').get(novelId) as any;

    if (!row) {
      return NextResponse.json({ title: '', content: '', volumes: [] });
    }

    return NextResponse.json({
      title: row.content?.split('\n')[0]?.replace(/^#\s*/, '') || '',
      content: row.content || '',
      volumes: [],
    });
  } catch (error) {
    console.error('Failed to fetch outline:', error);
    return NextResponse.json({ error: 'Failed to fetch outline' }, { status: 500 });
  }
}
