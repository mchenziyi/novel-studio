import { NextRequest, NextResponse } from 'next/server';
import { migrateFromFileSystem } from '@/lib/db-migration';

export async function POST(request: NextRequest) {
  try {
    await migrateFromFileSystem();
    return NextResponse.json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
