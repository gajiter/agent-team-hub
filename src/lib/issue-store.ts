/**
 * Issue Store — storage-backed issue management with optimistic locking
 *
 * Structure:
 *   issues/_index.json   — metadata + nextId counter
 *   issues/ISS-001.json  — individual issue data
 *
 * Uses StorageProvider abstraction: LocalStorageProvider (fs) or GitHubStorageProvider.
 * Lock files are only used in local mode — GitHub mode uses optimistic concurrency via SHA.
 */

import type { Issue, IssueLockStatus, IssueSummary, RawIssue } from '../types/issues'
import { normalizeIssue } from '../types/issues'
import { getServerStorage, isGitHubStorageMode } from './storage'
import type { StorageProvider } from '@/types/storage'

// ─── Path constants ────────────────────────────────────────

const ISSUES_DIR = 'issues'
const ARCHIVE_DIR = 'issues/archive'
const INDEX_FILE = '_index.json'
const LOCK_TTL_MS = 10_000 // 10 seconds

interface IndexData {
  version: string
  description: string
  schema: Record<string, string>
  nextId: number
}

interface LockInfo {
  holder: string
  acquiredAt: string
  expiresAt: string
}

// ─── Path utilities ────────────────────────────────────────

function issueRelPath(issueId: string): string {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  return `${ISSUES_DIR}/${issueId}.json`
}

function archiveRelPath(issueId: string): string {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  return `${ARCHIVE_DIR}/${issueId}.json`
}

function indexRelPath(): string {
  return `${ISSUES_DIR}/${INDEX_FILE}`
}

function lockRelPath(relPath: string): string {
  return `${relPath}.lock`
}

// ─── Lock mechanism (local fs only) ────────────────────────

function getStorage(): StorageProvider {
  return getServerStorage()
}

async function isLockStale(storage: StorageProvider, projectPath: string, lockPath: string): Promise<boolean> {
  try {
    const content = await storage.readFile(projectPath, lockPath)
    const lock: LockInfo = JSON.parse(content)
    return new Date(lock.expiresAt).getTime() < Date.now()
  } catch {
    return true
  }
}

async function acquireLock(
  storage: StorageProvider,
  projectPath: string,
  targetRelPath: string,
  holder: string = 'hub-api',
  maxRetries: number = 5,
  retryDelayMs: number = 100
): Promise<void> {
  // Skip locking in GitHub mode — GitHub API handles concurrency via SHA
  if (isGitHubStorageMode()) return

  const lp = lockRelPath(targetRelPath)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const lockExists = await storage.exists(projectPath, lp)

    if (lockExists) {
      if (await isLockStale(storage, projectPath, lp)) {
        try { await storage.deleteFile(projectPath, lp) } catch { /* ignore */ }
      } else {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
        continue
      }
    }

    const lockData: LockInfo = {
      holder,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + LOCK_TTL_MS).toISOString(),
    }

    try {
      await storage.writeFile(projectPath, lp, JSON.stringify(lockData))
      return
    } catch {
      await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
      continue
    }
  }

  throw new Error(`Failed to acquire lock for ${targetRelPath} after ${maxRetries} retries`)
}

async function releaseLock(
  storage: StorageProvider,
  projectPath: string,
  targetRelPath: string
): Promise<void> {
  if (isGitHubStorageMode()) return
  try {
    await storage.deleteFile(projectPath, lockRelPath(targetRelPath))
  } catch { /* ignore */ }
}

async function withLock<T>(
  storage: StorageProvider,
  projectPath: string,
  targetRelPath: string,
  fn: () => Promise<T>,
  holder?: string
): Promise<T> {
  await acquireLock(storage, projectPath, targetRelPath, holder)
  try {
    return await fn()
  } finally {
    await releaseLock(storage, projectPath, targetRelPath)
  }
}

// ─── Lock status queries (read-only) ────────────────────────────

async function readLockStatus(projectPath: string, issueId: string): Promise<IssueLockStatus> {
  // In GitHub mode, no lock files exist
  if (isGitHubStorageMode()) return { issueId, locked: false }

  const storage = getStorage()
  const lp = lockRelPath(issueRelPath(issueId))

  try {
    const exists = await storage.exists(projectPath, lp)
    if (!exists) return { issueId, locked: false }

    const content = await storage.readFile(projectPath, lp)
    const lock: LockInfo = JSON.parse(content)
    const isStale = new Date(lock.expiresAt).getTime() < Date.now()

    if (isStale) return { issueId, locked: false }

    return {
      issueId,
      locked: true,
      holder: lock.holder,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
    }
  } catch {
    return { issueId, locked: false }
  }
}

export async function readAllLockStatuses(projectPath: string): Promise<IssueLockStatus[]> {
  if (isGitHubStorageMode()) return []

  const storage = getStorage()
  try {
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR)
    const lockEntries = entries.filter((e) => !e.isDirectory && /^ISS-\d{3,}\.json\.lock$/.test(e.name))

    const statuses = await Promise.all(
      lockEntries.map(async (entry) => {
        const issueId = entry.name.replace('.json.lock', '')
        return readLockStatus(projectPath, issueId)
      })
    )

    return statuses.filter((s) => s.locked)
  } catch {
    return []
  }
}

/** Lightweight polling: return issue summaries only */
export async function readIssueSummaries(projectPath: string): Promise<IssueSummary[]> {
  const storage = getStorage()
  try {
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR).catch(() => [])
    const issueEntries = entries.filter(
      (e) => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name) && !e.name.endsWith('.lock')
    )

    const summaries = await Promise.all(
      issueEntries.map(async (entry) => {
        try {
          const content = await storage.readFile(projectPath, `${ISSUES_DIR}/${entry.name}`)
          const issue = JSON.parse(content) as Issue
          return {
            id: issue.id,
            updatedAt: issue.updatedAt,
            status: issue.status,
            commentsCount: issue.comments?.length ?? 0,
          } as IssueSummary
        } catch {
          return null
        }
      })
    )

    return summaries.filter((s): s is IssueSummary => s !== null)
  } catch {
    return []
  }
}

// ─── Index management ────────────────────────────────────────

const DEFAULT_INDEX: IndexData = {
  version: '2.0',
  description:
    'Issue management data shared between AI agents and humans. Individual issues are managed as ISS-NNN.json files.',
  schema: {
    id: 'Unique ID in ISS-NNN format',
    title: 'Issue title',
    description: 'Detailed issue description (Markdown supported)',
    status: 'open | in-progress | resolved | closed | archived',
    priority: 'critical | high | medium | low',
    type: 'task | bug | feature | question | decision',
    assignee: 'Primary assignee (backward compat, equals assignees[0])',
    assignees: 'Assignees array (supports multiple)',
    reporter: 'Agent name or human',
    labels: 'Free-form tag array',
    relatedFiles: 'Related artifact file path array',
    relatedIds: 'Related ID array (F-xxx, US-xxx, REQ-xx, etc.)',
    comments: 'Comment array (author, content, createdAt)',
    createdAt: 'ISO 8601 date',
    updatedAt: 'ISO 8601 date',
  },
  nextId: 1,
}

async function readIndex(storage: StorageProvider, projectPath: string): Promise<IndexData> {
  try {
    const content = await storage.readFile(projectPath, indexRelPath())
    return JSON.parse(content)
  } catch {
    return { ...DEFAULT_INDEX }
  }
}

async function writeIndex(storage: StorageProvider, projectPath: string, data: IndexData): Promise<void> {
  await storage.writeFile(projectPath, indexRelPath(), JSON.stringify(data, null, 2))
}

// ─── Issue CRUD ────────────────────────────────────────

/** Read individual issue file */
export async function readIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const storage = getStorage()
  try {
    const content = await storage.readFile(projectPath, issueRelPath(issueId))
    const raw = JSON.parse(content) as RawIssue
    return normalizeIssue(raw)
  } catch {
    return null
  }
}

/** Read all issues */
export async function readAllIssues(projectPath: string): Promise<Issue[]> {
  const storage = getStorage()
  try {
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR).catch(() => [])
    const issueEntries = entries.filter(
      (e) => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name) && !e.name.endsWith('.lock')
    )

    const issues = await Promise.all(
      issueEntries.map(async (entry) => {
        try {
          const content = await storage.readFile(projectPath, `${ISSUES_DIR}/${entry.name}`)
          const raw = JSON.parse(content) as RawIssue
          return normalizeIssue(raw)
        } catch {
          return null
        }
      })
    )

    return issues.filter((i): i is Issue => i !== null)
  } catch {
    return []
  }
}

/** Create issue */
export async function createIssue(
  projectPath: string,
  data: Partial<Issue>
): Promise<Issue> {
  const storage = getStorage()
  const idxPath = indexRelPath()

  return withLock(storage, projectPath, idxPath, async () => {
    const index = await readIndex(storage, projectPath)
    const newId = `ISS-${String(index.nextId).padStart(3, '0')}`
    const now = new Date().toISOString()

    const assignees = data.assignees && data.assignees.length > 0
      ? data.assignees
      : data.assignee ? [data.assignee] : ['human']
    const assignee = assignees[0] ?? 'human'

    const newIssue: Issue = {
      id: newId,
      title: data.title || 'Untitled',
      description: data.description || '',
      status: data.status || 'open',
      priority: data.priority || 'medium',
      type: data.type || 'task',
      assignee,
      assignees,
      reporter: data.reporter || 'human',
      labels: data.labels || [],
      relatedFiles: data.relatedFiles || [],
      relatedIds: data.relatedIds || [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    }

    await storage.writeFile(projectPath, issueRelPath(newId), JSON.stringify(newIssue, null, 2))

    index.nextId = index.nextId + 1
    await writeIndex(storage, projectPath, index)

    return newIssue
  })
}

/** Update issue */
export async function updateIssue(
  projectPath: string,
  issueId: string,
  updates: Partial<Issue>
): Promise<Issue | null> {
  const storage = getStorage()
  const relPath = issueRelPath(issueId)

  return withLock(storage, projectPath, relPath, async () => {
    const existing = await readIssue(projectPath, issueId)
    if (!existing) return null

    const now = new Date().toISOString()
    const merged = { ...existing, ...updates, id: issueId, updatedAt: now }

    if (updates.assignees && updates.assignees.length > 0) {
      merged.assignee = updates.assignees[0]
      merged.assignees = updates.assignees
    } else if (updates.assignee && !updates.assignees) {
      merged.assignees = [updates.assignee]
    }

    const updated: Issue = merged
    await storage.writeFile(projectPath, relPath, JSON.stringify(updated, null, 2))
    return updated
  })
}

/** Delete issue */
export async function deleteIssue(projectPath: string, issueId: string): Promise<boolean> {
  const storage = getStorage()
  const relPath = issueRelPath(issueId)

  return withLock(storage, projectPath, relPath, async () => {
    try {
      await storage.deleteFile(projectPath, relPath)
      return true
    } catch {
      return false
    }
  })
}

// ─── Archive ────────────────────────────────────────

/** Archive issue */
export async function archiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const storage = getStorage()
  const srcPath = issueRelPath(issueId)

  return withLock(storage, projectPath, srcPath, async () => {
    const existing = await readIssue(projectPath, issueId)
    if (!existing) return null

    const now = new Date().toISOString()
    const archived: Issue = {
      ...existing,
      status: 'archived',
      updatedAt: now,
    }

    // Write to archive
    await storage.writeFile(projectPath, archiveRelPath(issueId), JSON.stringify(archived, null, 2))

    // Delete original
    try { await storage.deleteFile(projectPath, srcPath) } catch { /* ignore */ }

    return archived
  })
}

/** Unarchive issue */
export async function unarchiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const storage = getStorage()

  try {
    const content = await storage.readFile(projectPath, archiveRelPath(issueId))
    const raw = JSON.parse(content) as RawIssue
    const issue = normalizeIssue(raw)

    const now = new Date().toISOString()
    const restored: Issue = {
      ...issue,
      status: 'resolved',
      updatedAt: now,
    }

    await storage.writeFile(projectPath, issueRelPath(issueId), JSON.stringify(restored, null, 2))

    // Remove from archive
    try { await storage.deleteFile(projectPath, archiveRelPath(issueId)) } catch { /* ignore */ }

    return restored
  } catch {
    return null
  }
}

/** Read all archived issues */
export async function readArchivedIssues(projectPath: string): Promise<Issue[]> {
  const storage = getStorage()
  try {
    const entries = await storage.listDirectory(projectPath, ARCHIVE_DIR).catch(() => [])
    const issueEntries = entries.filter(
      (e) => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name)
    )

    const issues = await Promise.all(
      issueEntries.map(async (entry) => {
        try {
          const content = await storage.readFile(projectPath, `${ARCHIVE_DIR}/${entry.name}`)
          const raw = JSON.parse(content) as RawIssue
          return normalizeIssue(raw)
        } catch {
          return null
        }
      })
    )

    return issues.filter((i): i is Issue => i !== null)
  } catch {
    return []
  }
}

/** Permanently delete an archived issue */
export async function deleteArchivedIssue(projectPath: string, issueId: string): Promise<boolean> {
  const storage = getStorage()
  try {
    await storage.deleteFile(projectPath, archiveRelPath(issueId))
    return true
  } catch {
    return false
  }
}
