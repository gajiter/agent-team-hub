'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import IssueList from '@/components/issues/issue-list'
import IssueDetail from '@/components/issues/issue-detail'
import IssueCreateDialog from '@/components/issues/issue-create-dialog'
import IssueFilters from '@/components/issues/issue-filters'
import PollingIndicator from '@/components/issues/polling-indicator'
import { useIssuePolling } from '@/hooks/use-issue-polling'
import { useAgents } from '@/hooks/use-agents'
import { useProject } from '@/hooks/use-project'
import type { Issue, IssueStatus, IssueType } from '@/types/issues'

export default function IssuesPage() {
  const { currentProject } = useProject()
  const projectId = currentProject?.id ?? null

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all')
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Archive mode
  const [archiveMode, setArchiveMode] = useState(false)
  const [archivedIssues, setArchivedIssues] = useState<Issue[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [confirmBulkArchive, setConfirmBulkArchive] = useState(false)
  const [bulkArchiving, setBulkArchiving] = useState(false)

  // Multi-select mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmSelectedDelete, setConfirmSelectedDelete] = useState(false)
  const [selectedDeleting, setSelectedDeleting] = useState(false)
  const [confirmSelectedArchive, setConfirmSelectedArchive] = useState(false)
  const [selectedArchiving, setSelectedArchiving] = useState(false)

  // Dynamic agent list
  const { agents, agentNames } = useAgents(projectId)

  // Polling-based issue data management
  const {
    issues,
    locks,
    loading,
    lastSyncAt,
    syncCount,
    connected,
    refresh,
  } = useIssuePolling({ projectId, intervalMs: 3000 })

  // Reset selection when project changes
  useEffect(() => {
    setSelectedId(null)
    setSelectMode(false)
    setSelectedIds(new Set())
    setArchiveMode(false)
  }, [projectId])

  // Fetch archived issues
  const fetchArchived = useCallback(async () => {
    if (!projectId) return
    setArchiveLoading(true)
    try {
      const res = await fetch(`/api/issues/archive?projectId=${projectId}`)
      const data: { issues: Issue[] } = await res.json()
      setArchivedIssues(
        [...(data.issues || [])].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      )
    } catch {
      /* ignore */
    } finally {
      setArchiveLoading(false)
    }
  }, [projectId])

  // Load archived issues when entering archive mode
  useEffect(() => {
    if (archiveMode) {
      fetchArchived()
    }
  }, [archiveMode, fetchArchived])

  // Filter counts (active issues only)
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}
    for (const issue of issues) {
      byStatus[issue.status] = (byStatus[issue.status] || 0) + 1
      byType[issue.type] = (byType[issue.type] || 0) + 1
    }
    return { byStatus, byType, total: issues.length }
  }, [issues])

  // Filtered issues (active mode)
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (statusFilter !== 'all' && issue.status !== statusFilter) return false
      if (typeFilter !== 'all' && issue.type !== typeFilter) return false
      return true
    })
  }, [issues, statusFilter, typeFilter])

  // Current display issues
  const displayIssues = archiveMode ? archivedIssues : filteredIssues

  const selectedIssue = archiveMode
    ? archivedIssues.find((i) => i.id === selectedId) ?? null
    : issues.find((i) => i.id === selectedId) ?? null
  const selectedLock = selectedId ? locks.get(selectedId) ?? null : null

  // Toggle archive mode
  const handleToggleArchive = useCallback(() => {
    setArchiveMode((prev) => !prev)
    setSelectedId(null)
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  // Toggle select mode
  const handleToggleSelectMode = useCallback(() => {
    if (selectMode) {
      setSelectMode(false)
      setSelectedIds(new Set())
      setConfirmSelectedDelete(false)
      setConfirmSelectedArchive(false)
    } else {
      setSelectMode(true)
    }
  }, [selectMode])

  // Toggle individual item
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Select all filtered
  const handleSelectAll = useCallback(() => {
    const allIds = displayIssues.map(i => i.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }, [displayIssues, selectedIds])

  // Delete selected issues
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || !projectId) return
    setSelectedDeleting(true)
    try {
      const endpoint = archiveMode ? '/api/issues/archive' : '/api/issues'
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), projectId }),
      })
      if (res.ok) {
        if (selectedId && selectedIds.has(selectedId)) {
          setSelectedId(null)
        }
        setSelectedIds(new Set())
        setSelectMode(false)
        if (archiveMode) {
          await fetchArchived()
        } else {
          await refresh()
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSelectedDeleting(false)
      setConfirmSelectedDelete(false)
    }
  }

  // Archive selected issues
  const handleArchiveSelected = async () => {
    if (selectedIds.size === 0 || !projectId) return
    setSelectedArchiving(true)
    try {
      const res = await fetch('/api/issues/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: 'archive', projectId }),
      })
      if (res.ok) {
        if (selectedId && selectedIds.has(selectedId)) {
          setSelectedId(null)
        }
        setSelectedIds(new Set())
        setSelectMode(false)
        await refresh()
      }
    } catch {
      /* ignore */
    } finally {
      setSelectedArchiving(false)
      setConfirmSelectedArchive(false)
    }
  }

  // Archive single issue
  const handleArchive = async (id: string) => {
    if (!projectId) return
    try {
      const res = await fetch('/api/issues/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], action: 'archive', projectId }),
      })
      if (res.ok) {
        if (selectedId === id) setSelectedId(null)
        await refresh()
      }
    } catch {
      /* ignore */
    }
  }

  // Unarchive single issue
  const handleUnarchive = async (id: string) => {
    if (!projectId) return
    try {
      const res = await fetch('/api/issues/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], action: 'unarchive', projectId }),
      })
      if (res.ok) {
        if (selectedId === id) setSelectedId(null)
        await fetchArchived()
        await refresh()
      }
    } catch {
      /* ignore */
    }
  }

  // Create issue
  const handleCreate = async (data: {
    title: string
    description: string
    priority: string
    type: string
    assignees: string[]
    labels: string[]
  }) => {
    if (!projectId) return
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      })
      if (res.ok) {
        const newIssue: Issue = await res.json()
        setSelectedId(newIssue.id)
        if (archiveMode) setArchiveMode(false)
        await refresh()
      }
    } catch {
      /* ignore */
    }
  }

  // Update issue
  const handleUpdate = async (updates: Partial<Issue>) => {
    if (!selectedId || !projectId) return
    const lockInfo = locks.get(selectedId)
    if (lockInfo?.locked) return

    try {
      const res = await fetch('/api/issues', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, ...updates, projectId }),
      })
      if (res.ok) {
        await refresh()
      }
    } catch {
      /* ignore */
    }
  }

  // Delete single issue
  const handleDelete = async (id: string) => {
    if (!projectId) return
    try {
      const endpoint = archiveMode ? '/api/issues/archive' : '/api/issues'
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], projectId }),
      })
      if (res.ok) {
        if (selectedId === id) setSelectedId(null)
        if (archiveMode) {
          await fetchArchived()
        } else {
          await refresh()
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Bulk archive resolved issues
  const resolvedIssues = useMemo(
    () => issues.filter((i) => i.status === 'resolved' || i.status === 'closed'),
    [issues]
  )

  const handleBulkArchiveResolved = async () => {
    if (resolvedIssues.length === 0 || !projectId) return
    setBulkArchiving(true)
    try {
      const res = await fetch('/api/issues/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: resolvedIssues.map((i) => i.id), action: 'archive', projectId }),
      })
      if (res.ok) {
        if (selectedId && resolvedIssues.some((i) => i.id === selectedId)) {
          setSelectedId(null)
        }
        await refresh()
      }
    } catch {
      /* ignore */
    } finally {
      setBulkArchiving(false)
      setConfirmBulkArchive(false)
    }
  }

  // Bulk delete resolved issues
  const handleBulkDeleteResolved = async () => {
    if (resolvedIssues.length === 0 || !projectId) return
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/issues', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: resolvedIssues.map((i) => i.id), projectId }),
      })
      if (res.ok) {
        if (selectedId && resolvedIssues.some((i) => i.id === selectedId)) {
          setSelectedId(null)
        }
        await refresh()
      }
    } catch {
      /* ignore */
    } finally {
      setBulkDeleting(false)
      setConfirmBulkDelete(false)
    }
  }

  // No project selected empty state
  if (!currentProject) {
    return (
      <>
        <Topbar title="Issues" subtitle="AI-Human Communication Channel" />
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <span className="text-4xl">{'\u{1F4CB}'}</span>
          <p className="text-sm font-medium">No project selected</p>
          <p className="text-xs max-w-sm text-center">
            Select a project from the sidebar to view and manage issues.
          </p>
        </div>
      </>
    )
  }

  // Stats for topbar
  const openCount = issues.filter((i) => i.status === 'open' || i.status === 'in-progress').length
  const lockedCount = locks.size

  const allDisplaySelected = displayIssues.length > 0 && displayIssues.every(i => selectedIds.has(i.id))

  return (
    <>
      <Topbar
        title="Issues"
        subtitle={archiveMode ? 'Archive' : 'AI-Human Communication Channel'}
        right={
          <div className="flex items-center gap-3">
            <PollingIndicator
              connected={connected}
              lastSyncAt={lastSyncAt}
              syncCount={syncCount}
              onRefresh={refresh}
            />
            {!archiveMode && lockedCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {lockedCount} locked
              </span>
            )}
            {!archiveMode && (
              <>
                <span className="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
                  {openCount} active
                </span>
                <span className="text-sm bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                  {issues.length} total
                </span>
              </>
            )}
            {archiveMode && (
              <span className="text-sm bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium">
                {archivedIssues.length} archived
              </span>
            )}

            {/* Bulk archive resolved (active mode only) */}
            {!archiveMode && resolvedIssues.length > 0 && !confirmBulkArchive && !confirmBulkDelete && !selectMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-slate-600 border-slate-300 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => setConfirmBulkArchive(true)}
              >
                Archive Resolved ({resolvedIssues.length})
              </Button>
            )}
            {confirmBulkArchive && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Archive {resolvedIssues.length}?
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={bulkArchiving}
                  onClick={handleBulkArchiveResolved}
                >
                  {bulkArchiving ? 'Archiving...' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={bulkArchiving}
                  onClick={() => setConfirmBulkArchive(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Bulk delete resolved (active mode only) */}
            {!archiveMode && resolvedIssues.length > 0 && !confirmBulkArchive && !confirmBulkDelete && !selectMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                onClick={() => setConfirmBulkDelete(true)}
              >
                Delete Resolved ({resolvedIssues.length})
              </Button>
            )}
            {confirmBulkDelete && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600 dark:text-red-400">
                  Delete {resolvedIssues.length}?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkDeleting}
                  onClick={handleBulkDeleteResolved}
                >
                  {bulkDeleting ? 'Deleting...' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={bulkDeleting}
                  onClick={() => setConfirmBulkDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            <Button size="sm" variant={selectMode ? 'secondary' : 'outline'} onClick={handleToggleSelectMode}>
              {selectMode ? 'Cancel Select' : 'Select'}
            </Button>
            {!archiveMode && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                + New Issue
              </Button>
            )}
          </div>
        }
      />

      {/* Selection toolbar */}
      {selectMode && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border">
          <button
            onClick={handleSelectAll}
            className="text-xs text-primary hover:underline"
          >
            {allDisplaySelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </span>
          {selectedIds.size > 0 && !archiveMode && !confirmSelectedArchive && !confirmSelectedDelete && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-slate-600 border-slate-300 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-800"
              onClick={() => setConfirmSelectedArchive(true)}
            >
              Archive Selected ({selectedIds.size})
            </Button>
          )}
          {confirmSelectedArchive && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Archive {selectedIds.size}?
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                disabled={selectedArchiving}
                onClick={handleArchiveSelected}
              >
                {selectedArchiving ? 'Archiving...' : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={selectedArchiving}
                onClick={() => setConfirmSelectedArchive(false)}
              >
                Cancel
              </Button>
            </div>
          )}
          {selectedIds.size > 0 && !confirmSelectedDelete && !confirmSelectedArchive && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => setConfirmSelectedDelete(true)}
            >
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          {confirmSelectedDelete && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-600 dark:text-red-400">
                Delete {selectedIds.size}?
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                disabled={selectedDeleting}
                onClick={handleDeleteSelected}
              >
                {selectedDeleting ? 'Deleting...' : 'Confirm'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={selectedDeleting}
                onClick={() => setConfirmSelectedDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Issue list */}
        <div className="w-[420px] min-w-[380px] border-r border-border flex flex-col bg-card">
          <IssueFilters
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            onStatusChange={setStatusFilter}
            onTypeChange={setTypeFilter}
            counts={counts}
            archiveMode={archiveMode}
            onToggleArchive={handleToggleArchive}
            archivedCount={archivedIssues.length}
          />
          {(archiveMode ? archiveLoading : loading) ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <IssueList
              issues={displayIssues}
              selectedId={selectedId}
              onSelect={setSelectedId}
              locks={archiveMode ? undefined : locks}
              agents={agents}
              selectable={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          )}
        </div>

        {/* Right: Detail */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {selectedIssue ? (
            <IssueDetail
              issue={selectedIssue}
              onUpdate={archiveMode ? () => {} : handleUpdate}
              onDelete={handleDelete}
              onArchive={archiveMode ? undefined : handleArchive}
              onUnarchive={archiveMode ? handleUnarchive : undefined}
              lockStatus={archiveMode ? null : selectedLock}
              agentNames={agentNames}
              agents={agents}
              isArchived={archiveMode}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              {archiveMode ? (
                <>
                  <span className="text-4xl">{'\u{1F4E6}'}</span>
                  <p className="text-sm">Select an archived issue</p>
                  <p className="text-xs max-w-sm text-center">
                    Archived issues are physically separated into the{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">issues/archive/</code>{' '}
                    directory.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-4xl">{'\u{1F4CB}'}</span>
                  <p className="text-sm">Select an issue or create a new one</p>
                  <p className="text-xs max-w-sm text-center">
                    When you create an issue, AI agents read individual files from the{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">issues/</code>{' '}
                    directory and act on them.
                  </p>
                  {connected && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Real-time sync active (3s interval)
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <IssueCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        agentNames={agentNames}
        agents={agents}
      />
    </>
  )
}
