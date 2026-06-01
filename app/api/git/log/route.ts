import { NextRequest, NextResponse } from 'next/server';
import { getGitLog } from '@/lib/git';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxCount = parseInt(searchParams.get('maxCount') || '50');

    const commits = await getGitLog(maxCount);
    return NextResponse.json(commits);
  } catch (error) {
    console.error('Failed to fetch git log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch git log' },
      { status: 500 }
    );
  }
}
