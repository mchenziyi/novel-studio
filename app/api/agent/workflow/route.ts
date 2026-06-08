import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, model = 'mimo' } = body;

    if (!chapterId) {
      return NextResponse.json(
        { error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    const pipeline = await runWorkflow(chapterId, model as ModelType);

    return NextResponse.json({
      success: true,
      workflow: pipeline,
    });
  } catch (error) {
    console.error('Failed to run workflow:', error);
    return NextResponse.json(
      { error: 'Failed to run workflow' },
      { status: 500 }
    );
  }
}
