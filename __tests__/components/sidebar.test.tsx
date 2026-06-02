import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Sidebar } from '@/components/layout/sidebar'

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

import { usePathname } from 'next/navigation'

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all navigation items', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/')

    render(<Sidebar />)

    expect(screen.getByText('概览')).toBeInTheDocument()
    expect(screen.getByText('章节')).toBeInTheDocument()
    expect(screen.getByText('大纲')).toBeInTheDocument()
    expect(screen.getByText('角色')).toBeInTheDocument()
    expect(screen.getByText('伏笔')).toBeInTheDocument()
    expect(screen.getByText('搜索')).toBeInTheDocument()
    expect(screen.getByText('统计')).toBeInTheDocument()
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('should highlight the active route', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/chapters')

    render(<Sidebar />)

    const chaptersLink = screen.getByText('章节').closest('a')
    expect(chaptersLink?.style.backgroundColor).toBe('rgb(23, 23, 23)')
  })

  it('should not highlight inactive routes', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/chapters')

    render(<Sidebar />)

    const overviewLink = screen.getByText('概览').closest('a')
    expect(overviewLink?.style.backgroundColor).toBe('transparent')
  })

  it('should highlight sub-routes correctly', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/chapters/123')

    render(<Sidebar />)

    const chaptersLink = screen.getByText('章节').closest('a')
    expect(chaptersLink?.style.backgroundColor).toBe('rgb(23, 23, 23)')
  })

  it('should render the logo', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/')

    render(<Sidebar />)

    expect(screen.getByText('Novel Studio')).toBeTruthy()
  })
})
