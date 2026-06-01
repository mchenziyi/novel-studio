import { NextRequest, NextResponse } from 'next/server';
import { getVersionDiff } from '@/lib/version-control';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const oldVersionId = searchParams.get('old');
    const newVersionId = searchParams.get('new');

    if (!oldVersionId || !newVersionId) {
      return NextResponse.json(
        { error: 'Both old and new version IDs are required' },
        { status: 400 }
      );
    }

    const diff = await getVersionDiff(id, oldVersionId, newVersionId);
    return NextResponse.json(diff);
  } catch (error) {
    console.error('Failed to fetch version diff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version diff' },
      { status: 500 }
    );
  }
}
