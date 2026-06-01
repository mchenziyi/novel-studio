import { NextRequest, NextResponse } from 'next/server';
import { getAvailableModels, getModelInfo, testModel } from '@/lib/models';
import { ModelType } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const models = getAvailableModels();
    const modelInfo = models.map(model => ({
      id: model,
      ...getModelInfo(model),
    }));

    return NextResponse.json(modelInfo);
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model } = body;

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    const success = await testModel(model as ModelType);

    return NextResponse.json({
      success,
      model,
    });
  } catch (error) {
    console.error('Failed to test model:', error);
    return NextResponse.json(
      { error: 'Failed to test model' },
      { status: 500 }
    );
  }
}
