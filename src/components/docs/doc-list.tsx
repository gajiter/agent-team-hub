'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/lib/i18n'

interface DocMeta {
  path: string
  title: string
  description: string
  author: string
  emoji: string
  type: string
  references: string[]
  createdAt: string
  category: string
  tokens: number
}

interface Category {
  id: string
  label: string
  count: number
}

const CLAUDE_TOKEN_LIMIT = 25000

function formatTokenCount(tokens: number): string {
  return tokens.toLocaleString()
}

function TokenBadge({ tokens, className = '' }: { tokens: number; className?: string }) {
  const isOver = tokens > CLAUDE_TOKEN_LIMIT
  const ratio = tokens / CLAUDE_TOKEN_LIMIT
  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-mono tabular-nums text-[11px]',
        isOver ? 'text-red-500 font-medium' : ratio > 0.8 ? 'text-amber-500' : 'text-muted-foreground',
        className,
      ].join(' ')}
      title={isOver ? `Token limit (${CLAUDE_TOKEN_LIMIT.toLocaleString()}) exceeded` : `Estimated tokens / limit`}
    >
      {formatTokenCount(tokens)}/{formatTokenCount(CLAUDE_TOKEN_LIMIT)}
    </span>
  )
}

interface DocListProps {
  docs: DocMeta[]
  categories: Category[]
  selectedPath: string | null
  loading: boolean
  onSelect: (path: string) => void
}

export type { DocMeta, Category }

export default function DocList({ docs, categories, selectedPath, loading, onSelect }: DocListProps) {
  const { t } = useI18n()
  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocMeta[]> = {}
    for (const doc of docs) {
      if (!groups[doc.category]) groups[doc.category] = []
      groups[doc.category].push(doc)
    }
    return groups
  }, [docs])

  return (
    <div className="w-[280px] min-w-[280px] border-r border-border flex flex-col bg-card">
      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              {t('docs.loadingDocs')}
            </div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              {t('docs.noData')}
            </div>
          ) : (
            Object.entries(groupedDocs).map(([category, categoryDocs]) => {
              const cat = categories.find(c => c.id === category)
              return (
                <div key={category} className="mb-4">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    <span>📁</span>
                    <span>{cat?.label || category}</span>
                  </div>
                  {categoryDocs.map(doc => {
                    const isSelected = doc.path === selectedPath
                    return (
                      <button
                        key={doc.path}
                        onClick={() => onSelect(doc.path)}
                        className={[
                          'w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors mb-0.5',
                          isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground hover:bg-accent/50',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base mt-0.5">{doc.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium line-clamp-2">{doc.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {doc.author && `by ${doc.author}`}
                              {doc.author && doc.createdAt && ' · '}
                              {doc.createdAt}
                            </div>
                            {doc.tokens > 0 && (
                              <TokenBadge tokens={doc.tokens} className="mt-0.5" />
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
