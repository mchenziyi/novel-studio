import { NextRequest, NextResponse } from 'next/server';
import { getForeshadowing } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || undefined;
    
    const foreshadowing = await getForeshadowing(novelId);
    return NextResponse.json(foreshadowing);
  } catch (error) {
    console.error('Failed to fetch foreshadowing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch foreshadowing' },
      { status: 500 }
    );
  }
}
