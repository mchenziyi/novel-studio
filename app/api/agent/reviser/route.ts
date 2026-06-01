import { NextRequest, NextResponse } from 'next/server';
import { runReviser } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, content, issues, model = 'claude' } = body;

    if (!chapterId || !content || !issues) {
      return NextResponse.json(
        { error: 'Chapter ID, content, and issues are required' },
        { status: 400 }
      );
    }

    const result = await runReviser(chapterId, content, issues, model as ModelType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Failed to run reviser:', error);
    return NextResponse.json(
      { error: 'Failed to run reviser' },
      { status: 500 }
    );
  }
}
