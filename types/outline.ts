export interface Outline {
  title: string;
  synopsis: string;
  volumes: Volume[];
}

export interface Volume {
  id: string;
  title: string;
  description: string;
  chapters: OutlineChapter[];
}

export interface OutlineChapter {
  id: string;
  title: string;
  summary: string;
  keyEvents: string[];
  status: 'planned' | 'writing' | 'completed';
}

export interface Plotline {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'resolved';
  chapters: PlotlineChapter[];
}

export interface PlotlineChapter {
  chapter: number;
  event: string;
  importance: 'major' | 'minor';
}
