import { NextRequest, NextResponse } from 'next/server';
import { getVersionHistory } from '@/lib/version-control';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = await getVersionHistory(id);
    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to fetch version history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    );
  }
}
