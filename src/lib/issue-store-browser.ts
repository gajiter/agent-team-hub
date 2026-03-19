/**
 * Browser Issue Store — browser-side issue storage using BrowserStorageProvider
 * with .json.lock files for concurrency control.
 *
 * Mirrors the server-side issue-store.ts logic but uses the File System Access API
 * via BrowserStorageProvider instead of Node.js fs.
 */

import type { Issue, IssueLockStatus, IssueSummary, RawIssue } from '@/types/issues'
import { normalizeIssue } from '@/types/issues'
import { getBrowserStorage, BrowserStorageProvider } from '@/lib/storage/browser'

// ─── Constants ────────────────────────────────────────

const ISSUES_DIR = 'issues'
const ARCHIVE_DIR = 'issues/archive'
const INDEX_FILE = 'issues/_index.json'
const LOCK_TTL_MS = 10_000

// ─── Internal types ────────────────────────────────────────

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

// ─── Path utilities ────────────────────────────────────────

function issueRelPath(issueId: string): string {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  return `${ISSUES_DIR}/${issueId}.json`
}

function archiveRelPath(issueId: string): string {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  return `${ARCHIVE_DIR}/${issueId}.json`
}

function lockRelPathFor(relPath: string): string {
  return `${relPath}.lock`
}

// ─── Lock mechanism ────────────────────────────────────────

async function acquireLock(
  storage: BrowserStorageProvider,
  projectPath: string,
  lockRelPath: string,
  holder: string = 'browser',
  maxRetries: number = 5,
  retryDelayMs: number = 100
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check existing lock
    const lockExists = await storage.exists(projectPath, lockRelPath)

    if (lockExists) {
      // Read and check if stale
      try {
        const content = await storage.readFile(projectPath, lockRelPath)
        const lock: LockInfo = JSON.parse(content)
        const isStale = new Date(lock.expiresAt).getTime() < Date.now()

        if (isStale) {
          // Expired lock — remove and retry
          await storage.deleteFile(projectPath, lockRelPath).catch(() => {})
        } else {
          // Valid lock — wait and retry (exponential backoff)
          await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
          continue
        }
      } catch {
        // Read failure — treat as invalid lock, remove it
        await storage.deleteFile(projectPath, lockRelPath).catch(() => {})
      }
    }

    // Write lock file
    // Note: File System Access API has no O_EXCL, but single-tab makes races unlikely
    const lockData: LockInfo = {
      holder,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + LOCK_TTL_MS).toISOString(),
    }

    try {
      await storage.writeFile(projectPath, lockRelPath, JSON.stringify(lockData))
      return // Lock acquired
    } catch {
      await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
      continue
    }
  }

  throw new Error(`Failed to acquire lock for ${lockRelPath} after ${maxRetries} retries`)
}

async function releaseLock(
  storage: BrowserStorageProvider,
  projectPath: string,
  lockRelPath: string
): Promise<void> {
  try {
    await storage.deleteFile(projectPath, lockRelPath)
  } catch {
    // Lock file already gone — ignore
  }
}

async function withLock<T>(
  storage: BrowserStorageProvider,
  projectPath: string,
  lockRelPath: string,
  fn: () => Promise<T>,
  holder?: string
): Promise<T> {
  await acquireLock(storage, projectPath, lockRelPath, holder)
  try {
    return await fn()
  } finally {
    await releaseLock(storage, projectPath, lockRelPath)
  }
}

// ─── Index management ────────────────────────────────────────

async function readIndex(
  storage: BrowserStorageProvider,
  projectPath: string
): Promise<IndexData> {
  try {
    const content = await storage.readFile(projectPath, INDEX_FILE)
    return JSON.parse(content)
  } catch {
    return { ...DEFAULT_INDEX }
  }
}

async function writeIndex(
  storage: BrowserStorageProvider,
  projectPath: string,
  data: IndexData
): Promise<void> {
  await storage.writeFile(projectPath, INDEX_FILE, JSON.stringify(data, null, 2))
}

// ─── Issue CRUD ────────────────────────────────────────

/** Read individual issue file (includes assignees normalization) */
export async function readIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const storage = getBrowserStorage()
  try {
    const content = await storage.readFile(projectPath, issueRelPath(issueId))
    const raw = JSON.parse(content) as RawIssue
    return normalizeIssue(raw)
  } catch {
    return null
  }
}

/** Read all issues (parallel load from individual files) */
export async function readAllIssues(projectPath: string): Promise<Issue[]> {
  const storage = getBrowserStorage()
  try {
    await storage.createDirectory(projectPath, ISSUES_DIR)
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR)
    const issueFiles = entries.filter(
      (e) => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name) && !e.name.endsWith('.lock')
    )

    const issues = await Promise.all(
      issueFiles.map(async (entry) => {
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

/** Create issue (uses index lock) */
export async function createIssue(
  projectPath: string,
  data: Partial<Issue>
): Promise<Issue> {
  const storage = getBrowserStorage()
  const indexLock = lockRelPathFor(INDEX_FILE)

  return withLock(storage, projectPath, indexLock, async () => {
    const index = await readIndex(storage, projectPath)
    const newId = `ISS-${String(index.nextId).padStart(3, '0')}`
    const now = new Date().toISOString()

    const assignees =
      data.assignees && data.assignees.length > 0
        ? data.assignees
        : data.assignee
          ? [data.assignee]
          : ['human']
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

    // Write issue file
    await storage.writeFile(
      projectPath,
      issueRelPath(newId),
      JSON.stringify(newIssue, null, 2)
    )

    // Increment nextId in index
    index.nextId = index.nextId + 1
    await writeIndex(storage, projectPath, index)

    return newIssue
  })
}

/** Update issue (uses individual issue lock) */
export async function updateIssue(
  projectPath: string,
  issueId: string,
  updates: Partial<Issue>
): Promise<Issue | null> {
  const storage = getBrowserStorage()
  const relPath = issueRelPath(issueId)
  const lockPath = lockRelPathFor(relPath)

  return withLock(storage, projectPath, lockPath, async () => {
    const existing = await readIssue(projectPath, issueId)
    if (!existing) return null

    const now = new Date().toISOString()
    const merged = { ...existing, ...updates, id: issueId, updatedAt: now }

    // assignees <-> assignee sync
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

/** Delete issue (uses individual issue lock) */
export async function deleteIssue(projectPath: string, issueId: string): Promise<boolean> {
  const storage = getBrowserStorage()
  const relPath = issueRelPath(issueId)
  const lockPath = lockRelPathFor(relPath)

  return withLock(storage, projectPath, lockPath, async () => {
    try {
      await storage.deleteFile(projectPath, relPath)
      return true
    } catch {
      return false
    }
  })
}

// ─── Archive ────────────────────────────────────────

/** Archive issue (move from issues/ to issues/archive/ + set status to archived) */
export async function archiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const storage = getBrowserStorage()
  const srcRelPath = issueRelPath(issueId)
  const lockPath = lockRelPathFor(srcRelPath)

  return withLock(storage, projectPath, lockPath, async () => {
    const existing = await readIssue(projectPath, issueId)
    if (!existing) return null

    const now = new Date().toISOString()
    const archived: Issue = {
      ...existing,
      status: 'archived',
      updatedAt: now,
    }

    // Create archive directory and write
    await storage.createDirectory(projectPath, ARCHIVE_DIR)
    await storage.writeFile(
      projectPath,
      archiveRelPath(issueId),
      JSON.stringify(archived, null, 2)
    )

    // Delete original
    await storage.deleteFile(projectPath, srcRelPath).catch(() => {})

    return archived
  })
}

/** Unarchive issue (move from issues/archive/ to issues/ + set status to resolved) */
export async function unarchiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const storage = getBrowserStorage()

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

    await storage.writeFile(
      projectPath,
      issueRelPath(issueId),
      JSON.stringify(restored, null, 2)
    )

    // Remove from archive
    await storage.deleteFile(projectPath, archiveRelPath(issueId)).catch(() => {})

    return restored
  } catch {
    return null
  }
}

/** Read all archived issues */
export async function readArchivedIssues(projectPath: string): Promise<Issue[]> {
  const storage = getBrowserStorage()
  try {
    await storage.createDirectory(projectPath, ARCHIVE_DIR)
    const entries = await storage.listDirectory(projectPath, ARCHIVE_DIR)
    const issueFiles = entries.filter(
      (e) => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name)
    )

    const issues = await Promise.all(
      issueFiles.map(async (entry) => {
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
  const storage = getBrowserStorage()
  try {
    await storage.deleteFile(projectPath, archiveRelPath(issueId))
    return true
  } catch {
    return false
  }
}

// ─── Lock status queries ────────────────────────────────────────

/** Read lock statuses for all issues */
export async function readAllLockStatuses(projectPath: string): Promise<IssueLockStatus[]> {
  const storage = getBrowserStorage()
  try {
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR)
    const lockFiles = entries.filter(
      (e) => !e.isDirectory && /^ISS-\d{3,}\.json\.lock$/.test(e.name)
    )

    const statuses = await Promise.all(
      lockFiles.map(async (entry) => {
        const issueId = entry.name.replace('.json.lock', '')
        try {
          const content = await storage.readFile(projectPath, `${ISSUES_DIR}/${entry.name}`)
          const lock: LockInfo = JSON.parse(content)
          const isStale = new Date(lock.expiresAt).getTime() < Date.now()

          if (isStale) {
            return { issueId, locked: false } as IssueLockStatus
          }

          return {
            issueId,
            locked: true,
            holder: lock.holder,
            acquiredAt: lock.acquiredAt,
            expiresAt: lock.expiresAt,
          } as IssueLockStatus
        } catch {
          return { issueId, locked: false } as IssueLockStatus
        }
      })
    )

    return statuses.filter((s) => s.locked)
  } catch {
    return []
  }
}

/** Lightweight polling: return issue summaries only */
export async function readIssueSummaries(projectPath: string): Promise<IssueSummary[]> {
  const storage = getBrowserStorage()
  try {
    await storage.createDirectory(projectPath, ISSUES_DIR)
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR)
    const issueFiles = entries.filter(
      (e) => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name) && !e.name.endsWith('.lock')
    )

    const summaries = await Promise.all(
      issueFiles.map(async (entry) => {
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
