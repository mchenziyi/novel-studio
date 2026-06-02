import { NextRequest, NextResponse } from 'next/server';
import { getOutline } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || undefined;
    
    const outline = await getOutline(novelId);
    return NextResponse.json(outline);
  } catch (error) {
    console.error('Failed to fetch outline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outline' },
      { status: 500 }
    );
  }
}
