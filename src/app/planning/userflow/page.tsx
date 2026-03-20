'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import FlowDiagram from '@/components/ui/flow-diagram'
import { useProject } from '@/hooks/use-project'
import { useI18n } from '@/lib/i18n'
import { fileService } from '@/lib/services/file-service'
import type { UserFlowData } from '@/types/userflow'

const FALLBACK_FLOW: UserFlowData = {
  version: '1.0',
  project: '',
  sections: [],
}

export default function UserFlowPage() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null
  const { t } = useI18n()

  const [flow, setFlow] = useState<UserFlowData>(FALLBACK_FLOW)
  const [dataExists, setDataExists] = useState(true)

  useEffect(() => {
    if (!projectId) return
    fileService.readFile(projectId, 'data/userflow.json')
      .then(({ content, exists }) => {
        setDataExists(exists)
        if (exists) {
          try {
            const parsed = JSON.parse(content)
            setFlow({ ...FALLBACK_FLOW, ...parsed, sections: parsed.sections ?? [] })
          } catch { /* fallback */ }
        }
      })
      .catch(() => {})
  }, [projectId])

  if (!projectId) {
    return (
      <>
        <Topbar title={t('planning.userflow.title')} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t('common.selectProjectShort')}</div>
      </>
    )
  }

  if (!dataExists || flow.sections.length === 0) {
    return (
      <>
        <Topbar title={t('planning.userflow.title')} />
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <span className="text-3xl">🔀</span>
          <p className="text-sm">{t('planning.userflow.noData')}</p>
          <p className="text-xs">{t('planning.userflow.addFile')}</p>
        </div>
      </>
    )
  }

  const Legend = () => (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {[
        { label: t('planning.userflow.start'), cls: 'bg-foreground' },
        { label: t('planning.userflow.section'), cls: 'bg-primary' },
        { label: t('planning.userflow.page'), cls: 'bg-accent border border-primary/30' },
        { label: t('planning.userflow.action'), cls: 'bg-card border border-border' },
      ].map(({ label, cls }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded ${cls} inline-block`} />
          {label}
        </span>
      ))}
    </div>
  )

  return (
    <>
      <Topbar title={t('planning.userflow.title')} right={<Legend />} />
      <FlowDiagram data={flow} />
    </>
  )
}
