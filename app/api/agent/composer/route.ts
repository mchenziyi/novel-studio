import { NextRequest, NextResponse } from 'next/server';
import { runComposer } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, intent, model = 'claude' } = body;

    if (!chapterId || !intent) {
      return NextResponse.json(
        { error: 'Chapter ID and intent are required' },
        { status: 400 }
      );
    }

    const result = await runComposer(chapterId, intent, model as ModelType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Failed to run composer:', error);
    return NextResponse.json(
      { error: 'Failed to run composer' },
      { status: 500 }
    );
  }
}
