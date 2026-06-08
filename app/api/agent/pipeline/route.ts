import { NextRequest } from 'next/server';
import { runStreamingPipeline } from '@/lib/novel-pro';
import { ModelType } from '@/lib/models';
import { PipelineConfig, DEFAULT_PIPELINE_CONFIG } from '@/types/pipeline';

// POST /api/agent/pipeline — SSE streaming pipeline endpoint

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      chapterId,
      novelId = 'default',
      model = 'mimo',
      maxRevisionRounds,
      auditDimensions,
      autoSave,
    } = body;

    if (!chapterId) {
      return new Response(
        JSON.stringify({ error: 'Chapter ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 合并配置
    const config: PipelineConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      ...(maxRevisionRounds !== undefined && { maxRevisionRounds }),
      ...(auditDimensions !== undefined && { auditDimensions }),
      ...(autoSave !== undefined && { autoSave }),
    };

    // SSE 流式响应
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const emit = (event: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          await runStreamingPipeline(
            chapterId,
            novelId,
            model as ModelType,
            config,
            emit,
          );
        } catch (err) {
          emit({
            type: 'pipeline_error',
            pipelineId: '',
            data: { error: err instanceof Error ? err.message : 'Unknown error' },
            timestamp: new Date().toISOString(),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Pipeline SSE error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to start pipeline',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
