import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/review?novelId=default — 获取待审阅章节列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    const status = searchParams.get('status') || 'review';

    const db = getDatabase();
    const chapters = db.prepare(`
      SELECT id, title, word_count, status, last_modified, updated_at
      FROM chapters 
      WHERE novel_id = ? AND status = ?
      ORDER BY id DESC
    `).all(novelId, status);

    return NextResponse.json({ chapters });
  } catch (error) {
    console.error('Failed to get review chapters:', error);
    return NextResponse.json({ error: '获取审阅列表失败' }, { status: 500 });
  }
}

// PUT /api/review — 审阅操作（approve/reject）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, action, novelId = 'default' } = body;

    if (!chapterId || !action) {
      return NextResponse.json({ error: 'chapterId 和 action 必填' }, { status: 400 });
    }

    const db = getDatabase();
    const id = String(chapterId).padStart(4, '0');
    const now = new Date().toISOString();

    let newStatus: string;
    let message: string;

    switch (action) {
      case 'approve':
        newStatus = 'synced';
        message = `第${chapterId}章已通过审阅，状态更新为 synced`;
        break;
      case 'reject':
        newStatus = 'pending';
        message = `第${chapterId}章已退回，状态更新为 pending`;
        break;
      case 'request-review':
        newStatus = 'review';
        message = `第${chapterId}章已提交审阅`;
        break;
      default:
        return NextResponse.json({ error: 'action 必须是 approve/reject/request-review' }, { status: 400 });
    }

    const result = db.prepare('UPDATE chapters SET status = ?, updated_at = ? WHERE id = ?')
      .run(newStatus, now, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: newStatus, message });
  } catch (error) {
    console.error('Failed to review chapter:', error);
    return NextResponse.json({ error: '审阅操作失败' }, { status: 500 });
  }
}

// POST /api/review — 批量审阅
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterIds, action, novelId = 'default' } = body;

    if (!chapterIds?.length || !action) {
      return NextResponse.json({ error: 'chapterIds 和 action 必填' }, { status: 400 });
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    let newStatus: string;
    switch (action) {
      case 'approve-all': newStatus = 'synced'; break;
      case 'reject-all': newStatus = 'pending'; break;
      default: return NextResponse.json({ error: 'action 必须是 approve-all/reject-all' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE chapters SET status = ?, updated_at = ? WHERE id = ?');
    let count = 0;
    for (const chapterId of chapterIds) {
      const id = String(chapterId).padStart(4, '0');
      const result = stmt.run(newStatus, now, id);
      count += result.changes;
    }

    return NextResponse.json({ success: true, count, status: newStatus });
  } catch (error) {
    console.error('Failed to batch review:', error);
    return NextResponse.json({ error: '批量审阅失败' }, { status: 500 });
  }
}
