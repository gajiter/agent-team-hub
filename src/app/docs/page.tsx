'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { Badge } from '@/components/ui/badge'
import { useProject } from '@/hooks/use-project'
import DocList from '@/components/docs/doc-list'
import DocViewer from '@/components/docs/doc-viewer'
import type { DocMeta, Category } from '@/components/docs/doc-list'

const CATEGORY_EMOJI: Record<string, string> = {
  plans: '📋',
  develop: '🛠️',
  research: '🔬',
}

function DocsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null

  const [docs, setDocs] = useState<DocMeta[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [docContent, setDocContent] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  const selectedPath = searchParams.get('path')

  // Load doc list
  useEffect(() => {
    if (!projectId) {
      setDocs([])
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/docs?projectId=${projectId}`)
      .then(r => r.json())
      .then(data => {
        setDocs(data.docs ?? [])
        setCategories(data.categories ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  // Load selected doc content
  useEffect(() => {
    if (!selectedPath || !projectId) {
      setDocContent(null)
      return
    }
    setDocLoading(true)
    fetch(`/api/files?projectId=${projectId}&path=${encodeURIComponent(selectedPath)}`)
      .then(r => r.json())
      .then(({ content, exists }) => {
        if (exists) setDocContent(content)
        else setDocContent(null)
      })
      .catch(() => setDocContent(null))
      .finally(() => setDocLoading(false))
  }, [selectedPath, projectId])

  const selectedDoc = useMemo(
    () => docs.find(d => d.path === selectedPath) ?? null,
    [docs, selectedPath]
  )

  const handleSelect = (path: string) => {
    router.replace(`/docs?path=${encodeURIComponent(path)}`, { scroll: false })
  }

  if (!projectId) {
    return (
      <>
        <Topbar title="문서" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          프로젝트를 선택하세요
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="문서"
        subtitle={selectedDoc ? selectedDoc.title : `${docs.length}개 문서`}
        right={
          <div className="flex items-center gap-2">
            {categories.map(cat => (
              <Badge key={cat.id} variant="outline" className="text-xs">
                {CATEGORY_EMOJI[cat.id] || '📄'} {cat.label} ({cat.count})
              </Badge>
            ))}
          </div>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <DocList
          docs={docs}
          categories={categories}
          selectedPath={selectedPath}
          loading={loading}
          onSelect={handleSelect}
        />
        <div className="flex-1 flex flex-col overflow-hidden bg-card">
          <DocViewer
            selectedDoc={selectedDoc}
            docContent={docContent}
            docLoading={docLoading}
            categories={categories}
            onSelectRef={handleSelect}
          />
        </div>
      </div>
    </>
  )
}

export default function DocsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        로딩 중...
      </div>
    }>
      <DocsPageContent />
    </Suspense>
  )
}
