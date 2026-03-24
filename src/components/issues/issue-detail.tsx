'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import MarkdownViewer from '@/components/ui/MarkdownViewer'
import { IssueStatusBadge, IssuePriorityBadge, IssueTypeBadge, AssigneesBadges, AgentNameLabel } from './issue-badges'
import AssigneeMultiSelect from './assignee-multi-select'
import { useI18n } from '@/lib/i18n'
import type { Issue, IssueStatus, IssuePriority, IssueType } from '@/types/issues'
import type { IssueLockStatus } from '@/types/issues'
import { ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES, STATUS_META, PRIORITY_META, TYPE_META } from '@/types/issues'
import type { AgentInfo } from '@/types/agents'
import { getAgentColors } from '@/types/agents'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface IssueDetailProps {
  issue: Issue
  onUpdate: (updates: Partial<Issue>) => void
  onDelete?: (id: string) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
  lockStatus?: IssueLockStatus | null
  agentNames?: string[]
  agents?: AgentInfo[]
  /** Whether viewing in archive mode */
  isArchived?: boolean
}

export default function IssueDetail({ issue, onUpdate, onDelete, onArchive, onUnarchive, lockStatus, agentNames = [], agents = [], isArchived = false }: IssueDetailProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useI18n()

  // Inline edit states
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(issue.title)
  const [editingDesc, setEditingDesc] = useState(false)
  const [editDesc, setEditDesc] = useState(issue.description)
  const [labelInput, setLabelInput] = useState('')

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descTextareaRef = useRef<HTMLTextAreaElement>(null)

  const isLocked = lockStatus?.locked ?? false

  // Sync edit values when issue changes externally
  useEffect(() => {
    if (!editingTitle) setEditTitle(issue.title)
  }, [issue.title, editingTitle])
  useEffect(() => {
    if (!editingDesc) setEditDesc(issue.description)
  }, [issue.description, editingDesc])

  // Focus inputs when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])
  useEffect(() => {
    if (editingDesc && descTextareaRef.current) {
      descTextareaRef.current.focus()
    }
  }, [editingDesc])

  const handleTitleSave = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== issue.title) {
      onUpdate({ title: trimmed })
    } else {
      setEditTitle(issue.title)
    }
    setEditingTitle(false)
  }

  const handleDescSave = () => {
    const trimmed = editDesc.trim()
    if (trimmed !== issue.description) {
      onUpdate({ description: trimmed })
    } else {
      setEditDesc(issue.description)
    }
    setEditingDesc(false)
  }

  const handleAddLabel = () => {
    const newLabel = labelInput.trim()
    if (!newLabel || isLocked) return
    if (issue.labels.includes(newLabel)) {
      setLabelInput('')
      return
    }
    onUpdate({ labels: [...issue.labels, newLabel] })
    setLabelInput('')
  }

  const handleRemoveLabel = (label: string) => {
    if (isLocked) return
    onUpdate({ labels: issue.labels.filter((l) => l !== label) })
  }

  const handleDelete = async () => {
    if (!onDelete || deleting) return
    setDeleting(true)
    onDelete(issue.id)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting || isLocked) return
    setIsSubmitting(true)
    const comment = {
      id: `c-${Date.now()}`,
      author: 'human',
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    }
    onUpdate({
      comments: [...issue.comments, comment],
    })
    setNewComment('')
    setIsSubmitting(false)
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6">
        {/* Lock Warning Banner */}
        {isLocked && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('issues.lockedBy', { holder: lockStatus?.holder ?? '' })}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {t('issues.lockedHint')}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-muted-foreground">{issue.id}</span>
            <IssueTypeBadge type={issue.type} />
          </div>

          {/* Editable Title */}
          {editingTitle && !isLocked ? (
            <div className="space-y-2">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') {
                    setEditTitle(issue.title)
                    setEditingTitle(false)
                  }
                }}
                className="w-full text-xl font-semibold bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditTitle(issue.title)
                    setEditingTitle(false)
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={handleTitleSave}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground flex-1">
                {issue.title}
              </h2>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setEditingTitle(true)}
                >
                  {t('common.edit')}
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <IssueStatusBadge status={issue.status} />
            <IssuePriorityBadge priority={issue.priority} />
            <AssigneesBadges assignees={issue.assignees} agents={agents} />
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('issues.typeField')}</label>
            <Select
              value={issue.type}
              onValueChange={(val) => val && onUpdate({ type: val as IssueType })}
              disabled={isLocked}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ISSUE_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {TYPE_META[tp].icon} {t(TYPE_META[tp].i18nKey)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('issues.status')}</label>
            <Select
              value={issue.status}
              onValueChange={(val) => val && onUpdate({ status: val as IssueStatus })}
              disabled={isLocked}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ISSUE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(STATUS_META[s].i18nKey)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('issues.priorityField')}</label>
            <Select
              value={issue.priority}
              onValueChange={(val) => val && onUpdate({ priority: val as IssuePriority })}
              disabled={isLocked}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ISSUE_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(PRIORITY_META[p].i18nKey)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('issues.assigneeField')}</label>
            <AssigneeMultiSelect
              assignees={issue.assignees}
              agentNames={agentNames}
              agents={agents}
              disabled={isLocked}
              onChange={(assignees) => onUpdate({ assignees })}
            />
          </div>
        </div>

        <Separator />

        {/* Description -- Editable */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{t('issues.descriptionField')}</h3>
            {!editingDesc && !isLocked && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setEditingDesc(true)}
              >
                {t('common.edit')}
              </Button>
            )}
          </div>
          {editingDesc && !isLocked ? (
            <div className="space-y-2">
              <textarea
                ref={descTextareaRef}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={5}
                placeholder={t('issues.descriptionField')}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditDesc(issue.description)
                    setEditingDesc(false)
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={handleDescSave}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          ) : issue.description ? (
            <div className="text-sm bg-muted/30 rounded-lg p-4">
              <MarkdownViewer content={issue.description} className="prose-sm" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic py-4 text-center bg-muted/20 rounded-lg">
              {t('issues.noDescription')}
            </div>
          )}
        </div>

        {/* Labels -- Editable */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('issues.labelsField')}</h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(!issue.labels || issue.labels.length === 0) && (
              <span className="text-xs text-muted-foreground italic">{t('issues.noLabels')}</span>
            )}
            {(issue.labels ?? []).map((label) => (
              <Badge key={label} variant="secondary" className="text-xs gap-1 pr-1">
                {label}
                {!isLocked && (
                  <button
                    onClick={() => handleRemoveLabel(label)}
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 w-4 h-4 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Remove label"
                  >
                    x
                  </button>
                )}
              </Badge>
            ))}
          </div>
          {!isLocked && (
            <div className="flex gap-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddLabel()
                  }
                }}
                placeholder={t('issues.labelsField')}
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddLabel}
                disabled={!labelInput.trim()}
              >
                {t('common.add')}
              </Button>
            </div>
          )}
        </div>

        {/* Related */}
        {(issue.relatedFiles.length > 0 || issue.relatedIds.length > 0) && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{t('issues.relatedItems')}</h3>
            <div className="space-y-1.5">
              {issue.relatedIds.map((rid) => (
                <Badge key={rid} variant="outline" className="text-xs mr-1.5">
                  {rid}
                </Badge>
              ))}
              {issue.relatedFiles.map((f) => (
                <div key={f} className="text-xs text-muted-foreground font-mono">
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">{t('issues.reporter')}:</span>{' '}
            <AgentNameLabel name={issue.reporter} agents={agents} />
          </div>
          <div>
            <span className="font-medium">{t('issues.created')}:</span> {formatDateTime(issue.createdAt)}
          </div>
          <div>
            <span className="font-medium">{t('issues.updated')}:</span> {formatDateTime(issue.updatedAt)}
          </div>
        </div>

        <Separator />

        {/* Comments */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {t('issues.comments')} ({issue.comments.length})
          </h3>
          <div className="space-y-3 mb-4">
            {issue.comments.length === 0 && (
              <div className="text-sm text-muted-foreground italic py-4 text-center">
                {t('issues.noComments')}
              </div>
            )}
            {issue.comments.map((c) => {
              const commentAgent = c.author !== 'human' ? agents.find((a) => a.name === c.author) : undefined
              const commentColors = commentAgent ? getAgentColors(commentAgent) : undefined

              return (
                <Card
                  key={c.id}
                  className={cn(
                    'border-border/60',
                    commentAgent && 'border-l-2',
                    commentColors?.border
                  )}
                >
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <AgentNameLabel name={c.author} agents={agents} />
                      <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-1">
                    <MarkdownViewer content={c.content} className="prose-sm" />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Add comment */}
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                isLocked
                  ? t('issues.lockedCommentHint', { holder: lockStatus?.holder ?? '' })
                  : t('issues.addComment')
              }
              disabled={isLocked}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting || isLocked}
              >
                {t('issues.addComment')}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Archive / Unarchive */}
        {isArchived ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('issues.archivedIssue')}</h3>
                <p className="text-xs text-muted-foreground">{t('issues.restoreHint')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUnarchive?.(issue.id)}
              >
                {t('issues.restore')}
              </Button>
            </div>
          </div>
        ) : (onArchive && (issue.status === 'resolved' || issue.status === 'closed')) ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('issues.archiveSection')}</h3>
                <p className="text-xs text-muted-foreground">{t('issues.moveToArchive')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-slate-600 border-slate-300 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => onArchive(issue.id)}
                disabled={isLocked}
              >
                {t('issues.archive')}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Danger Zone -- Delete */}
        {onDelete && (
          <div className="rounded-lg border border-red-200 dark:border-red-800/50 p-4">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">{t('issues.dangerZone')}</h3>
            {!confirmDelete ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t('issues.permanentDelete')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isLocked}
                >
                  {t('issues.deleteIssue')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {t('issues.confirmDelete', { id: issue.id })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? t('issues.deleting') : t('issues.confirmDeleteBtn')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
