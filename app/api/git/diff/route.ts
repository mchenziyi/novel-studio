import { NextRequest, NextResponse } from 'next/server';
import { getGitDiff, getGitStagedDiff, parseGitDiff } from '@/lib/git';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const staged = searchParams.get('staged') === 'true';

    const diffOutput = staged
      ? await getGitStagedDiff(filePath || undefined)
      : await getGitDiff(filePath || undefined);

    const diff = parseGitDiff(diffOutput);
    return NextResponse.json(diff);
  } catch (error) {
    console.error('Failed to fetch git diff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch git diff' },
      { status: 500 }
    );
  }
}
