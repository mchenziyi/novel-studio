import { NextRequest, NextResponse } from 'next/server';
import { getOutline } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const outline = await getOutline();
    return NextResponse.json(outline);
  } catch (error) {
    console.error('Failed to fetch outline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outline' },
      { status: 500 }
    );
  }
}
