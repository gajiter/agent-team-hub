'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useProject } from '@/hooks/use-project'
import { useAgents } from '@/hooks/use-agents'
import { useI18n } from '@/lib/i18n'
import { FolderOpen, Rocket } from 'lucide-react'
import type { Issue } from '@/types/issues'
import { fileService } from '@/lib/services/file-service'
import { docService } from '@/lib/services/doc-service'
import { issueService } from '@/lib/services/issue-service'
import { initService } from '@/lib/services/init-service'

interface DataEntry {
  icon: string
  name: string
  path: string
  href: string
  author: string
  exists?: boolean
}

interface DocMeta {
  path: string
  title: string
  emoji: string
  author: string
  category: string
}

const DATA_CANDIDATES: DataEntry[] = [
  { icon: '📘', name: 'PRD', path: 'data/prd.json', href: '/planning/prd', author: 'planner' },
  { icon: '⚙️', name: 'Features', path: 'data/features.json', href: '/planning/features', author: 'planner' },
  { icon: '🔀', name: 'User Flow', path: 'data/userflow.json', href: '/planning/userflow', author: 'planner' },
]

export default function DashboardPage() {
  const { currentProject, loading: projectLoading } = useProject()
  const projectId = currentProject?.id ?? null
  const { t } = useI18n()

  const [dataEntries, setDataEntries] = useState<DataEntry[]>([])
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [docsLoading, setDocsLoading] = useState(true)
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [projectInitialized, setProjectInitialized] = useState<boolean | null>(null)
  const { agents, loading: agentsLoading } = useAgents(projectId)

  // Check initialization status
  useEffect(() => {
    if (!projectId) {
      setProjectInitialized(null)
      return
    }
    fileService.readFile(projectId, '.hub/config.json')
      .then((data) => {
        setProjectInitialized(data.exists ?? false)
      })
      .catch(() => setProjectInitialized(false))
  }, [projectId])

  // Fetch data file existence
  useEffect(() => {
    if (!projectId) {
      setDataEntries([])
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    Promise.all(
      DATA_CANDIDATES.map((entry) =>
        fileService.readFile(projectId, entry.path)
          .then((data) => ({ ...entry, exists: data.exists }))
          .catch(() => ({ ...entry, exists: false }))
      )
    ).then((results) => {
      setDataEntries(results)
      setDataLoading(false)
    })
  }, [projectId])

  // Fetch docs
  useEffect(() => {
    if (!projectId) {
      setDocs([])
      setDocsLoading(false)
      return
    }
    setDocsLoading(true)
    docService.getAll(projectId)
      .then((data) => {
        setDocs(data.docs ?? [])
        setDocsLoading(false)
      })
      .catch(() => setDocsLoading(false))
  }, [projectId])

  // Fetch issues
  useEffect(() => {
    if (!projectId) {
      setIssues([])
      setIssuesLoading(false)
      return
    }
    setIssuesLoading(true)
    issueService.getAll(projectId)
      .then((data) => {
        setIssues(data ?? [])
        setIssuesLoading(false)
      })
      .catch(() => setIssuesLoading(false))
  }, [projectId])

  // Stats
  const issueStats = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const issue of issues) {
      byStatus[issue.status] = (byStatus[issue.status] || 0) + 1
    }
    return {
      total: issues.length,
      open: byStatus['open'] || 0,
      inProgress: byStatus['in-progress'] || 0,
      resolved: byStatus['resolved'] || 0,
      closed: byStatus['closed'] || 0,
      active: (byStatus['open'] || 0) + (byStatus['in-progress'] || 0),
    }
  }, [issues])

  const dataStats = useMemo(() => {
    const existing = dataEntries.filter((d) => d.exists)
    return { total: DATA_CANDIDATES.length, existing: existing.length }
  }, [dataEntries])

  // Recent issues (top 5)
  const recentIssues = useMemo(() => {
    return [...issues]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  }, [issues])

  // Handle initialize project
  async function handleInitialize() {
    if (!projectId) return
    setInitializing(true)
    try {
      await initService.init(projectId)
      setProjectInitialized(true)
    } catch {
      // ignore
    } finally {
      setInitializing(false)
    }
  }

  // Loading state
  if (projectLoading) {
    return (
      <>
        <Topbar title={t('dashboard.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </>
    )
  }

  // No project selected
  if (!currentProject) {
    return (
      <>
        <Topbar title={t('dashboard.title')} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <FolderOpen className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t('common.selectProject')}</p>
          <Button asChild variant="outline">
            <Link href="/settings">{t('common.goToSettings')}</Link>
          </Button>
        </div>
      </>
    )
  }

  // Project not initialized
  if (projectInitialized === false) {
    return (
      <>
        <Topbar title={t('dashboard.title')} subtitle={currentProject.name} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Rocket className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t('dashboard.notInitialized')}</p>
          <Button onClick={handleInitialize} disabled={initializing}>
            {initializing ? t('dashboard.initializing') : t('dashboard.initializeProject')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title={t('dashboard.title')} subtitle={currentProject.name} />
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">{currentProject.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.data')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {dataLoading ? '-' : dataStats.existing}
                <span className="text-base font-normal text-muted-foreground">/{dataStats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.structuredData')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.docs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {docsLoading ? '-' : docs.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.markdownDocs')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.activeIssues')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {issuesLoading ? '-' : issueStats.active}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.openAndInProgress', { open: issueStats.open, inProgress: issueStats.inProgress })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.agents')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {agentsLoading ? '-' : agents.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {agents.slice(0, 3).map((a) => a.emoji).join(' ')}
                {agents.length > 3 && ` +${agents.length - 3}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Planning Data Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.deliverables')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium pb-1">
                {t('dashboard.dataViews')}
              </div>
              {dataEntries.map((entry) => (
                <DataRow key={entry.path} entry={entry} />
              ))}

              <Separator className="my-2" />

              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {t('dashboard.documents')}
                </span>
                <Link href="/docs" className="text-xs text-primary hover:underline">
                  {t('common.viewAll')}
                </Link>
              </div>
              {docsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">{t('common.loading')}</div>
              ) : docs.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noDocs')}</div>
              ) : (
                docs.map((doc) => (
                  <Link
                    key={doc.path}
                    href={`/docs?path=${encodeURIComponent(doc.path)}`}
                    className="flex items-center gap-3 py-2 px-2 rounded-md transition-colors hover:bg-accent/50"
                  >
                    <span className="text-base">{doc.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">{doc.author}</div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                      {t('dashboard.completed')}
                    </Badge>
                  </Link>
                ))
              )}

              {dataLoading && (
                <div className="text-sm text-muted-foreground py-4 text-center">{t('common.loading')}</div>
              )}
            </CardContent>
          </Card>

          {/* Recent Issues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.recentIssues')}</CardTitle>
              <Link href="/issues" className="text-xs text-primary hover:underline">
                {t('common.viewAll')}
              </Link>
            </CardHeader>
            <CardContent>
              {issuesLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">{t('common.loading')}</div>
              ) : recentIssues.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">{t('dashboard.noIssues')}</div>
              ) : (
                <div className="space-y-1">
                  {recentIssues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Team Grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.agentTeam')}</CardTitle>
            <Link href="/agents" className="text-xs text-primary hover:underline">
              {t('common.details')}
            </Link>
          </CardHeader>
          <CardContent>
            {agentsLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">{t('common.loading')}</div>
            ) : agents.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">{t('dashboard.noAgents')}</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {agents.map((agent) => {
                  const agentIssueCount = issues.filter(
                    (i) =>
                      (i.assignees?.includes(agent.name) ?? i.assignee === agent.name) &&
                      (i.status === 'open' || i.status === 'in-progress')
                  ).length

                  return (
                    <Link
                      key={agent.name}
                      href="/agents"
                      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/50"
                    >
                      <span className="text-2xl">{agent.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{agent.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {agent.description.split('.')[0]}
                        </div>
                      </div>
                      {agentIssueCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {agentIssueCount}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

/** Data view row component */
function DataRow({ entry }: { entry: DataEntry }) {
  const { t } = useI18n()
  const content = (
    <div className="flex items-center gap-3 py-2 px-2 rounded-md transition-colors hover:bg-accent/50">
      <span className="text-base">{entry.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{entry.name}</div>
        <div className="text-xs text-muted-foreground">{entry.author}</div>
      </div>
      {entry.exists ? (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
          {t('dashboard.completed')}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
          {t('dashboard.notCreated')}
        </Badge>
      )}
    </div>
  )

  if (entry.exists) {
    return <Link href={entry.href}>{content}</Link>
  }
  return content
}

/** Issue row for recent issues */
function IssueRow({ issue }: { issue: Issue }) {
  const { t } = useI18n()
  return (
    <Link
      href="/issues"
      className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-accent/50 transition-colors"
    >
      <StatusDot status={issue.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{issue.id}</span>
          <PriorityIndicator priority={issue.priority} />
        </div>
        <div className="text-sm text-foreground truncate">{issue.title}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(issue.updatedAt, t)}
        </span>
        {issue.comments.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {issue.comments.length} {t('common.comments')}
          </span>
        )}
      </div>
    </Link>
  )
}

/** Issue status dot */
function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    open: 'bg-blue-500',
    'in-progress': 'bg-amber-500 animate-pulse',
    resolved: 'bg-green-500',
    closed: 'bg-gray-400',
  }
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colorMap[status] ?? 'bg-gray-400'}`} />
}

/** Priority indicator */
function PriorityIndicator({ priority }: { priority: string }) {
  const meta: Record<string, { label: string; className: string }> = {
    critical: { label: 'Critical', className: 'text-red-600 dark:text-red-400' },
    high: { label: 'High', className: 'text-orange-600 dark:text-orange-400' },
    medium: { label: '', className: '' },
    low: { label: '', className: '' },
  }
  const m = meta[priority]
  if (!m?.label) return null
  return <span className={`text-xs font-medium ${m.className}`}>{m.label}</span>
}

/** Relative time format */
function formatRelativeTime(iso: string, t: (key: string, params?: Record<string, string | number>) => string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('time.justNow')
  if (mins < 60) return t('time.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('time.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  return t('time.daysAgo', { n: days })
}
