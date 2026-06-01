export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  file: string;
  status?: 'synced' | 'pending' | 'audit';
  lastModified?: Date;
}

export interface ChapterVersion {
  id: string;
  chapterId: string;
  content: string;
  timestamp: Date;
  source: 'manual' | 'agent' | 'rollback';
  agentName?: string;
  description?: string;
  gitCommitHash?: string;
}

export interface ChapterIntent {
  chapterId: number;
  goal: string;
  mustKeep: string[];
  mustAvoid: string[];
  foreshadowingAgenda: string[];
  emotionalTone: string;
}

export interface ContextPackage {
  characters: any[];
  foreshadowing: any[];
  plotlines: any[];
  rules: string[];
}
