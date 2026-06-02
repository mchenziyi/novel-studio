import { parseGitDiff } from '@/lib/git'

describe('Git Diff Parser', () => {
  describe('parseGitDiff', () => {
    it('should return empty array for empty input', () => {
      expect(parseGitDiff('')).toEqual([])
    })

    it('should parse a single file diff', () => {
      const diff = `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 line1
+added line
 line2
 line3`

      const result = parseGitDiff(diff)
      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('file.txt')
      expect(result[0].additions).toBe(1)
      expect(result[0].deletions).toBe(0)
    })

    it('should parse deleted lines', () => {
      const diff = `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,2 @@
 line1
-removed line
 line2`

      const result = parseGitDiff(diff)
      expect(result).toHaveLength(1)
      expect(result[0].additions).toBe(0)
      expect(result[0].deletions).toBe(1)
    })

    it('should detect added files', () => {
      const diff = `diff --git a/new.txt b/new.txt
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+line1
+line2`

      const result = parseGitDiff(diff)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('added')
      expect(result[0].additions).toBe(2)
    })

    it('should detect deleted files', () => {
      const diff = `diff --git a/old.txt b/old.txt
--- a/old.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-line1
-line2`

      const result = parseGitDiff(diff)
      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('')
      expect(result[0].deletions).toBe(2)
    })

    it('should detect renamed files', () => {
      const diff = `diff --git a/old.txt b/new.txt
--- a/old.txt
+++ b/new.txt
@@ -1,2 +1,2 @@
 line1
 line2`

      const result = parseGitDiff(diff)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('renamed')
      expect(result[0].path).toBe('new.txt')
      expect(result[0].oldPath).toBe('old.txt')
    })

    it('should parse multiple files', () => {
      const diff = `diff --git a/file1.txt b/file1.txt
--- a/file1.txt
+++ b/file1.txt
@@ -1,2 +1,3 @@
 line1
+added
 line2
diff --git a/file2.txt b/file2.txt
--- a/file2.txt
+++ b/file2.txt
@@ -1,2 +1,2 @@
-old
+new`

      const result = parseGitDiff(diff)
      expect(result).toHaveLength(2)
      expect(result[0].path).toBe('file1.txt')
      expect(result[1].path).toBe('file2.txt')
    })

    it('should parse hunks correctly', () => {
      const diff = `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt
@@ -1,5 +1,6 @@
 line1
+added1
 line2
 line3
+added2
 line4`

      const result = parseGitDiff(diff)
      expect(result[0].hunks).toHaveLength(1)
      expect(result[0].hunks[0].oldStart).toBe(1)
      expect(result[0].hunks[0].oldLines).toBe(5)
      expect(result[0].hunks[0].newStart).toBe(1)
      expect(result[0].hunks[0].newLines).toBe(6)
    })

    it('should parse changes within hunks', () => {
      const diff = `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 line1
-old
+new
 line3`

      const result = parseGitDiff(diff)
      const changes = result[0].hunks[0].changes
      expect(changes).toHaveLength(4)
      expect(changes[0]).toEqual({ type: 'normal', content: 'line1' })
      expect(changes[1]).toEqual({ type: 'delete', content: 'old' })
      expect(changes[2]).toEqual({ type: 'add', content: 'new' })
      expect(changes[3]).toEqual({ type: 'normal', content: 'line3' })
    })
  })
})
