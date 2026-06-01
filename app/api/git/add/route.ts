import { NextRequest, NextResponse } from 'next/server';
import { gitAdd } from '@/lib/git';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    await gitAdd(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add file:', error);
    return NextResponse.json(
      { error: 'Failed to add file' },
      { status: 500 }
    );
  }
}
