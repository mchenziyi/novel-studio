import { NextRequest, NextResponse } from 'next/server';
import { getModelRoutes, saveModelRoutes, setAgentModel, removeAgentModel } from '@/lib/model-routes';

// GET /api/model-routes?novelId=default — 获取模型路由配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    const routes = getModelRoutes(novelId);
    return NextResponse.json({ routes });
  } catch (error) {
    return NextResponse.json({ error: '获取模型路由失败' }, { status: 500 });
  }
}

// PUT /api/model-routes — 更新单个 agent 的模型路由
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId = 'default', agentId, modelId } = body;

    if (!agentId || !modelId) {
      return NextResponse.json({ error: 'agentId 和 modelId 必填' }, { status: 400 });
    }

    setAgentModel(novelId, agentId, modelId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '更新模型路由失败' }, { status: 500 });
  }
}

// POST /api/model-routes — 批量保存路由配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { novelId = 'default', routes } = body;

    if (!Array.isArray(routes)) {
      return NextResponse.json({ error: 'routes 必须是数组' }, { status: 400 });
    }

    saveModelRoutes(novelId, routes);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '保存模型路由失败' }, { status: 500 });
  }
}

// DELETE /api/model-routes — 移除 agent 模型路由
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get('novelId') || 'default';
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId 必填' }, { status: 400 });
    }

    removeAgentModel(novelId, agentId as any);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '删除模型路由失败' }, { status: 500 });
  }
}
