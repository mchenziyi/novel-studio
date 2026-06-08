import { NextRequest, NextResponse } from 'next/server';
import { getAuditResult, getAuditResultsByChapter, getLatestAuditResult, deleteAuditResult } from '@/lib/audit-results';

// GET /api/agent/audit?chapterId=1 或 ?pipelineId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const pipelineId = searchParams.get('pipelineId');
    const latest = searchParams.get('latest') === 'true';

    if (pipelineId) {
      const result = getAuditResult(pipelineId);
      if (!result) return NextResponse.json({ error: 'Audit result not found' }, { status: 404 });
      return NextResponse.json({ result });
    }

    if (chapterId) {
      if (latest) {
        const result = getLatestAuditResult(Number(chapterId));
        return NextResponse.json({ result });
      }
      const results = getAuditResultsByChapter(Number(chapterId));
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'chapterId or pipelineId required' }, { status: 400 });
  } catch (error) {
    console.error('Failed to get audit results:', error);
    return NextResponse.json(
      { error: 'Failed to get audit results' },
      { status: 500 }
    );
  }
}

// DELETE /api/agent/audit?pipelineId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('pipelineId');
    if (!pipelineId) {
      return NextResponse.json({ error: 'pipelineId required' }, { status: 400 });
    }
    deleteAuditResult(pipelineId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete audit result' }, { status: 500 });
  }
}
