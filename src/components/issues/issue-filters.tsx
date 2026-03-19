'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ISSUE_TYPES,
  STATUS_META,
  TYPE_META,
  type IssueStatus,
  type IssueType,
} from '@/types/issues'

/** Active statuses (excludes archived) */
const ACTIVE_STATUSES: IssueStatus[] = ['open', 'in-progress', 'resolved', 'closed']

interface IssueFiltersProps {
  statusFilter: IssueStatus | 'all'
  typeFilter: IssueType | 'all'
  onStatusChange: (status: IssueStatus | 'all') => void
  onTypeChange: (type: IssueType | 'all') => void
  counts: { byStatus: Record<string, number>; byType: Record<string, number>; total: number }
  /** Archive mode flag */
  archiveMode?: boolean
  /** Toggle archive mode callback */
  onToggleArchive?: () => void
  /** Archived issue count */
  archivedCount?: number
}

export default function IssueFilters({
  statusFilter,
  typeFilter,
  onStatusChange,
  onTypeChange,
  counts,
  archiveMode,
  onToggleArchive,
  archivedCount = 0,
}: IssueFiltersProps) {
  return (
    <div className="px-4 py-3 border-b border-border space-y-2">
      {/* View mode tabs: Active / Archive */}
      <div className="flex items-center gap-1.5 mb-1">
        <button onClick={() => archiveMode && onToggleArchive?.()}>
          <Badge
            variant={!archiveMode ? 'default' : 'outline'}
            className={cn(
              'text-xs cursor-pointer transition-colors',
              !archiveMode && 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            Active ({counts.total})
          </Badge>
        </button>
        <button onClick={() => !archiveMode && onToggleArchive?.()}>
          <Badge
            variant={archiveMode ? 'default' : 'outline'}
            className={cn(
              'text-xs cursor-pointer transition-colors',
              archiveMode && 'bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600'
            )}
          >
            Archive ({archivedCount})
          </Badge>
        </button>
      </div>

      {!archiveMode && (
        <>
          {/* Status filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Status:</span>
            <FilterBadge
              active={statusFilter === 'all'}
              onClick={() => onStatusChange('all')}
              label={`All (${counts.total})`}
            />
            {ACTIVE_STATUSES.map((s) => (
              <FilterBadge
                key={s}
                active={statusFilter === s}
                onClick={() => onStatusChange(s)}
                label={`${STATUS_META[s].label} (${counts.byStatus[s] ?? 0})`}
              />
            ))}
          </div>
          {/* Type filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Type:</span>
            <FilterBadge
              active={typeFilter === 'all'}
              onClick={() => onTypeChange('all')}
              label="All"
            />
            {ISSUE_TYPES.map((t) => (
              <FilterBadge
                key={t}
                active={typeFilter === t}
                onClick={() => onTypeChange(t)}
                label={`${TYPE_META[t].icon} ${TYPE_META[t].label} (${counts.byType[t] ?? 0})`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FilterBadge({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button onClick={onClick}>
      <Badge
        variant={active ? 'default' : 'outline'}
        className={cn(
          'text-xs cursor-pointer transition-colors',
          active && 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {label}
      </Badge>
    </button>
  )
}
