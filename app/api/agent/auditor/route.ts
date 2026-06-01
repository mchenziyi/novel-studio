import { NextRequest, NextResponse } from 'next/server';
import { runAuditor } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, content, model = 'mimo' } = body;

    if (!chapterId || !content) {
      return NextResponse.json(
        { error: 'Chapter ID and content are required' },
        { status: 400 }
      );
    }

    const result = await runAuditor(chapterId, content, model as ModelType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Failed to run auditor:', error);
    return NextResponse.json(
      { error: 'Failed to run auditor' },
      { status: 500 }
    );
  }
}
