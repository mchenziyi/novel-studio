import simpleGit, { SimpleGit, StatusResult, LogResult } from 'simple-git';
import { GitStatus, GitCommit, GitDiffFile, GitDiffHunk, GitDiffChange } from '@/types';

const PROJECT_ROOT = process.env.NOVEL_PROJECT_PATH || '/Users/czy/Downloads/books/开局屠村现场-他们说我疯了';

// 初始化 Git 客户端
const git: SimpleGit = simpleGit(PROJECT_ROOT);

// 获取 Git 状态
export async function getGitStatus(): Promise<GitStatus> {
  const status = await git.status();
  return {
    current: status.current,
    tracking: status.tracking,
    ahead: status.ahead,
    behind: status.behind,
    created: status.created,
    deleted: status.deleted,
    modified: status.modified,
    renamed: status.renamed.map(r => ({ from: r.from, to: r.to })),
    staged: status.staged,
    notAdded: status.not_added,
    conflicted: status.conflicted,
    isClean: status.isClean(),
  };
}

// 获取 Git Diff（工作区）
export async function getGitDiff(filePath?: string): Promise<string> {
  if (filePath) {
    return await git.diff([filePath]);
  }
  return await git.diff();
}

// 获取 Git Staged Diff（暂存区）
export async function getGitStagedDiff(filePath?: string): Promise<string> {
  if (filePath) {
    return await git.diff(['--cached', filePath]);
  }
  return await git.diff(['--cached']);
}

// 获取 Git 提交历史
export async function getGitLog(maxCount: number = 50): Promise<GitCommit[]> {
  const log = await git.log({ maxCount });
  return log.all.map(commit => ({
    hash: commit.hash,
    date: new Date(commit.date),
    message: commit.message,
    author: commit.author_name,
    email: commit.author_email,
    body: commit.body,
  }));
}

// 添加文件到暂存区
export async function gitAdd(filePath: string | string[]): Promise<void> {
  await git.add(filePath);
}

// 创建 Git 提交
export async function gitCommit(message: string): Promise<string> {
  const result = await git.commit(message);
  return result.commit;
}

// 创建 Git 标签
export async function gitCreateTag(tagName: string, message?: string): Promise<void> {
  if (message) {
    await git.addAnnotatedTag(tagName, message);
  } else {
    await git.addTag(tagName);
  }
}

// 获取 Git 分支列表
export async function getGitBranches(): Promise<string[]> {
  const branches = await git.branchLocal();
  return branches.all;
}

// 切换 Git 分支
export async function gitCheckout(branchName: string): Promise<void> {
  await git.checkout(branchName);
}

// 创建 Git 分支
export async function gitCreateBranch(branchName: string): Promise<void> {
  await git.checkoutLocalBranch(branchName);
}

// 获取文件的 Git 历史
export async function getFileGitHistory(filePath: string, maxCount: number = 20): Promise<GitCommit[]> {
  const log = await git.log({ file: filePath, maxCount });
  return log.all.map(commit => ({
    hash: commit.hash,
    date: new Date(commit.date),
    message: commit.message,
    author: commit.author_name,
    email: commit.author_email,
    body: commit.body,
  }));
}

// 获取两个提交之间的差异
export async function getGitDiffBetweenCommits(
  oldCommit: string,
  newCommit: string,
  filePath?: string
): Promise<string> {
  const args = [oldCommit, newCommit];
  if (filePath) {
    args.push('--', filePath);
  }
  return await git.diff(args);
}

// 回滚到指定提交
export async function gitResetToCommit(commitHash: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
  await git.reset([`--${mode}`, commitHash]);
}

// 暂存所有更改
export async function gitAddAll(): Promise<void> {
  await git.add('.');
}

// 获取当前分支名
export async function getCurrentBranch(): Promise<string> {
  const status = await git.status();
  return status.current || 'main';
}

// 获取远程仓库信息
export async function getGitRemotes(): Promise<string[]> {
  const remotes = await git.getRemotes();
  return remotes.map(remote => remote.name);
}

// 推送到远程仓库
export async function gitPush(remote: string = 'origin', branch?: string): Promise<void> {
  if (branch) {
    await git.push(remote, branch);
  } else {
    await git.push(remote);
  }
}

// 从远程仓库拉取
export async function gitPull(remote: string = 'origin', branch?: string): Promise<void> {
  if (branch) {
    await git.pull(remote, branch);
  } else {
    await git.pull(remote);
  }
}

// 解析 Git Diff 输出
export function parseGitDiff(diffOutput: string): GitDiffFile[] {
  const files: GitDiffFile[] = [];
  const fileBlocks = diffOutput.split('diff --git');

  for (const block of fileBlocks) {
    if (!block.trim()) continue;

    const file = parseFileBlock(block);
    if (file) {
      files.push(file);
    }
  }

  return files;
}

function parseFileBlock(block: string): GitDiffFile | null {
  const lines = block.split('\n');
  let path = '';
  let oldPath = '';
  let status: GitDiffFile['status'] = 'modified';
  const hunks: GitDiffHunk[] = [];
  let additions = 0;
  let deletions = 0;

  let currentHunk: GitDiffHunk | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 解析文件路径
    if (line.startsWith('--- a/')) {
      oldPath = line.substring(6);
    } else if (line.startsWith('+++ b/')) {
      path = line.substring(6);
    }

    // 解析 Hunk 头
    else if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1]),
          oldLines: parseInt(match[2]),
          newStart: parseInt(match[3]),
          newLines: parseInt(match[4]),
          content: '',
          changes: [],
        };
        hunks.push(currentHunk);
      }
    }

    // 解析变更
    else if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.changes.push({
          type: 'add',
          content: line.substring(1),
        });
        additions++;
      } else if (line.startsWith('-')) {
        currentHunk.changes.push({
          type: 'delete',
          content: line.substring(1),
        });
        deletions++;
      } else {
        currentHunk.changes.push({
          type: 'normal',
          content: line.substring(1),
        });
      }
    }
  }

  // 确定文件状态
  if (oldPath && oldPath !== path) {
    status = 'renamed';
  } else if (additions > 0 && deletions === 0) {
    status = 'added';
  } else if (additions === 0 && deletions > 0) {
    status = 'deleted';
  }

  return {
    path,
    oldPath: oldPath !== path ? oldPath : undefined,
    status,
    hunks,
    additions,
    deletions,
  };
}
