export interface IssueComment {
  id: string
  author: string
  content: string
  createdAt: string
}

export type IssueStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'archived'
export type IssuePriority = 'critical' | 'high' | 'medium' | 'low'
export type IssueType = 'task' | 'bug' | 'feature' | 'question' | 'decision'

export interface Issue {
  id: string
  title: string
  description: string
  status: IssueStatus
  priority: IssuePriority
  type: IssueType
  /** @deprecated Use assignees instead. Kept for backward compatibility (equals assignees[0]). */
  assignee: string
  /** List of assignees (supports multiple assignees) */
  assignees: string[]
  reporter: string
  labels: string[]
  relatedFiles: string[]
  relatedIds: string[]
  comments: IssueComment[]
  createdAt: string
  updatedAt: string
}

/** Raw issue shape from JSON file (assignees may be absent for backward compatibility) */
export interface RawIssue extends Omit<Issue, 'assignees'> {
  assignees?: string[]
}

/** Normalize a RawIssue to ensure assignees is always present */
export function normalizeIssue(raw: RawIssue): Issue {
  const assignees = raw.assignees && raw.assignees.length > 0
    ? raw.assignees
    : raw.assignee ? [raw.assignee] : ['human']
  return {
    ...raw,
    assignees,
    assignee: assignees[0] ?? raw.assignee ?? 'human',
  }
}

export interface IssuesData {
  version: string
  description: string
  schema: Record<string, string>
  issues: Issue[]
}

/** Issue lock status (shared between server and client) */
export interface IssueLockStatus {
  issueId: string
  locked: boolean
  holder?: string
  acquiredAt?: string
  expiresAt?: string
}

/** Lightweight issue summary for polling */
export interface IssueSummary {
  id: string
  updatedAt: string
  status: string
  commentsCount: number
}

export const ISSUE_STATUSES: IssueStatus[] = ['open', 'in-progress', 'resolved', 'closed', 'archived']
export const ISSUE_PRIORITIES: IssuePriority[] = ['critical', 'high', 'medium', 'low']
export const ISSUE_TYPES: IssueType[] = ['task', 'bug', 'feature', 'question', 'decision']

export const STATUS_META: Record<IssueStatus, { label: string; i18nKey: string; color: string }> = {
  open: { label: 'Open', i18nKey: 'meta.status.open', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'in-progress': { label: 'In Progress', i18nKey: 'meta.status.inProgress', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', i18nKey: 'meta.status.resolved', color: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'Closed', i18nKey: 'meta.status.closed', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  archived: { label: 'Archived', i18nKey: 'meta.status.archived', color: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700' },
}

export const PRIORITY_META: Record<IssuePriority, { label: string; i18nKey: string; color: string }> = {
  critical: { label: 'Critical', i18nKey: 'meta.priority.critical', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', i18nKey: 'meta.priority.high', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', i18nKey: 'meta.priority.medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Low', i18nKey: 'meta.priority.low', color: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export const TYPE_META: Record<IssueType, { label: string; i18nKey: string; icon: string }> = {
  task: { label: 'Task', i18nKey: 'meta.type.task', icon: '📋' },
  bug: { label: 'Bug', i18nKey: 'meta.type.bug', icon: '🐛' },
  feature: { label: 'Feature', i18nKey: 'meta.type.feature', icon: '✨' },
  question: { label: 'Question', i18nKey: 'meta.type.question', icon: '❓' },
  decision: { label: 'Decision', i18nKey: 'meta.type.decision', icon: '⚖️' },
}
