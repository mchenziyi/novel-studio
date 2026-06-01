import { NextRequest, NextResponse } from 'next/server';
import { getSyncStatus } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const syncStatus = await getSyncStatus();
    return NextResponse.json(syncStatus);
  } catch (error) {
    console.error('Failed to fetch sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
