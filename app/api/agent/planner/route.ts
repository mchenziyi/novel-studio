import { NextRequest, NextResponse } from 'next/server';
import { runPlanner } from '@/lib/novel-pro';
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

    const result = await runPlanner(chapterId, model as ModelType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Failed to run planner:', error);
    return NextResponse.json(
      { error: 'Failed to run planner' },
      { status: 500 }
    );
  }
}
