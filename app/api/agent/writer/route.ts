import { NextRequest, NextResponse } from 'next/server';
import { runWriter } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, intent, context, model = 'deepseek' } = body;

    if (!chapterId || !intent || !context) {
      return NextResponse.json(
        { error: 'Chapter ID, intent, and context are required' },
        { status: 400 }
      );
    }

    const result = await runWriter(chapterId, intent, context, model as ModelType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Failed to run writer:', error);
    return NextResponse.json(
      { error: 'Failed to run writer' },
      { status: 500 }
    );
  }
}
