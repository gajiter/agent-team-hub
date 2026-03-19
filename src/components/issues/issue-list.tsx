'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { IssueStatusBadge, IssuePriorityBadge, IssueTypeBadge, AssigneesBadges } from './issue-badges'
import type { Issue } from '@/types/issues'
import type { IssueLockStatus } from '@/types/issues'
import type { AgentInfo } from '@/types/agents'
import { cn } from '@/lib/utils'

function formatDate(iso: string) {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${mins}`
}

interface IssueListProps {
  issues: Issue[]
  selectedId: string | null
  onSelect: (id: string) => void
  locks?: Map<string, IssueLockStatus>
  agents?: AgentInfo[]
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export default function IssueList({ issues, selectedId, onSelect, locks, agents, selectable, selectedIds, onToggleSelect }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
        No issues found. Create a new issue to get started.
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {issues.map((issue) => {
          const lockInfo = locks?.get(issue.id)
          const isLocked = lockInfo?.locked ?? false
          const isChecked = selectedIds?.has(issue.id) ?? false

          return (
            <button
              key={issue.id}
              onClick={() => onSelect(issue.id)}
              className={cn(
                'w-full text-left px-4 py-3.5 transition-colors hover:bg-accent/50',
                selectedId === issue.id && 'bg-accent',
                isLocked && 'border-l-2 border-l-amber-400'
              )}
            >
              <div className="flex items-start gap-3">
                {selectable && (
                  <div
                    className="flex items-center pt-0.5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleSelect?.(issue.id)
                    }}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer',
                        isChecked
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/40 hover:border-primary/60'
                      )}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">{issue.id}</span>
                    <IssueTypeBadge type={issue.type} />
                    {isLocked && (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 animate-pulse"
                        title={`${lockInfo?.holder} is editing`}
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        {lockInfo?.holder}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-foreground truncate mb-1.5">
                    {issue.title}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <IssueStatusBadge status={issue.status} />
                    <IssuePriorityBadge priority={issue.priority} />
                    <AssigneesBadges assignees={issue.assignees} agents={agents} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{formatDate(issue.updatedAt)}</span>
                  {issue.comments.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      {'\u{1F4AC}'} {issue.comments.length}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
