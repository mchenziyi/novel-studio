import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    const status = searchParams.get('status');
    
    const db = getDatabase();
    let query = 'SELECT * FROM story_hooks WHERE novel_id = ?';
    const params: any[] = [novelId];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY chapter ASC';
    const rows = db.prepare(query).all(...params) as any[];

    const hooks = rows.map(row => ({
      id: row.id || `hook-${row.chapter || 0}-${row.rowid || Math.random().toString(36).slice(2, 6)}`,
      name: row.content?.substring(0, 50) || row.id,
      description: row.content || '',
      status: row.status === 'open' ? 'planted' : row.status === 'resolved' ? 'resolved' : 'progressing',
      plantedChapter: row.chapter,
      resolvedChapter: null,
      factIds: row.fact_ids,
    }));

    return NextResponse.json(hooks);
  } catch (error) {
    console.error('Failed to get foreshadowing:', error);
    return NextResponse.json({ error: 'Failed to get foreshadowing' }, { status: 500 });
  }
}
