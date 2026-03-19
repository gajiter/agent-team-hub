/**
 * Issue Store — file-based issue storage with .lock file concurrency control
 *
 * Structure:
 *   issues/_index.json   — metadata + nextId counter
 *   issues/ISS-001.json  — individual issue data
 *   issues/ISS-001.json.lock — lock file (TTL-based)
 */

import { readFile, writeFile, readdir, mkdir, unlink, stat } from 'fs/promises'
import { join, dirname } from 'path'
import type { Issue, IssueLockStatus, IssueSummary, RawIssue } from '../types/issues'
import { normalizeIssue } from '../types/issues'

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

function issuesDir(projectPath: string): string {
  return join(projectPath, ISSUES_DIR)
}

function archiveDir(projectPath: string): string {
  return join(projectPath, ARCHIVE_DIR)
}

function issueFilePath(projectPath: string, issueId: string): string {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  return join(issuesDir(projectPath), `${issueId}.json`)
}

function lockFilePath(targetPath: string): string {
  return `${targetPath}.lock`
}

// ─── Lock mechanism ────────────────────────────────────────

async function isLockStale(lockPath: string): Promise<boolean> {
  try {
    const content = await readFile(lockPath, 'utf-8')
    const lock: LockInfo = JSON.parse(content)
    return new Date(lock.expiresAt).getTime() < Date.now()
  } catch {
    return true // read failure = invalid lock
  }
}

async function acquireLock(
  targetPath: string,
  holder: string = 'hub-api',
  maxRetries: number = 5,
  retryDelayMs: number = 100
): Promise<void> {
  const lp = lockFilePath(targetPath)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check existing lock
      await stat(lp)

      // Lock file exists — check if stale
      if (await isLockStale(lp)) {
        // Expired lock — remove and retry
        await unlink(lp).catch(() => {})
      } else {
        // Valid lock — wait and retry (exponential backoff)
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
        continue
      }
    } catch {
      // No lock file — proceed
    }

    // Create lock file (wx flag for O_EXCL semantics)
    const lockData: LockInfo = {
      holder,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + LOCK_TTL_MS).toISOString(),
    }

    try {
      await mkdir(dirname(lp), { recursive: true })
      await writeFile(lp, JSON.stringify(lockData), { flag: 'wx' })
      return // Lock acquired
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') {
        // Another process acquired first — retry
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
        continue
      }
      throw e
    }
  }

  throw new Error(`Failed to acquire lock for ${targetPath} after ${maxRetries} retries`)
}

async function releaseLock(targetPath: string): Promise<void> {
  const lp = lockFilePath(targetPath)
  try {
    await unlink(lp)
  } catch {
    // Lock file already gone — ignore
  }
}

/** Acquire lock -> perform work -> release lock (guarantees release even on error) */
async function withLock<T>(targetPath: string, fn: () => Promise<T>, holder?: string): Promise<T> {
  await acquireLock(targetPath, holder)
  try {
    return await fn()
  } finally {
    await releaseLock(targetPath)
  }
}

// ─── Lock status queries (read-only) ────────────────────────────

/** Read lock status for a specific issue */
async function readLockStatus(projectPath: string, issueId: string): Promise<IssueLockStatus> {
  const filePath = issueFilePath(projectPath, issueId)
  const lp = lockFilePath(filePath)

  try {
    await stat(lp)
    const content = await readFile(lp, 'utf-8')
    const lock: LockInfo = JSON.parse(content)
    const isStale = new Date(lock.expiresAt).getTime() < Date.now()

    if (isStale) {
      return { issueId, locked: false }
    }

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

/** Read lock statuses for all issues */
export async function readAllLockStatuses(projectPath: string): Promise<IssueLockStatus[]> {
  const dir = issuesDir(projectPath)
  try {
    const files = await readdir(dir)
    const lockFiles = files.filter((f) => /^ISS-\d{3,}\.json\.lock$/.test(f))

    const statuses = await Promise.all(
      lockFiles.map(async (file) => {
        const issueId = file.replace('.json.lock', '')
        return readLockStatus(projectPath, issueId)
      })
    )

    // Return only active locks
    return statuses.filter((s) => s.locked)
  } catch {
    return []
  }
}

/** Lightweight polling: return issue summaries only (id, updatedAt, status, commentsCount) */
export async function readIssueSummaries(projectPath: string): Promise<IssueSummary[]> {
  const dir = issuesDir(projectPath)
  try {
    await mkdir(dir, { recursive: true })
    const files = await readdir(dir)
    const issueFiles = files.filter((f) => /^ISS-\d{3,}\.json$/.test(f) && !f.endsWith('.lock'))

    const summaries = await Promise.all(
      issueFiles.map(async (file) => {
        try {
          const content = await readFile(join(dir, file), 'utf-8')
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

async function readIndex(projectPath: string): Promise<IndexData> {
  const indexPath = join(issuesDir(projectPath), INDEX_FILE)
  try {
    const content = await readFile(indexPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { ...DEFAULT_INDEX }
  }
}

async function writeIndex(projectPath: string, data: IndexData): Promise<void> {
  const indexPath = join(issuesDir(projectPath), INDEX_FILE)
  await mkdir(dirname(indexPath), { recursive: true })
  await writeFile(indexPath, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Issue CRUD ────────────────────────────────────────

/** Read individual issue file (includes assignees normalization) */
export async function readIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  try {
    const content = await readFile(issueFilePath(projectPath, issueId), 'utf-8')
    const raw = JSON.parse(content) as RawIssue
    return normalizeIssue(raw)
  } catch {
    return null
  }
}

/** Read all issues (parallel load from individual files) */
export async function readAllIssues(projectPath: string): Promise<Issue[]> {
  const dir = issuesDir(projectPath)
  try {
    await mkdir(dir, { recursive: true })
    const files = await readdir(dir)
    const issueFiles = files.filter((f) => /^ISS-\d{3,}\.json$/.test(f) && !f.endsWith('.lock'))

    const issues = await Promise.all(
      issueFiles.map(async (file) => {
        try {
          const content = await readFile(join(dir, file), 'utf-8')
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
  const indexPath = join(issuesDir(projectPath), INDEX_FILE)

  return withLock(indexPath, async () => {
    const index = await readIndex(projectPath)
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

    // Write issue file
    const filePath = issueFilePath(projectPath, newId)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(newIssue, null, 2), 'utf-8')

    // Increment nextId in index
    index.nextId = index.nextId + 1
    await writeIndex(projectPath, index)

    return newIssue
  })
}

/** Update issue (uses individual issue lock) */
export async function updateIssue(
  projectPath: string,
  issueId: string,
  updates: Partial<Issue>
): Promise<Issue | null> {
  const filePath = issueFilePath(projectPath, issueId)

  return withLock(filePath, async () => {
    const existing = await readIssue(projectPath, issueId)
    if (!existing) return null

    const now = new Date().toISOString()
    const merged = { ...existing, ...updates, id: issueId, updatedAt: now }

    // assignees <-> assignee sync
    if (updates.assignees && updates.assignees.length > 0) {
      merged.assignee = updates.assignees[0]
      merged.assignees = updates.assignees
    } else if (updates.assignee && !updates.assignees) {
      // Single assignee update (backward compat) — also update assignees
      merged.assignees = [updates.assignee]
    }

    const updated: Issue = merged

    await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')
    return updated
  })
}

/** Delete issue (uses individual issue lock) */
export async function deleteIssue(projectPath: string, issueId: string): Promise<boolean> {
  const filePath = issueFilePath(projectPath, issueId)

  return withLock(filePath, async () => {
    try {
      await unlink(filePath)
      return true
    } catch {
      return false
    }
  })
}

// ─── Archive ────────────────────────────────────────

/** Archive issue (move from issues/ to issues/archive/ + set status to archived) */
export async function archiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const srcPath = issueFilePath(projectPath, issueId)

  return withLock(srcPath, async () => {
    const existing = await readIssue(projectPath, issueId)
    if (!existing) return null

    const now = new Date().toISOString()
    const archived: Issue = {
      ...existing,
      status: 'archived',
      updatedAt: now,
    }

    // Create archive directory
    const destDir = archiveDir(projectPath)
    await mkdir(destDir, { recursive: true })

    const destPath = join(destDir, `${issueId}.json`)

    // Write to archive directory
    await writeFile(destPath, JSON.stringify(archived, null, 2), 'utf-8')

    // Delete original
    await unlink(srcPath).catch(() => {})

    return archived
  })
}

/** Unarchive issue (move from issues/archive/ to issues/ + set status to resolved) */
export async function unarchiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)

  const srcPath = join(archiveDir(projectPath), `${issueId}.json`)

  try {
    const content = await readFile(srcPath, 'utf-8')
    const raw = JSON.parse(content) as RawIssue
    const issue = normalizeIssue(raw)

    const now = new Date().toISOString()
    const restored: Issue = {
      ...issue,
      status: 'resolved', // restored as resolved
      updatedAt: now,
    }

    const destPath = issueFilePath(projectPath, issueId)
    await writeFile(destPath, JSON.stringify(restored, null, 2), 'utf-8')

    // Remove from archive
    await unlink(srcPath).catch(() => {})

    return restored
  } catch {
    return null
  }
}

/** Read all archived issues */
export async function readArchivedIssues(projectPath: string): Promise<Issue[]> {
  const dir = archiveDir(projectPath)
  try {
    await mkdir(dir, { recursive: true })
    const files = await readdir(dir)
    const issueFiles = files.filter((f) => /^ISS-\d{3,}\.json$/.test(f))

    const issues = await Promise.all(
      issueFiles.map(async (file) => {
        try {
          const content = await readFile(join(dir, file), 'utf-8')
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
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  const filePath = join(archiveDir(projectPath), `${issueId}.json`)
  try {
    await unlink(filePath)
    return true
  } catch {
    return false
  }
}
