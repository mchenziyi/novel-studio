import { NextRequest, NextResponse } from 'next/server';
import { getCharacters } from '@/lib/file-system';

export async function GET(request: NextRequest) {
  try {
    const characters = await getCharacters();
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
}
