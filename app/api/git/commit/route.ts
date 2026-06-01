import { NextRequest, NextResponse } from 'next/server';
import { gitCommit, gitAddAll } from '@/lib/git';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, addAll = true } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Commit message is required' },
        { status: 400 }
      );
    }

    // 如果需要，先暂存所有更改
    if (addAll) {
      await gitAddAll();
    }

    // 创建提交
    const commitHash = await gitCommit(message);

    return NextResponse.json({
      success: true,
      commitHash,
    });
  } catch (error) {
    console.error('Failed to commit:', error);
    return NextResponse.json(
      { error: 'Failed to commit' },
      { status: 500 }
    );
  }
}
