'use client'

import { Badge } from '@/components/ui/badge'
import MarkdownViewer from '@/components/ui/MarkdownViewer'
import type { DocMeta, Category } from './doc-list'

const CATEGORY_EMOJI: Record<string, string> = {
  plans: '📋',
  develop: '🛠️',
  research: '🔬',
}

interface DocViewerProps {
  selectedDoc: DocMeta | null
  docContent: string | null
  docLoading: boolean
  categories: Category[]
  onSelectRef?: (path: string) => void
}

export default function DocViewer({
  selectedDoc,
  docContent,
  docLoading,
  categories,
  onSelectRef,
}: DocViewerProps) {
  if (!selectedDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <span className="text-4xl">📄</span>
        <p className="text-sm">문서를 선택하세요</p>
        <p className="text-xs max-w-sm text-center">
          왼쪽 목록에서 문서를 선택하면 여기에 내용이 표시됩니다.
          문서는 <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/</code> 디렉토리에서 자동으로 스캔됩니다.
        </p>
      </div>
    )
  }

  if (docLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        문서를 불러오는 중...
      </div>
    )
  }

  if (docContent === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive text-sm">
        문서를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-4xl">
        {/* Metadata header */}
        <div className="mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{selectedDoc.emoji}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground">{selectedDoc.title}</h1>
              {selectedDoc.description && (
                <p className="text-sm text-muted-foreground">{selectedDoc.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {selectedDoc.author && (
              <Badge variant="outline" className="text-xs">{selectedDoc.author}</Badge>
            )}
            {selectedDoc.createdAt && (
              <span className="text-xs text-muted-foreground">{selectedDoc.createdAt}</span>
            )}
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_EMOJI[selectedDoc.category] || '📄'} {categories.find(c => c.id === selectedDoc.category)?.label || selectedDoc.category}
            </Badge>
          </div>
          {/* References */}
          {selectedDoc.references && selectedDoc.references.length > 0 && (
            <div className="mt-3 flex items-start gap-2">
              <span className="text-xs text-muted-foreground shrink-0 pt-0.5">참조:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedDoc.references.map((ref) => (
                  <Badge
                    key={ref}
                    variant="outline"
                    className="text-xs font-mono cursor-pointer hover:bg-accent"
                    onClick={() => {
                      if (ref.endsWith('.md') && onSelectRef) {
                        onSelectRef(ref)
                      }
                    }}
                  >
                    {ref.split('/').pop()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <MarkdownViewer content={docContent} />
      </div>
    </div>
  )
}
