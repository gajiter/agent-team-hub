'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import FlowDiagram from '@/components/ui/flow-diagram'
import { useProject } from '@/hooks/use-project'
import type { UserFlowData } from '@/types/userflow'

const FALLBACK_FLOW: UserFlowData = {
  version: '1.0',
  project: '',
  sections: [],
}

export default function UserFlowPage() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null

  const [flow, setFlow] = useState<UserFlowData>(FALLBACK_FLOW)
  const [dataExists, setDataExists] = useState(true)

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/files?projectId=${projectId}&path=data/userflow.json`)
      .then(r => r.json())
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
        <Topbar title="유저 플로우" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">프로젝트를 선택하세요</div>
      </>
    )
  }

  if (!dataExists || flow.sections.length === 0) {
    return (
      <>
        <Topbar title="유저 플로우" />
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <span className="text-3xl">🔀</span>
          <p className="text-sm">유저 플로우 데이터가 아직 없습니다</p>
          <p className="text-xs">data/userflow.json 파일을 프로젝트에 추가하세요</p>
        </div>
      </>
    )
  }

  const Legend = () => (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {[
        { label: '시작', cls: 'bg-foreground' },
        { label: '섹션', cls: 'bg-primary' },
        { label: '페이지', cls: 'bg-accent border border-primary/30' },
        { label: '행동', cls: 'bg-card border border-border' },
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
      <Topbar title="유저 플로우" right={<Legend />} />
      <FlowDiagram data={flow} />
    </>
  )
}
