import { NextRequest, NextResponse } from 'next/server';
import { rollbackToVersion } from '@/lib/version-control';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      );
    }

    await rollbackToVersion(id, versionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to rollback chapter:', error);
    return NextResponse.json(
      { error: 'Failed to rollback chapter' },
      { status: 500 }
    );
  }
}
