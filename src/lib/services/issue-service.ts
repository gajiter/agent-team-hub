import type { Issue, IssueLockStatus, IssueSummary } from '@/types/issues'
import { isBrowserMode } from './mode'
import { projectService } from './project-service'
import * as browserStore from '@/lib/issue-store-browser'

export const issueService = {
  async getAll(projectId: string): Promise<Issue[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readAllIssues(projectPath)
    }
    const res = await fetch(`/api/issues?projectId=${encodeURIComponent(projectId)}`)
    const data = await res.json()
    return data.issues
  },

  async get(projectId: string, issueId: string): Promise<Issue | null> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readIssue(projectPath, issueId)
    }
    const res = await fetch(
      `/api/issues?projectId=${encodeURIComponent(projectId)}&id=${encodeURIComponent(issueId)}`
    )
    const data = await res.json()
    return data.issue ?? null
  },

  async create(projectId: string, issueData: Partial<Issue>): Promise<Issue> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.createIssue(projectPath, issueData)
    }
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...issueData }),
    })
    const data = await res.json()
    return data.issue
  },

  async update(projectId: string, issueId: string, updates: Partial<Issue>): Promise<Issue | null> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.updateIssue(projectPath, issueId, updates)
    }
    const res = await fetch('/api/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, id: issueId, ...updates }),
    })
    const data = await res.json()
    return data.issue ?? null
  },

  async deleteMany(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map((id) => browserStore.deleteIssue(projectPath, id)))
      return
    }
    await fetch('/api/issues', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids }),
    })
  },

  async getArchived(projectId: string): Promise<Issue[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readArchivedIssues(projectPath)
    }
    const res = await fetch(`/api/issues/archive?projectId=${encodeURIComponent(projectId)}`)
    const data = await res.json()
    return data.issues
  },

  async archive(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map((id) => browserStore.archiveIssue(projectPath, id)))
      return
    }
    await fetch('/api/issues/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids, action: 'archive' }),
    })
  },

  async unarchive(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map((id) => browserStore.unarchiveIssue(projectPath, id)))
      return
    }
    await fetch('/api/issues/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids, action: 'unarchive' }),
    })
  },

  async deleteArchived(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map((id) => browserStore.deleteArchivedIssue(projectPath, id)))
      return
    }
    await fetch('/api/issues/archive', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids }),
    })
  },

  async getLocks(projectId: string): Promise<IssueLockStatus[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readAllLockStatuses(projectPath)
    }
    const res = await fetch(`/api/issues/locks?projectId=${encodeURIComponent(projectId)}`)
    const data = await res.json()
    return data.locks
  },

  async getSummaries(projectId: string): Promise<IssueSummary[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readIssueSummaries(projectPath)
    }
    const res = await fetch(`/api/issues/poll?projectId=${encodeURIComponent(projectId)}`)
    const data = await res.json()
    return data.summaries
  },

  computeFingerprint(summaries: IssueSummary[]): string {
    const raw = summaries
      .map((s) => `${s.id}:${s.updatedAt}:${s.status}:${s.commentsCount}`)
      .sort()
      .join('|')

    // Simple hash (djb2)
    let hash = 5381
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0
    }
    return hash.toString(36)
  },
}
