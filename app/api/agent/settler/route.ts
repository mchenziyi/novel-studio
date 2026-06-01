import { NextRequest, NextResponse } from 'next/server';
import { runSettler } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, observations, model = 'mimo' } = body;

    if (!chapterId || !observations) {
      return NextResponse.json(
        { error: 'Chapter ID and observations are required' },
        { status: 400 }
      );
    }

    const result = await runSettler(chapterId, observations, model as ModelType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Failed to run settler:', error);
    return NextResponse.json(
      { error: 'Failed to run settler' },
      { status: 500 }
    );
  }
}
