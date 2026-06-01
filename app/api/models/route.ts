import { NextRequest, NextResponse } from 'next/server';
import {
  getModelConfigs,
  addModelConfig,
  updateModelConfig,
  deleteModelConfig,
  testModelConnection,
} from '@/lib/model-config';
import { ModelProvider, MODEL_PRESETS } from '@/types/model';

// 获取所有模型配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 获取预设信息
    if (action === 'presets') {
      return NextResponse.json({
        presets: MODEL_PRESETS,
      });
    }

    const configs = await getModelConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Failed to get model configs:', error);
    return NextResponse.json(
      { error: '获取模型配置失败' },
      { status: 500 }
    );
  }
}

// 添加模型配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // 测试模型连接
    if (action === 'test') {
      const { modelId } = data;
      const result = await testModelConnection(modelId);
      return NextResponse.json(result);
    }

    // 添加模型配置
    const { name, provider, settings, enabled = true, isDefault = false } = data;

    if (!name || !provider || !settings) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const config = await addModelConfig({
      name,
      provider: provider as ModelProvider,
      settings,
      enabled,
      isDefault,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to add model config:', error);
    return NextResponse.json(
      { error: '添加模型配置失败' },
      { status: 500 }
    );
  }
}

// 更新模型配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少模型 ID' },
        { status: 400 }
      );
    }

    const config = await updateModelConfig(id, updates);
    if (!config) {
      return NextResponse.json(
        { error: '模型配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to update model config:', error);
    return NextResponse.json(
      { error: '更新模型配置失败' },
      { status: 500 }
    );
  }
}

// 删除模型配置
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少模型 ID' },
        { status: 400 }
      );
    }

    const success = await deleteModelConfig(id);
    if (!success) {
      return NextResponse.json(
        { error: '模型配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete model config:', error);
    return NextResponse.json(
      { error: '删除模型配置失败' },
      { status: 500 }
    );
  }
}
