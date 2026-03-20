'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { Badge } from '@/components/ui/badge'
import { useProject } from '@/hooks/use-project'
import { useI18n } from '@/lib/i18n'
import DocList from '@/components/docs/doc-list'
import DocViewer from '@/components/docs/doc-viewer'
import DocToc from '@/components/docs/doc-toc'
import type { DocMeta, Category } from '@/components/docs/doc-list'
import { docService } from '@/lib/services/doc-service'
import { fileService } from '@/lib/services/file-service'

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
  const { t } = useI18n()

  const [docs, setDocs] = useState<DocMeta[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [docContent, setDocContent] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
    docService.getAll(projectId)
      .then(data => {
        setDocs(data.docs ?? [])
        setCategories((data.categories ?? []) as unknown as Category[])
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
    fileService.readFile(projectId, selectedPath)
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
        <Topbar title={t('docs.title')} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {t('common.selectProjectShort')}
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={t('docs.title')}
        subtitle={selectedDoc ? selectedDoc.title : t('docs.docsCount', { count: docs.length })}
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

        {/* Document viewer + TOC */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden bg-card">
            <DocViewer
              selectedDoc={selectedDoc}
              selectedPath={selectedPath}
              docContent={docContent}
              docLoading={docLoading}
              categories={categories}
              onSelectRef={handleSelect}
              onNavigate={(path) => router.push(path)}
              scrollRef={scrollAreaRef}
            />
          </div>

          {selectedPath ? (
            docContent && !docLoading ? (
              <DocToc
                content={docContent}
                scrollContainerRef={scrollAreaRef}
              />
            ) : (
              <div className="w-[260px] min-w-[260px] border-l border-border" />
            )
          ) : null}
        </div>
      </div>
    </>
  )
}

export default function DocsPage() {
  const { t } = useI18n()
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {t('common.loading')}
      </div>
    }>
      <DocsPageContent />
    </Suspense>
  )
}
