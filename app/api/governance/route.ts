import { NextRequest, NextResponse } from 'next/server';
import { getGovernanceDocs, getGovernanceDoc, updateGovernanceDoc, DOC_LABELS, DOC_DESCRIPTIONS } from '@/lib/governance';

// GET /api/governance?novelId=default — 获取所有治理文档
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    const docType = searchParams.get('type');

    if (docType) {
      const doc = getGovernanceDoc(novelId, docType);
      return NextResponse.json({ doc });
    }

    const docs = getGovernanceDocs(novelId);
    return NextResponse.json({ docs });
  } catch (error) {
    console.error('Failed to get governance docs:', error);
    return NextResponse.json({ error: '获取治理文档失败' }, { status: 500 });
  }
}

// PUT /api/governance — 更新治理文档
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId = 'default', docType, content } = body;

    if (!docType || !['author_intent', 'current_focus'].includes(docType)) {
      return NextResponse.json({ error: 'docType 必须是 author_intent 或 current_focus' }, { status: 400 });
    }

    updateGovernanceDoc(novelId, docType, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update governance doc:', error);
    return NextResponse.json({ error: '更新治理文档失败' }, { status: 500 });
  }
}
