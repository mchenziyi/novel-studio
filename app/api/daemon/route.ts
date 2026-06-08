import { NextRequest } from 'next/server';
import { runStreamingPipeline } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';
import { PipelineConfig, DEFAULT_PIPELINE_CONFIG } from '@/types/pipeline';
import { getDatabase } from '@/lib/database';

// 简单的内存守护进程状态（重启后重置）
let daemonState: {
  running: boolean;
  novelId: string;
  chaptersWritten: number;
  lastChapterId: number;
  startedAt: string;
  errors: string[];
  stoppedReason?: string;
} | null = null;

// GET /api/daemon — 查询守护进程状态
export async function GET() {
  return Response.json({ daemon: daemonState });
}

// POST /api/daemon — 启动/停止守护进程
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, novelId = 'default', model = 'mimo', maxChapters = 5 } = body;

  if (action === 'stop') {
    if (daemonState) {
      daemonState.running = false;
      daemonState.stoppedReason = '用户手动停止';
    }
    return Response.json({ success: true, message: '守护进程已停止' });
  }

  if (action === 'start') {
    if (daemonState?.running) {
      return Response.json({ error: '守护进程已在运行' }, { status: 400 });
    }

    // 启动守护进程（后台异步运行）
    daemonState = {
      running: true,
      novelId,
      chaptersWritten: 0,
      lastChapterId: getNextChapterId(novelId),
      startedAt: new Date().toISOString(),
      errors: [],
    };

    // 异步运行，不阻塞响应
    runDaemon(novelId, model, maxChapters).catch(err => {
      if (daemonState) {
        daemonState.running = false;
        daemonState.stoppedReason = `错误: ${err.message}`;
      }
    });

    return Response.json({ success: true, message: '守护进程已启动' });
  }

  return Response.json({ error: 'action 必须是 start/stop' }, { status: 400 });
}

function getNextChapterId(novelId: string): number {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT MAX(CAST(id AS INTEGER)) as max_id FROM chapters WHERE novel_id = ?'
  ).get(novelId) as any;
  return (row?.max_id || 0) + 1;
}

async function runDaemon(novelId: string, model: string, maxChapters: number) {
  const config: PipelineConfig = {
    ...DEFAULT_PIPELINE_CONFIG,
    autoSave: true,
  };

  while (daemonState?.running && daemonState.chaptersWritten < maxChapters) {
    const chapterId = daemonState.lastChapterId;

    try {
      const events: any[] = [];
      await runStreamingPipeline(chapterId, novelId, model as ModelType, config, (event) => {
        events.push(event);
      });

      daemonState.chaptersWritten++;
      daemonState.lastChapterId = chapterId + 1;

      // 检查审计结果，如果有 critical 问题则暂停
      const pipelineComplete = events.find(e => e.type === 'pipeline_complete');
      if (pipelineComplete?.data?.auditResult && !pipelineComplete.data.auditResult.passed) {
        const criticals = pipelineComplete.data.auditResult.criticalCount || 0;
        if (criticals > 0) {
          daemonState.running = false;
          daemonState.stoppedReason = `第${chapterId}章审计有 ${criticals} 个 critical 问题，需人工审阅`;
          break;
        }
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      daemonState.errors.push(`第${chapterId}章: ${errorMsg}`);

      // 连续失败3次则停止
      if (daemonState.errors.length >= 3) {
        daemonState.running = false;
        daemonState.stoppedReason = '连续失败 3 次，守护进程停止';
        break;
      }
    }
  }

  if (daemonState?.running) {
    daemonState.running = false;
    daemonState.stoppedReason = `已完成 ${daemonState.chaptersWritten} 章`;
  }
}
