import {
  parseMarkdownHeadings,
  parseMarkdownLists,
  parseMarkdownTable,
  parseMarkdownCodeBlocks,
  parseMarkdownLinks,
  parseMarkdownImages,
  analyzeMarkdown,
} from '@/lib/parsers'

describe('Markdown Parsers', () => {
  describe('parseMarkdownHeadings', () => {
    it('should parse h1 headings', () => {
      const result = parseMarkdownHeadings('# Title')
      expect(result).toEqual([{ level: 1, title: 'Title', line: 1 }])
    })

    it('should parse multiple heading levels', () => {
      const content = '# H1\n## H2\n### H3\n#### H4'
      const result = parseMarkdownHeadings(content)
      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({ level: 1, title: 'H1', line: 1 })
      expect(result[1]).toEqual({ level: 2, title: 'H2', line: 2 })
      expect(result[2]).toEqual({ level: 3, title: 'H3', line: 3 })
      expect(result[3]).toEqual({ level: 4, title: 'H4', line: 4 })
    })

    it('should ignore non-heading lines', () => {
      const content = 'Regular text\n# Heading\nMore text'
      const result = parseMarkdownHeadings(content)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Heading')
    })

    it('should handle empty content', () => {
      expect(parseMarkdownHeadings('')).toEqual([])
    })

    it('should handle headings with special characters', () => {
      const result = parseMarkdownHeadings('# Title with **bold** and *italic*')
      expect(result[0].title).toBe('Title with **bold** and *italic*')
    })
  })

  describe('parseMarkdownLists', () => {
    it('should parse unordered lists with dash', () => {
      const content = '- Item 1\n- Item 2\n- Item 3'
      const result = parseMarkdownLists(content)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('unordered')
      expect(result[0].items).toEqual(['Item 1', 'Item 2', 'Item 3'])
    })

    it('should parse unordered lists with asterisk', () => {
      const content = '* Item 1\n* Item 2'
      const result = parseMarkdownLists(content)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('unordered')
    })

    it('should parse ordered lists', () => {
      const content = '1. First\n2. Second\n3. Third'
      const result = parseMarkdownLists(content)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('ordered')
      expect(result[0].items).toEqual(['First', 'Second', 'Third'])
    })

    it('should handle multiple separate lists', () => {
      const content = '- Item A\n\n1. Item B\n2. Item C'
      const result = parseMarkdownLists(content)
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('unordered')
      expect(result[1].type).toBe('ordered')
    })

    it('should handle empty content', () => {
      expect(parseMarkdownLists('')).toEqual([])
    })
  })

  describe('parseMarkdownTable', () => {
    it('should parse a simple table', () => {
      const content = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |'
      const result = parseMarkdownTable(content)
      expect(result).not.toBeNull()
      expect(result?.headers).toEqual(['Name', 'Age'])
      expect(result?.rows).toEqual([
        ['Alice', '30'],
        ['Bob', '25'],
      ])
    })

    it('should return null for non-table content', () => {
      const result = parseMarkdownTable('Just regular text')
      expect(result).toBeNull()
    })

    it('should handle empty content', () => {
      expect(parseMarkdownTable('')).toBeNull()
    })
  })

  describe('parseMarkdownCodeBlocks', () => {
    it('should parse code blocks with language', () => {
      const content = '```typescript\nconst x = 1;\n```'
      const result = parseMarkdownCodeBlocks(content)
      expect(result).toHaveLength(1)
      expect(result[0].language).toBe('typescript')
      expect(result[0].code).toBe('const x = 1;')
    })

    it('should parse code blocks without language', () => {
      const content = '```\nsome code\n```'
      const result = parseMarkdownCodeBlocks(content)
      expect(result).toHaveLength(1)
      expect(result[0].language).toBe('text')
    })

    it('should handle multiple code blocks', () => {
      const content = '```js\na\n```\n\n```py\nb\n```'
      const result = parseMarkdownCodeBlocks(content)
      expect(result).toHaveLength(2)
      expect(result[0].language).toBe('js')
      expect(result[1].language).toBe('py')
    })

    it('should handle empty content', () => {
      expect(parseMarkdownCodeBlocks('')).toEqual([])
    })
  })

  describe('parseMarkdownLinks', () => {
    it('should parse links', () => {
      const content = 'Check [Google](https://google.com) and [GitHub](https://github.com)'
      const result = parseMarkdownLinks(content)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ text: 'Google', url: 'https://google.com', line: 1 })
      expect(result[1]).toEqual({ text: 'GitHub', url: 'https://github.com', line: 1 })
    })

    it('should handle links on different lines', () => {
      const content = '[Link 1](url1)\n[Link 2](url2)'
      const result = parseMarkdownLinks(content)
      expect(result).toHaveLength(2)
      expect(result[0].line).toBe(1)
      expect(result[1].line).toBe(2)
    })

    it('should handle empty content', () => {
      expect(parseMarkdownLinks('')).toEqual([])
    })
  })

  describe('parseMarkdownImages', () => {
    it('should parse images', () => {
      const content = '![Alt text](image.png)'
      const result = parseMarkdownImages(content)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ alt: 'Alt text', url: 'image.png', line: 1 })
    })

    it('should parse images with empty alt text', () => {
      const content = '![](image.png)'
      const result = parseMarkdownImages(content)
      expect(result).toHaveLength(1)
      expect(result[0].alt).toBe('')
    })

    it('should handle empty content', () => {
      expect(parseMarkdownImages('')).toEqual([])
    })
  })

  describe('analyzeMarkdown', () => {
    it('should count words correctly', () => {
      const result = analyzeMarkdown('Hello world foo bar')
      expect(result.wordCount).toBe(4)
    })

    it('should count characters correctly', () => {
      const result = analyzeMarkdown('Hello')
      expect(result.charCount).toBe(5)
    })

    it('should count lines correctly', () => {
      const result = analyzeMarkdown('Line 1\nLine 2\nLine 3')
      expect(result.lineCount).toBe(3)
    })

    it('should count paragraphs correctly', () => {
      const result = analyzeMarkdown('Para 1\n\nPara 2\n\nPara 3')
      expect(result.paragraphCount).toBe(3)
    })

    it('should count headings correctly', () => {
      const result = analyzeMarkdown('# H1\n## H2\n## H3')
      expect(result.headingCount).toBe(3)
    })

    it('should handle empty content', () => {
      const result = analyzeMarkdown('')
      expect(result.wordCount).toBe(0)
      expect(result.charCount).toBe(0)
      expect(result.lineCount).toBe(1)
    })
  })
})
