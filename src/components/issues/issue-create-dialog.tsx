'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  PRIORITY_META,
  TYPE_META,
  type IssuePriority,
  type IssueType,
} from '@/types/issues'
import type { AgentInfo } from '@/types/agents'
import AssigneeMultiSelect from './assignee-multi-select'

interface IssueCreateDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (data: {
    title: string
    description: string
    priority: IssuePriority
    type: IssueType
    assignees: string[]
    labels: string[]
  }) => void
  agentNames?: string[]
  agents?: AgentInfo[]
}

export default function IssueCreateDialog({ open, onClose, onCreate, agentNames = [], agents = [] }: IssueCreateDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('medium')
  const [type, setType] = useState<IssueType>('task')
  const [assignees, setAssignees] = useState<string[]>(['human'])
  const [labelsText, setLabelsText] = useState('')

  if (!open) return null

  const handleSubmit = () => {
    if (!title.trim()) return
    const labels = labelsText
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)
    onCreate({ title: title.trim(), description: description.trim(), priority, type, assignees, labels })
    // Reset
    setTitle('')
    setDescription('')
    setPriority('medium')
    setType('task')
    setAssignees(['human'])
    setLabelsText('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Create New Issue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter issue title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Issue details (supports markdown; AI agents will read this content)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={4}
            />
          </div>

          {/* Type + Priority + Assignee */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={type} onValueChange={(val) => val && setType(val as IssueType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ISSUE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_META[t].icon} {TYPE_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <Select value={priority} onValueChange={(val) => val && setPriority(val as IssuePriority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {ISSUE_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Assignee</label>
              <AssigneeMultiSelect
                assignees={assignees}
                agentNames={agentNames}
                agents={agents}
                onChange={setAssignees}
                triggerClassName="h-9 text-sm"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Labels <span className="text-xs text-muted-foreground font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              placeholder="e.g. hub, prd, urgent"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>
              Create Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
