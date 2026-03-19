'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface TocItem {
  id: string
  text: string
  level: number
}

/** 마크다운 텍스트에서 heading 목록 추출 */
export function extractHeadings(markdown: string): TocItem[] {
  const content = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
  const headings: TocItem[] = []
  const lines = content.split('\n')
  let inCodeBlock = false

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      headings.push({ id, text, level })
    }
  }

  return headings
}

interface DocTocProps {
  content: string
  scrollContainerRef?: React.RefObject<HTMLElement | null>
}

export default function DocToc({ content, scrollContainerRef }: DocTocProps) {
  const headings = useMemo(() => extractHeadings(content), [content])
  const [activeId, setActiveId] = useState<string>('')
  const isClickScrolling = useRef(false)

  const minLevel = useMemo(
    () => headings.reduce((min, h) => Math.min(min, h.level), 6),
    [headings]
  )

  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return

        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          const topmost = visible.reduce((prev, curr) =>
            curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev
          )
          setActiveId(topmost.target.id)
        }
      },
      {
        root: scrollContainerRef?.current ?? null,
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      }
    )

    const elements: Element[] = []
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) {
        observer.observe(el)
        elements.push(el)
      }
    }

    return () => {
      for (const el of elements) {
        observer.unobserve(el)
      }
    }
  }, [headings, scrollContainerRef])

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return

    setActiveId(id)
    isClickScrolling.current = true

    const container = scrollContainerRef?.current
    if (container) {
      const elTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
      container.scrollTo({ top: elTop - 20, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    setTimeout(() => {
      isClickScrolling.current = false
    }, 800)
  }, [scrollContainerRef])

  if (headings.length === 0) return null

  return (
    <div className="w-[260px] min-w-[260px] border-l border-border flex flex-col bg-card">
      <div className="px-3 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">목차</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2">
          {headings.map((heading, idx) => {
            const indent = heading.level - minLevel
            const isActive = heading.id === activeId
            return (
              <button
                key={`${idx}-${heading.id}`}
                onClick={() => handleClick(heading.id)}
                className={[
                  'w-full text-left py-1 px-2 rounded text-xs transition-colors block truncate',
                  isActive
                    ? 'text-primary font-medium bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                ].join(' ')}
                style={{ paddingLeft: `${8 + indent * 12}px` }}
                title={heading.text}
              >
                {heading.text}
              </button>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
