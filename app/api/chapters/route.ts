import { NextRequest, NextResponse } from 'next/server';
import { getChapters } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const chapters = await getChapters();
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Failed to fetch chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}
