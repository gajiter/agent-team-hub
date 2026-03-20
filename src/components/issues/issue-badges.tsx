'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  STATUS_META,
  PRIORITY_META,
  TYPE_META,
  type IssueStatus,
  type IssuePriority,
  type IssueType,
} from '@/types/issues'
import type { AgentInfo } from '@/types/agents'
import { getAgentColors } from '@/types/agents'

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const { t } = useI18n()
  const meta = STATUS_META[status] ?? STATUS_META.open
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', meta.color)}>
      {t(meta.i18nKey)}
    </Badge>
  )
}

export function IssuePriorityBadge({ priority }: { priority: IssuePriority }) {
  const { t } = useI18n()
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', meta.color)}>
      {t(meta.i18nKey)}
    </Badge>
  )
}

export function IssueTypeBadge({ type }: { type: IssueType }) {
  const { t } = useI18n()
  const meta = TYPE_META[type] ?? TYPE_META.task
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span>{meta.icon}</span>
      <span>{t(meta.i18nKey)}</span>
    </span>
  )
}

/** Find AgentInfo by name */
function findAgent(name: string, agents?: AgentInfo[]): AgentInfo | undefined {
  return agents?.find((a) => a.name === name)
}

export function AssigneeBadge({ assignee, agents }: { assignee: string; agents?: AgentInfo[] }) {
  const isHuman = assignee === 'human'
  const agent = !isHuman ? findAgent(assignee, agents) : undefined
  const colors = agent ? getAgentColors(agent) : undefined

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border',
        isHuman
          ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800'
          : colors
            ? `${colors.bgLight} ${colors.text} ${colors.border}`
            : 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800'
      )}
    >
      <span>{isHuman ? '\u{1F464}' : agent?.emoji ?? '\u{1F916}'}</span>
      <span>{assignee}</span>
    </span>
  )
}

/** Render multiple assignee badges */
export function AssigneesBadges({ assignees, agents }: { assignees: string[]; agents?: AgentInfo[] }) {
  if (!assignees || assignees.length === 0) {
    return <AssigneeBadge assignee="human" agents={agents} />
  }
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {assignees.map((a) => (
        <AssigneeBadge key={a} assignee={a} agents={agents} />
      ))}
    </span>
  )
}

/** Inline agent name label for comments, reporter, etc. */
export function AgentNameLabel({ name, agents }: { name: string; agents?: AgentInfo[] }) {
  const isHuman = name === 'human'
  const agent = !isHuman ? findAgent(name, agents) : undefined
  const colors = agent ? getAgentColors(agent) : undefined

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isHuman
          ? 'text-purple-700 dark:text-purple-400'
          : colors
            ? colors.text
            : 'text-sky-700 dark:text-sky-400'
      )}
    >
      <span>{isHuman ? '\u{1F464}' : agent?.emoji ?? '\u{1F916}'}</span>
      <span>{name}</span>
    </span>
  )
}
