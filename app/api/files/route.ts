import { NextRequest, NextResponse } from 'next/server';
import { getSyncStatus } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    
    // 只有默认小说有同步状态文件
    if (novelId !== 'default') {
      return NextResponse.json({
        mode: '',
        syncedTo: '',
        totalFacts: 0,
        latestChapter: 0,
        canContinue: false,
        pendingChapters: [],
      });
    }
    
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
