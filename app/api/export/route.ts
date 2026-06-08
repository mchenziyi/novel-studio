import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/export?novelId=default&format=txt|md&approvedOnly=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    const format = searchParams.get('format') || 'txt';
    const approvedOnly = searchParams.get('approvedOnly') === 'true';

    const db = getDatabase();

    // 获取小说信息
    const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(novelId) as any;
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    // 获取章节
    let chapters: any[];
    if (approvedOnly) {
      chapters = db.prepare(
        "SELECT * FROM chapters WHERE novel_id = ? AND status IN ('synced', 'review') ORDER BY id ASC"
      ).all(novelId);
    } else {
      chapters = db.prepare(
        'SELECT * FROM chapters WHERE novel_id = ? ORDER BY id ASC'
      ).all(novelId);
    }

    if (format === 'md') {
      // Markdown 格式
      let md = `# ${novel.title}\n\n`;
      if (novel.description) md += `> ${novel.description}\n\n`;
      if (novel.author) md += `**作者**: ${novel.author}\n\n`;
      md += `---\n\n`;

      for (const ch of chapters) {
        md += `## ${ch.title}\n\n`;
        md += `${ch.content}\n\n`;
        md += `---\n\n`;
      }

      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(novel.title)}.md"`,
        },
      });
    } else {
      // TXT 格式
      let txt = `${novel.title}\n`;
      if (novel.author) txt += `作者: ${novel.author}\n`;
      txt += `章节: ${chapters.length}\n`;
      txt += `${'='.repeat(40)}\n\n`;

      for (const ch of chapters) {
        txt += `${ch.title}\n\n`;
        txt += `${ch.content}\n\n`;
        txt += `${'─'.repeat(40)}\n\n`;
      }

      return new Response(txt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(novel.title)}.txt"`,
        },
      });
    }
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
