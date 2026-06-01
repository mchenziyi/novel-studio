import { NextRequest, NextResponse } from 'next/server';
import { getGitStatus } from '@/lib/git';

export async function GET(request: NextRequest) {
  try {
    const status = await getGitStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to fetch git status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch git status' },
      { status: 500 }
    );
  }
}
