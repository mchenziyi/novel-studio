import { getChapter } from '@/lib/file-system';
import { notFound } from 'next/navigation';
import ChapterEditor from './chapter-editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { id } = await params;
  const chapter = await getChapter(id);

  if (!chapter) {
    notFound();
  }

  return <ChapterEditor chapter={chapter} />;
}
