# Browser Storage Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser-only storage mode so the app works when deployed to the cloud, using the File System Access API instead of server-side `fs`.

**Architecture:** Introduce a `NEXT_PUBLIC_STORAGE_MODE` env var (`server` | `browser`). Create a client-side service layer that mirrors the current API route functionality. In `browser` mode, services use `BrowserStorageProvider` (File System Access API) directly; in `server` mode, services call existing API routes via `fetch`. All hooks/components consume services instead of calling `fetch` directly.

**Tech Stack:** Next.js 16, File System Access API, IndexedDB, TypeScript

---

## File Structure

### New files to create

| File | Responsibility |
|------|---------------|
| `src/lib/services/mode.ts` | Storage mode detection (`getStorageMode()`) |
| `src/lib/services/config-store.ts` | Browser-mode replacement for global config (IndexedDB for projects/settings) |
| `src/lib/services/project-service.ts` | Projects CRUD (server: fetch, browser: IndexedDB) |
| `src/lib/services/settings-service.ts` | Settings read/write (server: fetch, browser: IndexedDB) |
| `src/lib/services/file-service.ts` | Generic file read (server: fetch, browser: BrowserStorageProvider) |
| `src/lib/services/planning-service.ts` | Planning data CRUD (server: fetch, browser: BrowserStorageProvider) |
| `src/lib/services/issue-service.ts` | Issues CRUD with locking (server: fetch, browser: BrowserStorageProvider) |
| `src/lib/services/agent-service.ts` | Agent CRUD (server: fetch, browser: BrowserStorageProvider) |
| `src/lib/services/doc-service.ts` | Docs listing (server: fetch, browser: BrowserStorageProvider) |
| `src/lib/services/init-service.ts` | Project initialization (server: fetch, browser: BrowserStorageProvider) |
| `src/lib/services/directory-service.ts` | Directory browsing (server: fetch, browser: showDirectoryPicker) |
| `src/lib/issue-store-browser.ts` | Browser-side issue store with lock file support via BrowserStorageProvider |
| `.env.development` | `NEXT_PUBLIC_STORAGE_MODE=server` |
| `.env.production` | `NEXT_PUBLIC_STORAGE_MODE=browser` |

### Files to modify

| File | Change |
|------|--------|
| `src/hooks/use-project.tsx` | Replace `fetch('/api/projects')` with `projectService` calls |
| `src/hooks/use-agents.ts` | Replace `fetch('/api/agents')` with `agentService` calls |
| `src/hooks/use-issue-polling.ts` | Replace `fetch('/api/issues')` and `/api/issues/poll` with `issueService` calls |
| `src/app/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/settings/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/issues/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/agents/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/docs/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/planning/features/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/planning/prd/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/planning/roles/page.tsx` | Replace `fetch` calls with service calls |
| `src/app/planning/userflow/page.tsx` | Replace `fetch` calls with service calls |
| `src/components/settings/folder-browser-dialog.tsx` | Replace `fetch('/api/directories')` with `directoryService` |
| `src/components/settings/project-list.tsx` | Replace `fetch('/api/init')` with `initService` |
| `src/lib/storage/browser.ts` | Add `createDirectory()` method for mkdir-equivalent |

### Files left unchanged

All `src/app/api/**/route.ts` files — they continue to work for `server` mode. No deletion needed.

---

## Task 1: Storage Mode Detection + Env Files

**Files:**
- Create: `src/lib/services/mode.ts`
- Create: `.env.development`
- Create: `.env.production`

- [ ] **Step 1: Create mode detection module**

```typescript
// src/lib/services/mode.ts
export type StorageMode = 'server' | 'browser'

export function getStorageMode(): StorageMode {
  const mode = process.env.NEXT_PUBLIC_STORAGE_MODE
  if (mode === 'browser') return 'browser'
  return 'server' // default
}

export function isBrowserMode(): boolean {
  return getStorageMode() === 'browser'
}
```

- [ ] **Step 2: Create env files**

`.env.development`:
```
NEXT_PUBLIC_STORAGE_MODE=server
```

`.env.production`:
```
NEXT_PUBLIC_STORAGE_MODE=browser
```

- [ ] **Step 3: Add `.env*.local` to .gitignore if not already present**

Check `.gitignore` and add `.env*.local` if missing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/mode.ts .env.development .env.production
git commit -m "feat: add storage mode detection with NEXT_PUBLIC_STORAGE_MODE env var"
```

---

## Task 2: Extend BrowserStorageProvider

**Files:**
- Modify: `src/lib/storage/browser.ts`

The current `BrowserStorageProvider` lacks `createDirectory()` (needed by issue store and init). Also, `writeFile` already creates intermediate directories, but we need an explicit method for creating empty dirs like `issues/archive/`.

- [ ] **Step 1: Add createDirectory method**

Add to `BrowserStorageProvider` class:

```typescript
async createDirectory(projectPath: string, relativePath: string): Promise<void> {
  const root = await this.getRootHandle(projectPath)
  const segments = this.splitPath(relativePath)
  let current = root
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true })
  }
}
```

- [ ] **Step 2: Add listDirectoryRecursive method for docs scanning**

The docs API route scans `docs/` subdirectories recursively. Add a helper:

```typescript
async listSubDirectories(projectPath: string, relativePath: string): Promise<string[]> {
  const root = await this.getRootHandle(projectPath)
  const segments = this.splitPath(relativePath)
  let dir: FileSystemDirectoryHandle
  try {
    dir = await this.navigateToParent(root, segments)
  } catch {
    return []
  }

  const subDirs: string[] = []
  for await (const [name, handle] of (dir as any).entries()) {
    if (handle.kind === 'directory') {
      subDirs.push(name)
    }
  }
  return subDirs
}
```

- [ ] **Step 3: Export singleton instance for browser mode**

Add at the bottom of `browser.ts`:

```typescript
// Singleton for browser mode
let _instance: BrowserStorageProvider | null = null
export function getBrowserStorage(): BrowserStorageProvider {
  if (!_instance) _instance = new BrowserStorageProvider()
  return _instance
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage/browser.ts
git commit -m "feat: extend BrowserStorageProvider with createDirectory and listSubDirectories"
```

---

## Task 3: IndexedDB Config Store (Browser-mode replacement for global config)

**Files:**
- Create: `src/lib/services/config-store.ts`

In server mode, projects list and settings live in `~/.agent-team-hub/config.json`. In browser mode, we store this in IndexedDB since there's no home directory access.

- [ ] **Step 1: Create config-store module**

```typescript
// src/lib/services/config-store.ts
import type { GlobalConfig, Project } from '@/types/project'

const DB_NAME = 'ai-hub-config'
const DB_VERSION = 1
const STORE_NAME = 'config'
const CONFIG_KEY = 'global'

const DEFAULT_CONFIG: GlobalConfig = {
  projects: [],
  settings: { theme: 'dark', language: 'ko', port: 3000 }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readConfig(): Promise<GlobalConfig> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(CONFIG_KEY)
    req.onsuccess = () => resolve(req.result ?? { ...DEFAULT_CONFIG })
    req.onerror = () => reject(req.error)
  })
}

export async function writeConfig(config: GlobalConfig): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(config, CONFIG_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/config-store.ts
git commit -m "feat: add IndexedDB config store for browser-mode project/settings persistence"
```

---

## Task 4: Project Service

**Files:**
- Create: `src/lib/services/project-service.ts`

- [ ] **Step 1: Create project service with dual-mode support**

```typescript
// src/lib/services/project-service.ts
import type { Project, GlobalConfig } from '@/types/project'
import { isBrowserMode } from './mode'
import { readConfig, writeConfig } from './config-store'

// ─── Server mode (fetch API routes) ───

async function serverGetProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  const data = await res.json()
  return data.projects || []
}

async function serverAddProject(name: string, path: string): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path }),
  })
  return res.json()
}

async function serverDeleteProject(id: string): Promise<void> {
  await fetch('/api/projects', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

// ─── Browser mode (IndexedDB) ───

async function browserGetProjects(): Promise<Project[]> {
  const config = await readConfig()
  return config.projects || []
}

async function browserAddProject(name: string, path: string): Promise<Project> {
  const config = await readConfig()
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    path,
    createdAt: new Date().toISOString(),
  }
  config.projects.push(project)
  await writeConfig(config)
  return project
}

async function browserDeleteProject(id: string): Promise<void> {
  const config = await readConfig()
  config.projects = config.projects.filter(p => p.id !== id)
  await writeConfig(config)
}

// ─── Public API ───

export const projectService = {
  getProjects: (): Promise<Project[]> =>
    isBrowserMode() ? browserGetProjects() : serverGetProjects(),

  addProject: (name: string, path: string): Promise<Project> =>
    isBrowserMode() ? browserAddProject(name, path) : serverAddProject(name, path),

  deleteProject: (id: string): Promise<void> =>
    isBrowserMode() ? browserDeleteProject(id) : serverDeleteProject(id),

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getProjects()
    return projects.find(p => p.id === id) || null
  },

  async getProjectPath(projectId: string): Promise<string> {
    const project = await this.getProject(projectId)
    if (!project) throw new Error('Project not found')
    return project.path
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/project-service.ts
git commit -m "feat: add project service with server/browser dual-mode support"
```

---

## Task 5: Settings Service

**Files:**
- Create: `src/lib/services/settings-service.ts`

- [ ] **Step 1: Create settings service**

```typescript
// src/lib/services/settings-service.ts
import type { GlobalConfig } from '@/types/project'
import { isBrowserMode } from './mode'
import { readConfig, writeConfig } from './config-store'

type Settings = GlobalConfig['settings']

async function serverGetSettings(): Promise<Settings> {
  const res = await fetch('/api/settings')
  const data = await res.json()
  return data.settings
}

async function serverUpdateSettings(updates: Partial<Settings>): Promise<Settings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  return data.settings
}

async function browserGetSettings(): Promise<Settings> {
  const config = await readConfig()
  return config.settings
}

async function browserUpdateSettings(updates: Partial<Settings>): Promise<Settings> {
  const config = await readConfig()
  config.settings = { ...config.settings, ...updates }
  await writeConfig(config)
  return config.settings
}

export const settingsService = {
  getSettings: (): Promise<Settings> =>
    isBrowserMode() ? browserGetSettings() : serverGetSettings(),

  updateSettings: (updates: Partial<Settings>): Promise<Settings> =>
    isBrowserMode() ? browserUpdateSettings(updates) : serverUpdateSettings(updates),
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/settings-service.ts
git commit -m "feat: add settings service with server/browser dual-mode support"
```

---

## Task 6: File Service

**Files:**
- Create: `src/lib/services/file-service.ts`

- [ ] **Step 1: Create file service**

```typescript
// src/lib/services/file-service.ts
import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'
import { projectService } from './project-service'

interface FileReadResult {
  content: string
  exists: boolean
}

async function serverReadFile(projectId: string, path: string): Promise<FileReadResult> {
  const res = await fetch(`/api/files?projectId=${projectId}&path=${encodeURIComponent(path)}`)
  return res.json()
}

async function browserReadFile(projectId: string, path: string): Promise<FileReadResult> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  try {
    const content = await storage.readFile(projectPath, path)
    return { content, exists: true }
  } catch {
    return { content: '', exists: false }
  }
}

export const fileService = {
  readFile: (projectId: string, path: string): Promise<FileReadResult> =>
    isBrowserMode() ? browserReadFile(projectId, path) : serverReadFile(projectId, path),
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/file-service.ts
git commit -m "feat: add file service with server/browser dual-mode support"
```

---

## Task 7: Planning Service

**Files:**
- Create: `src/lib/services/planning-service.ts`

- [ ] **Step 1: Create planning service**

```typescript
// src/lib/services/planning-service.ts
import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'
import { projectService } from './project-service'

const VALID_TYPES = ['prd', 'features', 'roles', 'userflow'] as const
type PlanningType = typeof VALID_TYPES[number]

interface PlanningReadResult {
  data: any
  exists: boolean
}

function validateType(type: string): type is PlanningType {
  return VALID_TYPES.includes(type as PlanningType)
}

async function serverGet(projectId: string, type: string): Promise<PlanningReadResult> {
  const res = await fetch(`/api/files?projectId=${projectId}&path=data/${type}.json`)
  const result = await res.json()
  return {
    data: result.exists ? JSON.parse(result.content) : null,
    exists: result.exists,
  }
}

async function serverPut(projectId: string, type: string, data: any): Promise<void> {
  await fetch('/api/planning', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, type, data }),
  })
}

async function browserGet(projectId: string, type: string): Promise<PlanningReadResult> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  try {
    const content = await storage.readFile(projectPath, `data/${type}.json`)
    return { data: JSON.parse(content), exists: true }
  } catch {
    return { data: null, exists: false }
  }
}

async function browserPut(projectId: string, type: string, data: any): Promise<void> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  await storage.writeFile(projectPath, `data/${type}.json`, JSON.stringify(data, null, 2))
}

export const planningService = {
  get(projectId: string, type: string): Promise<PlanningReadResult> {
    if (!validateType(type)) throw new Error(`Invalid planning type: ${type}`)
    return isBrowserMode() ? browserGet(projectId, type) : serverGet(projectId, type)
  },

  put(projectId: string, type: string, data: any): Promise<void> {
    if (!validateType(type)) throw new Error(`Invalid planning type: ${type}`)
    return isBrowserMode() ? browserPut(projectId, type) : serverPut(projectId, type, data)
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/planning-service.ts
git commit -m "feat: add planning service with server/browser dual-mode support"
```

---

## Task 8: Browser-side Issue Store with Locking

**Files:**
- Create: `src/lib/issue-store-browser.ts`

This replicates the server-side `issue-store.ts` logic using `BrowserStorageProvider`. Lock files are written as `.json.lock` via the File System Access API so that AI agents editing the same files on the local filesystem will see them.

- [ ] **Step 1: Create browser issue store**

```typescript
// src/lib/issue-store-browser.ts
import type { StorageProvider } from '@/types/storage'
import type { Issue, IssueLockStatus, IssueSummary, RawIssue } from '@/types/issues'
import { normalizeIssue } from '@/types/issues'
import { getBrowserStorage, BrowserStorageProvider } from '@/lib/storage/browser'

const ISSUES_DIR = 'issues'
const ARCHIVE_DIR = 'issues/archive'
const INDEX_FILE = 'issues/_index.json'
const LOCK_TTL_MS = 10_000

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

// ─── Lock mechanism (via BrowserStorageProvider) ───

async function isLockStale(storage: BrowserStorageProvider, projectPath: string, lockRelPath: string): Promise<boolean> {
  try {
    const content = await storage.readFile(projectPath, lockRelPath)
    const lock: LockInfo = JSON.parse(content)
    return new Date(lock.expiresAt).getTime() < Date.now()
  } catch {
    return true
  }
}

async function acquireLock(
  storage: BrowserStorageProvider,
  projectPath: string,
  lockRelPath: string,
  holder: string = 'hub-browser',
  maxRetries: number = 5,
  retryDelayMs: number = 100
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const lockExists = await storage.exists(projectPath, lockRelPath)

    if (lockExists) {
      if (await isLockStale(storage, projectPath, lockRelPath)) {
        await storage.deleteFile(projectPath, lockRelPath).catch(() => {})
      } else {
        await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)))
        continue
      }
    }

    const lockData: LockInfo = {
      holder,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + LOCK_TTL_MS).toISOString(),
    }

    // File System Access API does not have O_EXCL, but since this is single-tab,
    // race conditions are extremely unlikely. Write the lock file.
    await storage.writeFile(projectPath, lockRelPath, JSON.stringify(lockData))
    return
  }

  throw new Error(`Failed to acquire lock for ${lockRelPath} after ${maxRetries} retries`)
}

async function releaseLock(storage: BrowserStorageProvider, projectPath: string, lockRelPath: string): Promise<void> {
  try {
    await storage.deleteFile(projectPath, lockRelPath)
  } catch {
    // Lock file already gone
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

// ─── Index management ───

const DEFAULT_INDEX: IndexData = {
  version: '2.0',
  description: 'Issue management data shared between AI agents and humans.',
  schema: {},
  nextId: 1,
}

async function readIndex(storage: BrowserStorageProvider, projectPath: string): Promise<IndexData> {
  try {
    const content = await storage.readFile(projectPath, INDEX_FILE)
    return JSON.parse(content)
  } catch {
    return { ...DEFAULT_INDEX }
  }
}

async function writeIndex(storage: BrowserStorageProvider, projectPath: string, data: IndexData): Promise<void> {
  await storage.writeFile(projectPath, INDEX_FILE, JSON.stringify(data, null, 2))
}

// ─── Issue CRUD ───

export async function readIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  const storage = getBrowserStorage()
  try {
    const content = await storage.readFile(projectPath, `${ISSUES_DIR}/${issueId}.json`)
    return normalizeIssue(JSON.parse(content) as RawIssue)
  } catch {
    return null
  }
}

export async function readAllIssues(projectPath: string): Promise<Issue[]> {
  const storage = getBrowserStorage()
  try {
    await storage.createDirectory(projectPath, ISSUES_DIR)
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR)
    const issueFiles = entries.filter(e => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name) && !e.name.endsWith('.lock'))

    const issues = await Promise.all(
      issueFiles.map(async (entry) => {
        try {
          const content = await storage.readFile(projectPath, entry.path)
          return normalizeIssue(JSON.parse(content) as RawIssue)
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

export async function createIssue(projectPath: string, data: Partial<Issue>): Promise<Issue> {
  const storage = getBrowserStorage()
  const indexLockPath = `${INDEX_FILE}.lock`

  return withLock(storage, projectPath, indexLockPath, async () => {
    const index = await readIndex(storage, projectPath)
    const newId = `ISS-${String(index.nextId).padStart(3, '0')}`
    const now = new Date().toISOString()

    const assignees = data.assignees && data.assignees.length > 0
      ? data.assignees
      : data.assignee ? [data.assignee] : ['human']

    const newIssue: Issue = {
      id: newId,
      title: data.title || 'Untitled',
      description: data.description || '',
      status: data.status || 'open',
      priority: data.priority || 'medium',
      type: data.type || 'task',
      assignee: assignees[0] ?? 'human',
      assignees,
      reporter: data.reporter || 'human',
      labels: data.labels || [],
      relatedFiles: data.relatedFiles || [],
      relatedIds: data.relatedIds || [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    }

    await storage.writeFile(projectPath, `${ISSUES_DIR}/${newId}.json`, JSON.stringify(newIssue, null, 2))
    index.nextId = index.nextId + 1
    await writeIndex(storage, projectPath, index)
    return newIssue
  })
}

export async function updateIssue(projectPath: string, issueId: string, updates: Partial<Issue>): Promise<Issue | null> {
  const storage = getBrowserStorage()
  const lockPath = `${ISSUES_DIR}/${issueId}.json.lock`

  return withLock(storage, projectPath, lockPath, async () => {
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

    await storage.writeFile(projectPath, `${ISSUES_DIR}/${issueId}.json`, JSON.stringify(merged, null, 2))
    return merged
  })
}

export async function deleteIssue(projectPath: string, issueId: string): Promise<boolean> {
  const storage = getBrowserStorage()
  const lockPath = `${ISSUES_DIR}/${issueId}.json.lock`

  return withLock(storage, projectPath, lockPath, async () => {
    try {
      await storage.deleteFile(projectPath, `${ISSUES_DIR}/${issueId}.json`)
      return true
    } catch {
      return false
    }
  })
}

// ─── Archive ───

export async function archiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  const storage = getBrowserStorage()
  const lockPath = `${ISSUES_DIR}/${issueId}.json.lock`

  return withLock(storage, projectPath, lockPath, async () => {
    const existing = await readIssue(projectPath, issueId)
    if (!existing) return null

    const archived: Issue = { ...existing, status: 'archived', updatedAt: new Date().toISOString() }
    await storage.createDirectory(projectPath, ARCHIVE_DIR)
    await storage.writeFile(projectPath, `${ARCHIVE_DIR}/${issueId}.json`, JSON.stringify(archived, null, 2))
    await storage.deleteFile(projectPath, `${ISSUES_DIR}/${issueId}.json`).catch(() => {})
    return archived
  })
}

export async function unarchiveIssue(projectPath: string, issueId: string): Promise<Issue | null> {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  const storage = getBrowserStorage()
  try {
    const content = await storage.readFile(projectPath, `${ARCHIVE_DIR}/${issueId}.json`)
    const issue = normalizeIssue(JSON.parse(content) as RawIssue)
    const restored: Issue = { ...issue, status: 'resolved', updatedAt: new Date().toISOString() }

    await storage.writeFile(projectPath, `${ISSUES_DIR}/${issueId}.json`, JSON.stringify(restored, null, 2))
    await storage.deleteFile(projectPath, `${ARCHIVE_DIR}/${issueId}.json`).catch(() => {})
    return restored
  } catch {
    return null
  }
}

export async function readArchivedIssues(projectPath: string): Promise<Issue[]> {
  const storage = getBrowserStorage()
  try {
    await storage.createDirectory(projectPath, ARCHIVE_DIR)
    const entries = await storage.listDirectory(projectPath, ARCHIVE_DIR)
    const issueFiles = entries.filter(e => !e.isDirectory && /^ISS-\d{3,}\.json$/.test(e.name))

    const issues = await Promise.all(
      issueFiles.map(async (entry) => {
        try {
          const content = await storage.readFile(projectPath, entry.path)
          return normalizeIssue(JSON.parse(content) as RawIssue)
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

export async function deleteArchivedIssue(projectPath: string, issueId: string): Promise<boolean> {
  if (!/^ISS-\d{3,}$/.test(issueId)) throw new Error(`Invalid issue ID: ${issueId}`)
  const storage = getBrowserStorage()
  try {
    await storage.deleteFile(projectPath, `${ARCHIVE_DIR}/${issueId}.json`)
    return true
  } catch {
    return false
  }
}

// ─── Lock status queries ───

export async function readAllLockStatuses(projectPath: string): Promise<IssueLockStatus[]> {
  const storage = getBrowserStorage()
  try {
    const entries = await storage.listDirectory(projectPath, ISSUES_DIR)
    const lockFiles = entries.filter(e => !e.isDirectory && /^ISS-\d{3,}\.json\.lock$/.test(e.name))

    const statuses = await Promise.all(
      lockFiles.map(async (entry) => {
        const issueId = entry.name.replace('.json.lock', '')
        try {
          const content = await storage.readFile(projectPath, entry.path)
          const lock: LockInfo = JSON.parse(content)
          if (new Date(lock.expiresAt).getTime() < Date.now()) {
            return { issueId, locked: false } as IssueLockStatus
          }
          return { issueId, locked: true, holder: lock.holder, acquiredAt: lock.acquiredAt, expiresAt: lock.expiresAt } as IssueLockStatus
        } catch {
          return { issueId, locked: false } as IssueLockStatus
        }
      })
    )
    return statuses.filter(s => s.locked)
  } catch {
    return []
  }
}

export async function readIssueSummaries(projectPath: string): Promise<IssueSummary[]> {
  const issues = await readAllIssues(projectPath)
  return issues.map(issue => ({
    id: issue.id,
    updatedAt: issue.updatedAt,
    status: issue.status,
    commentsCount: issue.comments?.length ?? 0,
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/issue-store-browser.ts
git commit -m "feat: add browser-side issue store with File System Access API locking"
```

---

## Task 9: Issue Service

**Files:**
- Create: `src/lib/services/issue-service.ts`

- [ ] **Step 1: Create issue service that delegates to server API or browser store**

```typescript
// src/lib/services/issue-service.ts
import type { Issue, IssueLockStatus, IssueSummary } from '@/types/issues'
import { isBrowserMode } from './mode'
import { projectService } from './project-service'
import * as browserStore from '@/lib/issue-store-browser'

// ─── Server mode helpers ───

async function serverFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  return res.json()
}

// ─── Public API ───

export const issueService = {
  async getAll(projectId: string): Promise<Issue[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readAllIssues(projectPath)
    }
    const data = await serverFetch(`/api/issues?projectId=${projectId}`)
    return data.issues || []
  },

  async get(projectId: string, issueId: string): Promise<Issue | null> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readIssue(projectPath, issueId)
    }
    const data = await serverFetch(`/api/issues?projectId=${projectId}&id=${issueId}`)
    return data.issue || null
  },

  async create(projectId: string, issueData: Partial<Issue>): Promise<Issue> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.createIssue(projectPath, issueData)
    }
    const data = await serverFetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...issueData }),
    })
    return data.issue
  },

  async update(projectId: string, issueId: string, updates: Partial<Issue>): Promise<Issue | null> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.updateIssue(projectPath, issueId, updates)
    }
    const data = await serverFetch('/api/issues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, id: issueId, ...updates }),
    })
    return data.issue
  },

  async deleteMany(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map(id => browserStore.deleteIssue(projectPath, id)))
      return
    }
    await serverFetch('/api/issues', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids }),
    })
  },

  // ─── Archive ───

  async getArchived(projectId: string): Promise<Issue[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readArchivedIssues(projectPath)
    }
    const data = await serverFetch(`/api/issues/archive?projectId=${projectId}`)
    return data.issues || []
  },

  async archive(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map(id => browserStore.archiveIssue(projectPath, id)))
      return
    }
    await serverFetch('/api/issues/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids, action: 'archive' }),
    })
  },

  async unarchive(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map(id => browserStore.unarchiveIssue(projectPath, id)))
      return
    }
    await serverFetch('/api/issues/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids, action: 'unarchive' }),
    })
  },

  async deleteArchived(projectId: string, ids: string[]): Promise<void> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      await Promise.all(ids.map(id => browserStore.deleteArchivedIssue(projectPath, id)))
      return
    }
    await serverFetch('/api/issues/archive', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ids }),
    })
  },

  // ─── Polling ───

  async getLocks(projectId: string): Promise<IssueLockStatus[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readAllLockStatuses(projectPath)
    }
    const data = await serverFetch(`/api/issues/locks?projectId=${projectId}`)
    return data.locks || []
  },

  async getSummaries(projectId: string): Promise<IssueSummary[]> {
    if (isBrowserMode()) {
      const projectPath = await projectService.getProjectPath(projectId)
      return browserStore.readIssueSummaries(projectPath)
    }
    const data = await serverFetch(`/api/issues/poll?projectId=${projectId}`)
    return data.summaries || []
  },

  /** Compute fingerprint for change detection (same logic as server poll endpoint) */
  computeFingerprint(summaries: IssueSummary[]): string {
    const raw = summaries
      .map(s => `${s.id}:${s.updatedAt}:${s.status}:${s.commentsCount}`)
      .sort()
      .join('|')
    // Simple hash
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return hash.toString(36)
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/issue-service.ts
git commit -m "feat: add issue service with locking support for both modes"
```

---

## Task 10: Agent Service

**Files:**
- Create: `src/lib/services/agent-service.ts`

- [ ] **Step 1: Create agent service**

```typescript
// src/lib/services/agent-service.ts
import type { AgentInfo } from '@/types/agents'
import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'
import { projectService } from './project-service'
import { parseFrontmatter } from '@/lib/parsers'

const AGENTS_DIR = '.claude/agents'

function buildAgentContent(meta: {
  name: string; description?: string; model?: string; color?: string
  emoji?: string; role?: string; responsibilities?: string[]
}, body?: string): string {
  const lines: string[] = ['---']
  lines.push(`name: ${meta.name}`)
  if (meta.description) lines.push(`description: ${meta.description}`)
  if (meta.model) lines.push(`model: ${meta.model}`)
  if (meta.color) lines.push(`color: ${meta.color}`)
  if (meta.emoji) lines.push(`emoji: ${meta.emoji}`)
  if (meta.role) lines.push(`role: ${meta.role}`)
  if (meta.responsibilities && meta.responsibilities.length > 0) {
    lines.push('responsibilities:')
    for (const r of meta.responsibilities) lines.push(`  - ${r}`)
  }
  lines.push('---')
  lines.push('')
  if (body) {
    lines.push(body)
  } else {
    lines.push(`# ${meta.name}`)
    lines.push('')
    if (meta.description) { lines.push(meta.description); lines.push('') }
    lines.push('## Workflow')
    lines.push('')
    lines.push('1. Read assigned issues from `issues/` directory')
    lines.push('2. Update issue status to `in-progress` when starting work')
    lines.push('3. Implement changes according to issue description')
    lines.push('4. Update issue status to `resolved` when complete')
    lines.push('5. Add a comment summarizing what was done')
    lines.push('')
  }
  return lines.join('\n')
}

async function browserGetAgents(projectId: string): Promise<AgentInfo[]> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  try {
    const entries = await storage.listDirectory(projectPath, AGENTS_DIR)
    const mdFiles = entries.filter(e => !e.isDirectory && e.name.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name))

    return Promise.all(mdFiles.map(async (entry) => {
      const content = await storage.readFile(projectPath, entry.path)
      const fm = parseFrontmatter(content)
      const meta = fm.metadata
      return {
        fileName: entry.name,
        name: (meta.name as string) || entry.name.replace(/\.md$/, ''),
        description: (meta.description as string) || '',
        model: (meta.model as string) || '',
        color: (meta.color as string) || '',
        emoji: (meta.emoji as string) || '',
        role: (meta.role as string) || '',
        responsibilities: Array.isArray(meta.responsibilities) ? meta.responsibilities : [],
        content,
      }
    }))
  } catch {
    return []
  }
}

async function browserCreateAgent(projectId: string, data: any): Promise<AgentInfo> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  await storage.createDirectory(projectPath, AGENTS_DIR)

  const fileName = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md'

  if (await storage.exists(projectPath, `${AGENTS_DIR}/${fileName}`)) {
    throw new Error('Agent with this name already exists')
  }

  const content = buildAgentContent(data)
  await storage.writeFile(projectPath, `${AGENTS_DIR}/${fileName}`, content)

  return { fileName, name: data.name, description: data.description || '', model: data.model || '', color: data.color || '', emoji: data.emoji || '', role: data.role || '', responsibilities: data.responsibilities || [], content }
}

async function browserUpdateAgent(projectId: string, fileName: string, updates: any, agentBody?: string): Promise<AgentInfo> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  const filePath = `${AGENTS_DIR}/${fileName}`

  const existingContent = await storage.readFile(projectPath, filePath)
  const existing = parseFrontmatter(existingContent)
  const existingMeta = existing.metadata

  const mergedMeta = {
    name: updates.name || (existingMeta.name as string) || fileName.replace(/\.md$/, ''),
    description: updates.description ?? (existingMeta.description as string) ?? '',
    model: updates.model ?? (existingMeta.model as string) ?? '',
    color: updates.color ?? (existingMeta.color as string) ?? '',
    emoji: updates.emoji ?? (existingMeta.emoji as string) ?? '',
    role: updates.role ?? (existingMeta.role as string) ?? '',
    responsibilities: updates.responsibilities ?? (existingMeta.responsibilities as string[]) ?? [],
  }

  const newContent = buildAgentContent(mergedMeta, agentBody ?? existing.body)
  await storage.writeFile(projectPath, filePath, newContent)

  return { fileName, ...mergedMeta, content: newContent }
}

async function browserDeleteAgent(projectId: string, fileName: string): Promise<void> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  await storage.deleteFile(projectPath, `${AGENTS_DIR}/${fileName}`)
}

export const agentService = {
  async getAll(projectId: string): Promise<AgentInfo[]> {
    if (isBrowserMode()) return browserGetAgents(projectId)
    const res = await fetch(`/api/agents?projectId=${projectId}`)
    const data = await res.json()
    return data.agents || []
  },

  async create(projectId: string, data: any): Promise<AgentInfo> {
    if (isBrowserMode()) return browserCreateAgent(projectId, data)
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...data }),
    })
    return res.json()
  },

  async update(projectId: string, fileName: string, updates: any, agentBody?: string): Promise<AgentInfo> {
    if (isBrowserMode()) return browserUpdateAgent(projectId, fileName, updates, agentBody)
    const res = await fetch('/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fileName, body: agentBody, ...updates }),
    })
    return res.json()
  },

  async delete(projectId: string, fileName: string): Promise<void> {
    if (isBrowserMode()) return browserDeleteAgent(projectId, fileName)
    await fetch('/api/agents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fileName }),
    })
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/agent-service.ts
git commit -m "feat: add agent service with server/browser dual-mode support"
```

---

## Task 11: Doc Service

**Files:**
- Create: `src/lib/services/doc-service.ts`

- [ ] **Step 1: Create doc service**

Replicates the docs API route logic (frontmatter parsing, token estimation, recursive scanning) for browser mode.

```typescript
// src/lib/services/doc-service.ts
import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'
import { projectService } from './project-service'
import { parseFrontmatter } from '@/lib/parsers'

interface DocMeta {
  path: string; title: string; description: string; author: string
  emoji: string; type: string; references: string[]; createdAt: string
  category: string; tokens: number
}

interface DocResult {
  docs: DocMeta[]
  categories: { id: string; label: string; count: number }[]
}

function estimateTokens(content: string): number {
  let tokens = 0
  const cjkRegex = /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/
  for (const char of content) {
    if (/\s/.test(char)) tokens += 0.15
    else if (cjkRegex.test(char)) tokens += 2.2
    else tokens += 0.3
  }
  return Math.ceil(tokens)
}

function parseDocMeta(content: string, filePath: string, category: string, fileName: string): DocMeta {
  const fm = parseFrontmatter(content)
  const meta = fm.metadata
  const fallbackTitle = fileName.replace('.md', '').replace(/-/g, ' ')
  return {
    path: filePath,
    title: (meta.title as string) || fallbackTitle,
    description: (meta.description as string) || '',
    author: (meta.author as string) || '',
    emoji: (meta.emoji as string) || '',
    type: (meta.type as string) || category,
    references: Array.isArray(meta.references) ? meta.references as string[] : [],
    createdAt: (meta.createdAt as string) || '',
    category,
    tokens: estimateTokens(content),
  }
}

async function browserGetDocs(projectId: string): Promise<DocResult> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  const allDocs: DocMeta[] = []

  try {
    const subDirs = await storage.listSubDirectories(projectPath, 'docs')

    for (const subDir of subDirs) {
      try {
        const entries = await storage.listDirectory(projectPath, `docs/${subDir}`)
        const mdFiles = entries.filter(e => !e.isDirectory && e.name.endsWith('.md'))
        for (const entry of mdFiles) {
          const content = await storage.readFile(projectPath, entry.path)
          allDocs.push(parseDocMeta(content, entry.path, subDir, entry.name))
        }
      } catch { /* skip */ }
    }

    // Root-level md files
    try {
      const rootEntries = await storage.listDirectory(projectPath, 'docs')
      const rootMdFiles = rootEntries.filter(e => !e.isDirectory && e.name.endsWith('.md'))
      for (const entry of rootMdFiles) {
        const content = await storage.readFile(projectPath, entry.path)
        allDocs.push(parseDocMeta(content, entry.path, 'general', entry.name))
      }
    } catch { /* skip */ }
  } catch {
    return { docs: [], categories: [] }
  }

  const categorySet = new Set(allDocs.map(d => d.category))
  const categories = Array.from(categorySet).map(cat => ({
    id: cat, label: cat, count: allDocs.filter(d => d.category === cat).length,
  }))

  return { docs: allDocs, categories }
}

export const docService = {
  async getAll(projectId: string): Promise<DocResult> {
    if (isBrowserMode()) return browserGetDocs(projectId)
    const res = await fetch(`/api/docs?projectId=${projectId}`)
    return res.json()
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/doc-service.ts
git commit -m "feat: add doc service with server/browser dual-mode support"
```

---

## Task 12: Init Service

**Files:**
- Create: `src/lib/services/init-service.ts`

- [ ] **Step 1: Create init service**

In browser mode, project initialization creates the directory structure and template files via BrowserStorageProvider. Template contents are embedded as strings since we can't read from `src/templates/` in the browser.

```typescript
// src/lib/services/init-service.ts
import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'
import { projectService } from './project-service'

// In browser mode, templates must be bundled. We import them at build time.
// These will be created as static imports in the next step.
import { CLAUDE_MD_SECTION, HUB_WORKFLOW_TEMPLATE, HUB_SKILL_TEMPLATE } from '@/lib/templates-bundled'

async function serverCheckInit(projectId: string): Promise<boolean> {
  const res = await fetch(`/api/init?projectId=${encodeURIComponent(projectId)}`)
  const data = await res.json()
  return data.initialized
}

async function serverInit(projectId: string): Promise<string[]> {
  const res = await fetch('/api/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  })
  const data = await res.json()
  return data.created || []
}

async function browserCheckInit(projectId: string): Promise<boolean> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  return storage.exists(projectPath, '.hub/config.json')
}

async function browserInit(projectId: string): Promise<string[]> {
  const storage = getBrowserStorage()
  const projectPath = await projectService.getProjectPath(projectId)
  const created: string[] = []

  // 1. .hub/config.json
  if (!await storage.exists(projectPath, '.hub/config.json')) {
    await storage.writeFile(projectPath, '.hub/config.json', JSON.stringify({
      initialized: true, createdAt: new Date().toISOString()
    }, null, 2))
    created.push('.hub/config.json')
  }

  // 2. Create directories
  for (const dir of ['docs', 'issues', 'issues/archive']) {
    await storage.createDirectory(projectPath, dir)
  }

  // 3. issues/_index.json
  if (!await storage.exists(projectPath, 'issues/_index.json')) {
    await storage.writeFile(projectPath, 'issues/_index.json', JSON.stringify({
      version: '1.0', nextId: 1
    }, null, 2))
    created.push('issues/_index.json')
  }

  // 4. CLAUDE.md section
  const startMarker = '<!-- agent-team-hub:start -->'
  const endMarker = '<!-- agent-team-hub:end -->'
  let content = ''
  try { content = await storage.readFile(projectPath, 'CLAUDE.md') } catch {}

  if (content.includes(startMarker)) {
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`)
    content = content.replace(regex, CLAUDE_MD_SECTION.trim())
  } else {
    content = content ? content + '\n\n' + CLAUDE_MD_SECTION.trim() : CLAUDE_MD_SECTION.trim()
  }
  await storage.writeFile(projectPath, 'CLAUDE.md', content)
  created.push('CLAUDE.md')

  // 5. .claude/rules/hub-workflow.md
  if (!await storage.exists(projectPath, '.claude/rules/hub-workflow.md')) {
    await storage.writeFile(projectPath, '.claude/rules/hub-workflow.md', HUB_WORKFLOW_TEMPLATE)
    created.push('.claude/rules/hub-workflow.md')
  }

  // 6. .claude/skills/hub.md
  if (!await storage.exists(projectPath, '.claude/skills/hub.md')) {
    await storage.writeFile(projectPath, '.claude/skills/hub.md', HUB_SKILL_TEMPLATE)
    created.push('.claude/skills/hub.md')
  }

  return created
}

export const initService = {
  checkInit: (projectId: string): Promise<boolean> =>
    isBrowserMode() ? browserCheckInit(projectId) : serverCheckInit(projectId),

  init: (projectId: string): Promise<string[]> =>
    isBrowserMode() ? browserInit(projectId) : serverInit(projectId),
}
```

- [ ] **Step 2: Create bundled templates module**

Read the template files and create a TypeScript module that exports their contents as strings. This allows browser mode to access templates without server-side fs.

Create `src/lib/templates-bundled.ts`:

```typescript
// src/lib/templates-bundled.ts
// Auto-generated from src/templates/*.md — re-run if templates change.
// These are embedded so browser mode can access them without server-side fs.

export const CLAUDE_MD_SECTION = `<contents of src/templates/claude-md-section.md>`

export const HUB_WORKFLOW_TEMPLATE = `<contents of src/templates/hub-workflow.md>`

export const HUB_SKILL_TEMPLATE = `<contents of src/templates/hub-skill.md>`
```

**Implementation note:** When implementing this step, read the actual template files and embed their full contents as template literal strings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/init-service.ts src/lib/templates-bundled.ts
git commit -m "feat: add init service with bundled templates for browser mode"
```

---

## Task 13: Directory Service

**Files:**
- Create: `src/lib/services/directory-service.ts`

In browser mode, directory browsing is replaced by `showDirectoryPicker()` — the browser's native folder picker. This means the folder-browser-dialog component needs a different UX in browser mode: instead of navigating a tree, it shows a single "Select Folder" button.

- [ ] **Step 1: Create directory service**

```typescript
// src/lib/services/directory-service.ts
import { isBrowserMode } from './mode'
import { getBrowserStorage } from '@/lib/storage/browser'

interface DirectoryInfo {
  current: string
  parent: string | null
  directories: { name: string; path: string }[]
  isProject: boolean
}

async function serverBrowse(path?: string): Promise<DirectoryInfo> {
  const params = path ? `?path=${encodeURIComponent(path)}` : ''
  const res = await fetch(`/api/directories${params}`)
  return res.json()
}

/**
 * In browser mode, trigger showDirectoryPicker and return the handle.
 * Returns the directory name as the "path" (used as project identifier).
 */
async function browserPickDirectory(): Promise<{ handle: FileSystemDirectoryHandle; name: string }> {
  const storage = getBrowserStorage()
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  return { handle, name: handle.name }
}

export const directoryService = {
  /** Server mode: browse filesystem. Browser mode: not applicable (use pickDirectory). */
  browse: (path?: string): Promise<DirectoryInfo> => serverBrowse(path),

  /** Browser mode only: open native directory picker and register handle. */
  async pickDirectory(): Promise<{ name: string; path: string }> {
    const { handle, name } = await browserPickDirectory()
    // Use the directory name as a stable identifier
    const path = name
    const storage = getBrowserStorage()
    await storage.requestAccess(path)
    return { name, path }
  },

  isBrowserMode,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/directory-service.ts
git commit -m "feat: add directory service with showDirectoryPicker for browser mode"
```

---

## Task 14: Update Hooks to Use Services

**Files:**
- Modify: `src/hooks/use-project.tsx`
- Modify: `src/hooks/use-agents.ts`
- Modify: `src/hooks/use-issue-polling.ts`

- [ ] **Step 1: Update use-project.tsx**

Replace `fetch('/api/projects')` with `projectService.getProjects()`:

```typescript
// In refreshProjects callback:
// Before:
//   const res = await fetch('/api/projects')
//   const data = await res.json()
//   setProjects(data.projects || [])
// After:
import { projectService } from '@/lib/services/project-service'

const refreshProjects = useCallback(async () => {
  try {
    const projects = await projectService.getProjects()
    setProjects(projects)
  } catch (err) {
    console.error('Failed to fetch projects:', err)
  }
}, [])
```

- [ ] **Step 2: Update use-agents.ts**

Replace `fetch('/api/agents?projectId=...')` with `agentService.getAll()`:

```typescript
import { agentService } from '@/lib/services/agent-service'

// In fetchAgents function:
// Before:
//   fetchPromise = fetch(`/api/agents?projectId=${projectId}`)
//     .then(r => r.json())
//     .then(data => { ... })
// After:
fetchPromise = agentService.getAll(projectId)
  .then((agents) => {
    cachedAgents = agents
    fetchPromise = null
    return agents
  })
  .catch(() => {
    fetchPromise = null
    return [] as AgentInfo[]
  })
```

- [ ] **Step 3: Update use-issue-polling.ts**

Replace all `fetch('/api/issues...')` calls with `issueService`:

```typescript
import { issueService } from '@/lib/services/issue-service'
import { isBrowserMode } from '@/lib/services/mode'

// fetchFullIssues:
const fetchFullIssues = useCallback(async (): Promise<Issue[]> => {
  if (!projectId) return []
  const issueList = await issueService.getAll(projectId)
  return [...issueList].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}, [projectId])

// poll — in browser mode, compute fingerprint locally:
const poll = useCallback(async () => {
  if (!projectId) return
  try {
    if (isBrowserMode()) {
      const summaries = await issueService.getSummaries(projectId)
      const locks = await issueService.getLocks(projectId)
      setConnected(true)

      const lockMap = new Map<string, IssueLockStatus>()
      for (const lock of locks) lockMap.set(lock.issueId, lock)
      setLocks(lockMap)

      const newFingerprint = issueService.computeFingerprint(summaries)
      if (newFingerprint !== fingerprintRef.current) {
        const prev = fingerprintRef.current
        fingerprintRef.current = newFingerprint
        if (prev !== '') setSyncCount(c => c + 1)
        const sorted = await fetchFullIssues()
        setIssues(sorted)
        setLastSyncAt(new Date())
      }
    } else {
      // Existing server poll logic
      const res = await fetch(`/api/issues/poll?projectId=${projectId}`)
      if (!res.ok) { setConnected(false); return }
      const data: PollResponse = await res.json()
      setConnected(true)

      const lockMap = new Map<string, IssueLockStatus>()
      for (const lock of data.locks) lockMap.set(lock.issueId, lock)
      setLocks(lockMap)

      if (data.fingerprint !== fingerprintRef.current) {
        const prev = fingerprintRef.current
        fingerprintRef.current = data.fingerprint
        if (prev !== '') setSyncCount(c => c + 1)
        const sorted = await fetchFullIssues()
        setIssues(sorted)
        setLastSyncAt(new Date())
      }
    }
  } catch {
    setConnected(false)
  }
}, [projectId, fetchFullIssues])
```

Update `init` and `refresh` similarly — use `issueService` for browser mode, keep `fetch('/api/issues/poll')` for server mode.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-project.tsx src/hooks/use-agents.ts src/hooks/use-issue-polling.ts
git commit -m "refactor: update hooks to use service layer instead of direct fetch"
```

---

## Task 15: Update Page Components

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/issues/page.tsx`
- Modify: `src/app/agents/page.tsx`
- Modify: `src/app/docs/page.tsx`
- Modify: `src/app/planning/features/page.tsx`
- Modify: `src/app/planning/prd/page.tsx`
- Modify: `src/app/planning/roles/page.tsx`
- Modify: `src/app/planning/userflow/page.tsx`
- Modify: `src/components/settings/folder-browser-dialog.tsx`
- Modify: `src/components/settings/project-list.tsx`

This is the largest task. For each file, replace `fetch('/api/...')` calls with the corresponding service call.

- [ ] **Step 1: Update `src/app/page.tsx`**

Replace:
- `fetch('/api/files?projectId=...')` → `fileService.readFile(projectId, path)`
- `fetch('/api/docs?projectId=...')` → `docService.getAll(projectId)`
- `fetch('/api/issues?projectId=...')` → `issueService.getAll(projectId)`
- `fetch('/api/init', { method: 'POST' })` → `initService.init(projectId)`

- [ ] **Step 2: Update `src/app/settings/page.tsx`**

Replace:
- `fetch('/api/settings')` → `settingsService.getSettings()`
- `fetch('/api/settings', { method: 'PUT' })` → `settingsService.updateSettings(updates)`
- `fetch('/api/projects', { method: 'POST' })` → `projectService.addProject(name, path)`
- `fetch('/api/projects', { method: 'DELETE' })` → `projectService.deleteProject(id)`
- `fetch('/api/init', { method: 'POST' })` → `initService.init(projectId)`

- [ ] **Step 3: Update `src/app/issues/page.tsx`**

Replace all issue-related fetch calls with `issueService` methods:
- `fetch('/api/issues/archive?projectId=...')` → `issueService.getArchived(projectId)`
- `fetch('/api/issues/archive', { method: 'POST', ...archive })` → `issueService.archive(projectId, ids)`
- `fetch('/api/issues/archive', { method: 'POST', ...unarchive })` → `issueService.unarchive(projectId, ids)`
- `fetch('/api/issues', { method: 'POST' })` → `issueService.create(projectId, data)`
- `fetch('/api/issues', { method: 'PUT' })` → `issueService.update(projectId, id, updates)`
- `fetch('/api/issues', { method: 'DELETE' })` → `issueService.deleteMany(projectId, ids)`

- [ ] **Step 4: Update `src/app/agents/page.tsx`**

Replace:
- `fetch('/api/agents?projectId=...')` → `agentService.getAll(projectId)`
- `fetch('/api/agents', { method: 'POST/PUT/DELETE' })` → `agentService.create/update/delete(...)`

- [ ] **Step 5: Update `src/app/docs/page.tsx`**

Replace:
- `fetch('/api/docs?projectId=...')` → `docService.getAll(projectId)`
- `fetch('/api/files?projectId=...&path=...')` → `fileService.readFile(projectId, path)`

- [ ] **Step 6: Update planning pages**

For all 4 planning pages, replace:
- `fetch('/api/files?projectId=...&path=data/xxx.json')` → `fileService.readFile(projectId, 'data/xxx.json')`

(Planning data is read-only from these pages — they use the files API.)

- [ ] **Step 7: Update `src/components/settings/folder-browser-dialog.tsx`**

In browser mode, replace the directory tree browser with `showDirectoryPicker()`:

```typescript
import { directoryService } from '@/lib/services/directory-service'
import { isBrowserMode } from '@/lib/services/mode'

// If browser mode: show a "Select Folder" button that calls directoryService.pickDirectory()
// If server mode: keep existing directory tree browsing via directoryService.browse(path)
```

- [ ] **Step 8: Update `src/components/settings/project-list.tsx`**

Replace:
- `fetch('/api/init?projectId=...')` → `initService.checkInit(projectId)`

- [ ] **Step 9: Commit**

```bash
git add src/app/ src/components/
git commit -m "refactor: migrate all page components from direct fetch to service layer"
```

---

## Task 16: Build Verification

- [ ] **Step 1: Run build to check for import errors**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors related to service imports.

- [ ] **Step 2: Test server mode locally**

```bash
NEXT_PUBLIC_STORAGE_MODE=server npm run dev
```

Verify all pages work as before (projects, issues, agents, docs, planning, settings).

- [ ] **Step 3: Test browser mode locally**

```bash
NEXT_PUBLIC_STORAGE_MODE=browser npm run dev
```

Verify:
- Settings page: can add a project via showDirectoryPicker
- Home page: loads project data from selected directory
- Issues: create, edit, archive, delete all work
- Agents: list, create, edit, delete
- Docs: lists markdown files from docs/
- Planning: reads data files

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and runtime issues from browser storage mode migration"
```

---

## Summary

| Task | Description | New Files |
|------|-------------|-----------|
| 1 | Storage mode detection + env files | 3 |
| 2 | Extend BrowserStorageProvider | 0 (modify) |
| 3 | IndexedDB config store | 1 |
| 4 | Project service | 1 |
| 5 | Settings service | 1 |
| 6 | File service | 1 |
| 7 | Planning service | 1 |
| 8 | Browser issue store with locking | 1 |
| 9 | Issue service | 1 |
| 10 | Agent service | 1 |
| 11 | Doc service | 1 |
| 12 | Init service + bundled templates | 2 |
| 13 | Directory service | 1 |
| 14 | Update hooks | 0 (modify 3) |
| 15 | Update page components | 0 (modify 11) |
| 16 | Build verification | 0 |

**Total: 15 new files, 14 modified files**
