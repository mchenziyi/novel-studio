import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';

    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM story_characters WHERE novel_id = ? ORDER BY name').all(novelId) as any[];

    const characters = rows.map(row => {
      // 从 character_relations 获取关系
      const relations = db.prepare('SELECT * FROM character_relations WHERE source_id = ?').all(row.name) as any[];

      return {
        id: row.name,
        name: row.name,
        role: row.role || 'supporting',
        status: 'unknown' as const,
        description: [row.role === 'protagonist' ? '主角' : row.role === 'antagonist' ? '反派' : '配角', row.personality, row.current_state].filter(Boolean).join('；'),
        relations: relations.map(r => ({
          target: r.target_id,
          type: r.type,
          strength: r.strength,
          description: r.description,
        })),
        firstAppearance: 0,
      };
    });

    return NextResponse.json(characters);
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}
