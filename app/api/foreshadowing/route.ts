import { NextRequest, NextResponse } from 'next/server';
import { getForeshadowing } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const foreshadowing = await getForeshadowing();
    return NextResponse.json(foreshadowing);
  } catch (error) {
    console.error('Failed to fetch foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch foreshadowing' },
      { status: 500 }
    );
  }
}
