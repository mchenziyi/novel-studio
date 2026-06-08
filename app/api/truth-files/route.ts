import { NextRequest, NextResponse } from 'next/server';
import { listTruthFiles, generateTruthFile } from '@/lib/truth-files';

// GET /api/truth-files?novelId=default — 列表或获取文件内容
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    const fileName = searchParams.get('file');

    if (fileName) {
      // 获取单个文件内容
      const content = generateTruthFile(novelId, fileName);
      if (content === null) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      return NextResponse.json({ file: fileName, content });
    }

    // 列表
    const files = listTruthFiles(novelId);
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Truth files API error:', error);
    return NextResponse.json(
      { error: 'Failed to get truth files' },
      { status: 500 }
    );
  }
}
