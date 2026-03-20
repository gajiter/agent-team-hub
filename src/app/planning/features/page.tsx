'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import FeatureTreeView from '@/components/planning/feature-tree-view'
import FeatureDirectoryView from '@/components/planning/feature-directory-view'
import { useProject } from '@/hooks/use-project'
import { useI18n } from '@/lib/i18n'
import { fileService } from '@/lib/services/file-service'
import type { Feature, Requirement, Relation, FeaturesData } from '@/types/features'

type ViewMode = 'tree' | 'directory'
const VIEW_MODE_KEY = 'hub:features:viewMode'

const FALLBACK_REQUIREMENTS: Requirement[] = []
const FALLBACK_FEATURES: Feature[] = []

function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'tree'
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  return stored === 'directory' ? 'directory' : 'tree'
}

function FeaturesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null
  const { t } = useI18n()

  const [features, setFeatures] = useState<Feature[]>(FALLBACK_FEATURES)
  const [requirements, setRequirements] = useState<Requirement[]>(FALLBACK_REQUIREMENTS)
  const [relations, setRelations] = useState<Relation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode())
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dataExists, setDataExists] = useState(true)

  const urlFeatureId = searchParams.get('id')

  useEffect(() => {
    if (!projectId) return
    fileService.readFile(projectId, 'data/features.json')
      .then(({ content, exists }) => {
        setDataExists(exists)
        if (exists) {
          try {
            const data = JSON.parse(content)
            setFeatures(data.features ?? [])
            setRequirements(data.requirements ?? [])
            setRelations(data.relations ?? [])
          } catch { /* keep fallback */ }
        }
        setDataLoaded(true)
      })
      .catch(() => { setDataLoaded(true) })
  }, [projectId])

  useEffect(() => {
    if (!dataLoaded || !urlFeatureId) return
    const foundFeature = features.find(f => f.id === urlFeatureId)
    const foundReq = requirements.find(r => r.id === urlFeatureId)
    if (foundFeature) setSelectedId(foundFeature.id)
    else if (foundReq) setSelectedId(foundReq.id)
  }, [dataLoaded, urlFeatureId, features, requirements])

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }, [])

  const handleSelect = (id: string) => {
    const newId = id || null
    setSelectedId(newId)
    if (newId) {
      router.replace(`/planning/features?id=${encodeURIComponent(newId)}`, { scroll: false })
    } else {
      router.replace('/planning/features', { scroll: false })
    }
  }

  if (!projectId) {
    return (
      <>
        <Topbar title={t('planning.features.title')} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t('common.selectProjectShort')}</div>
      </>
    )
  }

  if (!dataExists) {
    return (
      <>
        <Topbar title={t('planning.features.title')} />
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <span className="text-3xl">🧩</span>
          <p className="text-sm">{t('planning.features.noData')}</p>
          <p className="text-xs">{t('planning.features.addFile')}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={t('planning.features.title')}
        right={
          <div className="flex items-center gap-3">
            <span className="text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              {requirements.length}{t('planning.features.requirements')}
            </span>
            <span className="text-sm bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
              {features.length}{t('planning.features.featuresCount')}
            </span>
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => handleSetViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'tree' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('planning.features.treeView')}
              </button>
              <button
                onClick={() => handleSetViewMode('directory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'directory' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('planning.features.directoryView')}
              </button>
            </div>
          </div>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'tree' ? (
          <FeatureTreeView features={features} requirements={requirements} relations={relations} selectedId={selectedId} onSelect={handleSelect} />
        ) : (
          <FeatureDirectoryView features={features} requirements={requirements} relations={relations} selectedId={selectedId} onSelect={handleSelect} onSwitchToTree={() => handleSetViewMode('tree')} />
        )}
      </div>
    </>
  )
}

export default function FeaturesPage() {
  const { t } = useI18n()
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">{t('common.loading')}</div>}>
      <FeaturesPageContent />
    </Suspense>
  )
}
