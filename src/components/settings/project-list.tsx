'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/types/project'

interface ProjectListProps {
  projects: Project[]
  currentProjectId: string | null
  onOpen: (project: Project) => void
  onInitialize: (project: Project) => Promise<boolean>
  onRemove: (project: Project) => void
}

export default function ProjectList({
  projects,
  currentProjectId,
  onOpen,
  onInitialize,
  onRemove,
}: ProjectListProps) {
  const [initStatus, setInitStatus] = useState<Record<string, boolean | null>>({})
  const [initLoading, setInitLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    projects.forEach(async (project) => {
      try {
        const res = await fetch(`/api/init?projectId=${encodeURIComponent(project.id)}`)
        if (res.ok) {
          const data = await res.json()
          setInitStatus((prev) => ({ ...prev, [project.id]: data.initialized }))
        }
      } catch {
        // ignore
      }
    })
  }, [projects])

  const handleInitialize = async (project: Project) => {
    setInitLoading((prev) => ({ ...prev, [project.id]: true }))
    try {
      const success = await onInitialize(project)
      if (success) {
        setInitStatus((prev) => ({ ...prev, [project.id]: true }))
      }
    } finally {
      setInitLoading((prev) => ({ ...prev, [project.id]: false }))
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        등록된 프로젝트가 없습니다
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">이름</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">경로</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">상태</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">작업</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => {
            const isCurrent = project.id === currentProjectId
            const initialized = initStatus[project.id]
            const loading = initLoading[project.id]
            return (
              <tr key={project.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{project.name}</span>
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px]">현재</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-mono text-muted-foreground">{project.path}</span>
                </td>
                <td className="py-3 px-4">
                  {initialized === null || initialized === undefined ? (
                    <Badge variant="outline" className="text-xs">확인 중...</Badge>
                  ) : initialized ? (
                    <Badge variant="default" className="text-xs bg-emerald-600">초기화됨</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">미초기화</Badge>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isCurrent && (
                      <Button size="sm" variant="outline" onClick={() => onOpen(project)}>
                        열기
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInitialize(project)}
                      disabled={loading}
                    >
                      {loading ? '초기화 중...' : initialized ? '재초기화' : '초기화'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onRemove(project)}>
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
