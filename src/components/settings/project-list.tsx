'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'
import { initService } from '@/lib/services/init-service'
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
  const { t } = useI18n()

  useEffect(() => {
    projects.forEach(async (project) => {
      try {
        const initialized = await initService.checkInit(project.id)
        setInitStatus((prev) => ({ ...prev, [project.id]: initialized }))
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
        {t('settings.noProjects')}
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('settings.name')}</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('settings.path')}</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('settings.statusCol')}</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('settings.actions')}</th>
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
                      <Badge variant="default" className="text-[10px]">{t('common.current')}</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-mono text-muted-foreground">{project.path}</span>
                </td>
                <td className="py-3 px-4">
                  {initialized === null || initialized === undefined ? (
                    <Badge variant="outline" className="text-xs">{t('common.checking')}</Badge>
                  ) : initialized ? (
                    <Badge variant="default" className="text-xs bg-emerald-600">{t('settings.initialized')}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">{t('settings.notInitialized')}</Badge>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isCurrent && (
                      <Button size="sm" variant="outline" onClick={() => onOpen(project)}>
                        {t('settings.open')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInitialize(project)}
                      disabled={loading}
                    >
                      {loading ? t('settings.initializingDots') : initialized ? t('settings.reinitialize') : t('settings.initialize')}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onRemove(project)}>
                      {t('common.delete')}
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
