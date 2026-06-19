'use client'

import { Topbar } from '@/components/layout/topbar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProject } from '@/hooks/use-project'
import { useAgents } from '@/hooks/use-agents'
import { useIssuePolling } from '@/hooks/use-issue-polling'
import { useI18n } from '@/lib/i18n'
import { BuildingView } from '@/components/office/building-view'

export default function OfficePage() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null
  const { t } = useI18n()
  const { agents, loading: agentsLoading } = useAgents(projectId)
  const { issues, loading: issuesLoading } = useIssuePolling({ projectId })

  if (!projectId) {
    return (
      <>
        <Topbar title={t('office.title')} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {t('common.selectProjectShort')}
        </div>
      </>
    )
  }

  const loading = agentsLoading || issuesLoading

  return (
    <>
      <Topbar
        title={t('office.title')}
        subtitle={t('office.subtitle')}
      />
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">
              {t('common.loading')}
            </div>
          ) : (
            <BuildingView agents={agents} issues={issues} />
          )}
        </div>
      </ScrollArea>
    </>
  )
}
