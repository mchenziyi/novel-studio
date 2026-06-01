export interface GitStatus {
  current: string | null;
  tracking: string | null;
  ahead: number;
  behind: number;
  created: string[];
  deleted: string[];
  modified: string[];
  renamed: { from: string; to: string }[];
  staged: string[];
  notAdded: string[];
  conflicted: string[];
  isClean: boolean;
}

export interface GitCommit {
  hash: string;
  date: Date;
  message: string;
  author: string;
  email: string;
  body?: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  label?: string;
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  changes: GitDiffChange[];
}

export interface GitDiffChange {
  type: 'add' | 'delete' | 'normal';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface GitDiffFile {
  path: string;
  oldPath?: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
}
