import { NextRequest, NextResponse } from 'next/server';
import { gitAddAll } from '@/lib/git';

export async function POST(request: NextRequest) {
  try {
    await gitAddAll();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add all files:', error);
    return NextResponse.json(
      { error: 'Failed to add all files' },
      { status: 500 }
    );
  }
}
