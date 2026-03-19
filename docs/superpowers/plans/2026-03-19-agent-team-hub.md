# agent-team-hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an open-source, file-based project management tool for AI agent team collaboration, based on the existing 4fact-vms-plan hub.

**Architecture:** Unified Next.js app with Storage Abstraction Layer. Local mode uses Node.js fs, SaaS mode uses File System Access API. Multi-project management via registered directory paths. Agent workflow enforcement through auto-generated CLAUDE.md sections, rules, skills, and agent definitions.

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Lucide React, Mermaid, React Markdown

**Spec:** `docs/superpowers/specs/2026-03-19-agent-team-hub-design.md`

**Reference Codebase:** `~/workspace/4fact-vms-plan/apps/hub/` (existing hub implementation to port from)

---

## Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx` (minimal)
- Create: `src/app/page.tsx` (placeholder)
- Create: `src/lib/utils.ts`
- Create: `components.json`
- Create: `.gitignore`
- Create: `tailwind.config.ts` (if needed by shadcn setup)

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/zeze-aicon/workspace/ai-hub
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Select defaults when prompted. This creates the base Next.js project with TypeScript and Tailwind CSS.

- [ ] **Step 2: Initialize shadcn/ui**

```bash
cd /Users/zeze-aicon/workspace/ai-hub
npx shadcn@latest init
```

Choose: style `new-york`, base color `zinc`, CSS variables `yes`. This creates `components.json` and sets up the UI foundation.

- [ ] **Step 3: Install additional dependencies**

```bash
cd /Users/zeze-aicon/workspace/ai-hub
npm install lucide-react react-markdown remark-gfm react-syntax-highlighter mermaid react-zoom-pan-pinch clsx tailwind-merge class-variance-authority
npm install -D @types/react-syntax-highlighter
```

- [ ] **Step 4: Install core shadcn/ui components**

```bash
cd /Users/zeze-aicon/workspace/ai-hub
npx shadcn@latest add button card badge tabs scroll-area select separator tooltip popover checkbox dialog input textarea dropdown-menu
```

- [ ] **Step 5: Create `src/lib/utils.ts`**

Port from reference: `~/workspace/4fact-vms-plan/apps/hub/src/lib/utils.ts` (6 lines, cn utility).

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 6: Update `src/app/globals.css`**

Add Pretendard font import and base theme variables. Reference the existing hub's globals.css for theme variables. Ensure dark mode support.

- [ ] **Step 7: Create minimal layout and page**

Create `src/app/layout.tsx` with html lang="ko", Pretendard font link, body with `bg-background` class. Create `src/app/page.tsx` with a simple "agent-team-hub" heading as placeholder.

- [ ] **Step 8: Verify dev server runs**

```bash
cd /Users/zeze-aicon/workspace/ai-hub
npm run dev
```

Expected: Server starts on localhost:3000, placeholder page renders.

- [ ] **Step 9: Initialize git and commit**

```bash
cd /Users/zeze-aicon/workspace/ai-hub
git init
git add .
git commit -m "chore: initialize Next.js project with shadcn/ui"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types/issues.ts`
- Create: `src/types/prd.ts`
- Create: `src/types/features.ts`
- Create: `src/types/agents.ts`
- Create: `src/types/project.ts`
- Create: `src/types/storage.ts`
- Create: `src/types/roles.ts`
- Create: `src/types/userflow.ts`

- [ ] **Step 1: Create `src/types/issues.ts`**

Port from `~/workspace/4fact-vms-plan/apps/hub/src/types/issues.ts` (99 lines). Copy all type definitions: IssueStatus, IssuePriority, IssueType, IssueComment, Issue, RawIssue, IssueLockStatus, IssueSummary. Include normalizeIssue function, constant arrays (ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES), and metadata maps (STATUS_META, PRIORITY_META, TYPE_META).

Update `assignee` field comment to note it's deprecated in favor of `assignees`.

- [ ] **Step 2: Create `src/types/prd.ts`**

Port from `~/workspace/4fact-vms-plan/apps/hub/src/types/prd.ts` (136 lines). Copy all 18 interfaces: PrdVision, PrdCoreValue, PrdUserType, PrdPersona, PrdTarget, PrdUserStory, PrdNfrItem, PrdNonFunctionalRequirements, PrdMvpIncluded, PrdMvpExcluded, PrdMvpScope, PrdRoadmapPhase, PrdKpiItem, PrdKpiCategories, PrdConstraint, PrdOpenItem, PrdProperties, PrdSections, PrdData.

- [ ] **Step 3: Create `src/types/features.ts`**

Port from `~/workspace/4fact-vms-plan/apps/hub/src/types/features.ts` (48 lines). Copy: FeaturePriority, FeatureStatus, RelationType, Requirement, Feature, Relation, FeaturesData.

- [ ] **Step 4: Create `src/types/agents.ts`**

Define agent types for the new generic system:

```typescript
export interface AgentInfo {
  name: string
  description: string
  model: string
  color: string
  emoji: string
  role: string
  content: string  // Full markdown content
  fileName: string // Original file name
}
```

- [ ] **Step 5: Create `src/types/project.ts`**

```typescript
export interface Project {
  id: string
  name: string
  path: string
  createdAt: string // ISO 8601
}

export interface GlobalConfig {
  projects: Project[]
  settings: {
    theme: 'dark' | 'light'
    language: string
    port: number
  }
}

export interface ProjectConfig {
  initialized: boolean
  createdAt: string
}
```

- [ ] **Step 6: Create `src/types/storage.ts`**

```typescript
export interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
}

export interface StorageProvider {
  readFile(projectPath: string, relativePath: string): Promise<string>
  writeFile(projectPath: string, relativePath: string, content: string): Promise<void>
  deleteFile(projectPath: string, relativePath: string): Promise<void>
  listDirectory(projectPath: string, relativePath: string): Promise<FileEntry[]>
  exists(projectPath: string, relativePath: string): Promise<boolean>
}
```

- [ ] **Step 7: Create `src/types/roles.ts` and `src/types/userflow.ts`**

Check if the reference hub has dedicated types for roles and userflow. If yes, port them. If no (they're just raw JSON), create minimal type interfaces based on the `data/roles.json` and `data/userflow.json` schemas from the reference project.

- [ ] **Step 8: Commit**

```bash
git add src/types/
git commit -m "feat: add type definitions for issues, prd, features, agents, projects, storage"
```

---

## Task 3: Storage Abstraction Layer

**Files:**
- Create: `src/lib/storage/interface.ts`
- Create: `src/lib/storage/local.ts`
- Create: `src/lib/storage/browser.ts`
- Create: `src/lib/storage/index.ts`

- [ ] **Step 1: Create `src/lib/storage/interface.ts`**

Export the StorageProvider interface (re-export from types/storage.ts) and FileEntry type.

- [ ] **Step 2: Create `src/lib/storage/local.ts` - LocalStorageProvider**

Implement StorageProvider using Node.js `fs/promises`:

```typescript
import fs from 'fs/promises'
import path from 'path'
import type { StorageProvider, FileEntry } from '@/types/storage'

export class LocalStorageProvider implements StorageProvider {
  private validatePath(projectPath: string, relativePath: string): string {
    const resolved = path.resolve(projectPath, relativePath)
    if (!resolved.startsWith(path.resolve(projectPath))) {
      throw new Error('Path traversal detected')
    }
    return resolved
  }

  async readFile(projectPath: string, relativePath: string): Promise<string> {
    const fullPath = this.validatePath(projectPath, relativePath)
    return fs.readFile(fullPath, 'utf-8')
  }

  async writeFile(projectPath: string, relativePath: string, content: string): Promise<void> {
    const fullPath = this.validatePath(projectPath, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  async deleteFile(projectPath: string, relativePath: string): Promise<void> {
    const fullPath = this.validatePath(projectPath, relativePath)
    await fs.unlink(fullPath)
  }

  async listDirectory(projectPath: string, relativePath: string): Promise<FileEntry[]> {
    const fullPath = this.validatePath(projectPath, relativePath)
    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    return entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(relativePath, e.name)
    }))
  }

  async exists(projectPath: string, relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.validatePath(projectPath, relativePath)
      await fs.access(fullPath)
      return true
    } catch { return false }
  }
}
```

- [ ] **Step 3: Create `src/lib/storage/browser.ts` - BrowserStorageProvider**

Implement StorageProvider using File System Access API for SaaS mode:

```typescript
import type { StorageProvider, FileEntry } from '@/types/storage'

export class BrowserStorageProvider implements StorageProvider {
  private handles: Map<string, FileSystemDirectoryHandle> = new Map()

  async requestAccess(projectPath: string): Promise<void> {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    this.handles.set(projectPath, handle)
    // Cache in IndexedDB for re-access
  }

  // ... implement all StorageProvider methods using FileSystemDirectoryHandle
  // Navigate subdirectories via getDirectoryHandle()
  // Read files via getFileHandle() -> getFile() -> text()
  // Write files via getFileHandle({create:true}) -> createWritable()
}
```

Note: Full implementation should handle nested directory navigation, file creation with {create:true}, and error handling for permission issues.

- [ ] **Step 4: Create `src/lib/storage/index.ts`**

```typescript
export { LocalStorageProvider } from './local'
export { BrowserStorageProvider } from './browser'
export type { StorageProvider, FileEntry } from '@/types/storage'
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/
git commit -m "feat: add Storage Abstraction Layer (local + browser providers)"
```

---

## Task 4: Global Config & Project Management

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/project-manager.ts`

- [ ] **Step 1: Create `src/lib/config.ts`**

Manage global config at `~/.agent-team-hub/config.json`:

```typescript
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import type { GlobalConfig, Project } from '@/types/project'

const CONFIG_DIR = path.join(os.homedir(), '.agent-team-hub')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: GlobalConfig = {
  projects: [],
  settings: { theme: 'dark', language: 'ko', port: 3000 }
}

export async function readGlobalConfig(): Promise<GlobalConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return DEFAULT_CONFIG
  }
}

export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export async function addProject(project: Project): Promise<void> { ... }
export async function removeProject(projectId: string): Promise<void> { ... }
export async function getProject(projectId: string): Promise<Project | null> { ... }
```

- [ ] **Step 2: Create `src/lib/project-manager.ts`**

Project-level operations using StorageProvider:

```typescript
import { LocalStorageProvider } from './storage/local'
import type { ProjectConfig } from '@/types/project'

const storage = new LocalStorageProvider()

export async function getProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
  try {
    const content = await storage.readFile(projectPath, '.hub/config.json')
    return JSON.parse(content)
  } catch { return null }
}

export async function isProjectInitialized(projectPath: string): Promise<boolean> {
  return storage.exists(projectPath, '.hub/config.json')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/config.ts src/lib/project-manager.ts
git commit -m "feat: add global config and project management"
```

---

## Task 5: Issue Store (Port from Reference)

**Files:**
- Create: `src/lib/issue-store.ts`
- Create: `src/lib/parsers.ts`

- [ ] **Step 1: Create `src/lib/parsers.ts`**

Port from `~/workspace/4fact-vms-plan/apps/hub/src/lib/parsers.ts` (18 lines). Copy `safeParseJson<T>()`. Remove `parseTrackerCsv()` (not needed in generic version).

Add frontmatter parser (port from reference's docs API route):

```typescript
export function parseFrontmatter(content: string): { metadata: Record<string, any>, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { metadata: {}, body: content }
  // Parse YAML-like frontmatter into key-value pairs
  // Handle arrays (lines starting with "- ")
  // Return { metadata, body }
}
```

- [ ] **Step 2: Create `src/lib/issue-store.ts`**

Port from `~/workspace/4fact-vms-plan/apps/hub/src/lib/issue-store.ts` (544 lines).

**Key changes from reference:**
1. Replace `getProjectRoot()` calls with a `projectPath` parameter on all exported functions
2. Use `LocalStorageProvider` internally instead of raw `fs` calls
3. Keep all lock logic (acquireLock, releaseLock, withLock)
4. Keep all CRUD functions (readIssue, readAllIssues, createIssue, updateIssue, deleteIssue)
5. Keep archive functions (archiveIssue, unarchiveIssue, readArchivedIssues)
6. Keep polling helpers (readIssueSummaries, readAllLockStatuses)
7. Remove migrateFromLegacy() (not needed for new tool)

All exported functions should take `projectPath: string` as first parameter:
```typescript
export async function readAllIssues(projectPath: string): Promise<Issue[]> { ... }
export async function createIssue(projectPath: string, data: Partial<Issue>): Promise<Issue> { ... }
// etc.
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/issue-store.ts src/lib/parsers.ts
git commit -m "feat: port issue store with lock mechanism and parsers"
```

---

## Task 6: API Routes - Projects & Init

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/init/route.ts`
- Create: `src/lib/project-init.ts`
- Create: `src/templates/claude-md-section.md`
- Create: `src/templates/hub-workflow.md`
- Create: `src/templates/hub-skill.md`
- Create: `src/templates/agent-template.md`

- [ ] **Step 1: Create template files**

Create `src/templates/claude-md-section.md`:
```markdown
<!-- agent-team-hub:start -->
## 이슈 관리 시스템
이슈 관리 시스템은 에이전트의 주요 태스크 관리 도구입니다.
- 모든 업무는 이슈로 추적: 기존 이슈 할당 작업은 물론, 사람의 채팅 지시나 자발적 업무도 이슈를 먼저 생성한 뒤 진행
- 이슈 기반 작업 시 상태 전환 필수 (open → in-progress → resolved)
- `.claude/rules/hub-workflow.md` 규칙을 반드시 준수할 것
<!-- agent-team-hub:end -->
```

Create `src/templates/hub-workflow.md` — port and generalize from `~/workspace/4fact-vms-plan/.claude/rules/issue-workflow.md`. Remove project-specific references, keep core workflow rules: session start, issue-based work principle, status transitions, comment format, subagent rules, issue creation procedure.

Create `src/templates/hub-skill.md` — Claude Code skill that teaches agents how to CRUD issues, docs, and planning data via file operations. Include JSON schemas, directory structures, and step-by-step procedures.

Create `src/templates/agent-template.md` — Template for new agent definitions with Hub workflow binding sections auto-inserted.

- [ ] **Step 2: Create `src/lib/project-init.ts`**

```typescript
import { LocalStorageProvider } from './storage/local'
import type { ProjectConfig } from '@/types/project'

const storage = new LocalStorageProvider()

export async function initializeProject(projectPath: string): Promise<void> {
  // 1. Create .hub/config.json
  // 2. Create directories: docs/, issues/, data/, issues/archive/
  // 3. Create issues/_index.json with { version: "1.0", nextId: 1 }
  // 4. Create or update CLAUDE.md (insert section between markers)
  // 5. Create .claude/rules/hub-workflow.md from template
  // 6. Create .claude/skills/hub.md from template
  // 7. Create empty data files: data/prd.json, data/features.json, etc.
}

export async function insertClaudeMdSection(projectPath: string): Promise<void> {
  // Read existing CLAUDE.md (if any)
  // If markers exist, replace content between them
  // If no markers, append section at end
  // If no file, create with section
}
```

- [ ] **Step 3: Create `src/app/api/projects/route.ts`**

```typescript
// GET: List all projects from global config
// POST: Register new project { name, path } → add to global config
// PUT: Update project { id, name?, path? }
// DELETE: Remove project { id } from global config (does NOT delete files)
```

- [ ] **Step 4: Create `src/app/api/init/route.ts`**

```typescript
// POST: Initialize project { projectPath } → run initializeProject()
// Returns: { success: true, initialized: [...created files] }
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/projects/ src/app/api/init/ src/lib/project-init.ts src/templates/
git commit -m "feat: add project management API and initialization system"
```

---

## Task 7: API Routes - Issues, Docs, Files, Agents, Planning

**Files:**
- Create: `src/app/api/issues/route.ts`
- Create: `src/app/api/issues/poll/route.ts`
- Create: `src/app/api/issues/locks/route.ts`
- Create: `src/app/api/issues/archive/route.ts`
- Create: `src/app/api/docs/route.ts`
- Create: `src/app/api/files/route.ts`
- Create: `src/app/api/agents/route.ts`
- Create: `src/app/api/planning/route.ts`

- [ ] **Step 1: Create issues API routes**

Port from reference hub's API routes. Key change: all routes must read `projectId` from query param `?projectId=xxx`, resolve to project path via global config, then pass `projectPath` to issue-store functions.

`src/app/api/issues/route.ts`:
- GET `?projectId=xxx` → readAllIssues(projectPath)
- GET `?projectId=xxx&id=ISS-001` → readIssue(projectPath, id)
- POST `{ projectId, ...issueData }` → createIssue(projectPath, data)
- PUT `{ projectId, id, ...updates }` → updateIssue(projectPath, id, updates)
- DELETE `{ projectId, ids }` → batch deleteIssue(projectPath, id)

`src/app/api/issues/poll/route.ts`:
- GET `?projectId=xxx` → readIssueSummaries(projectPath) + readAllLockStatuses(projectPath) + fingerprint

`src/app/api/issues/locks/route.ts`:
- GET `?projectId=xxx` → readAllLockStatuses(projectPath)

`src/app/api/issues/archive/route.ts`:
- Port from reference. Add projectId parameter.

- [ ] **Step 2: Create docs API route**

Port from reference's `api/docs/route.ts`. Key change: use `projectPath` from projectId lookup instead of `getProjectRoot()`. Keep frontmatter parsing, token estimation, category grouping.

- [ ] **Step 3: Create files API route**

Port from reference's `api/files/route.ts`. Add `projectId` parameter. Use LocalStorageProvider for path validation and file reading.

- [ ] **Step 4: Create agents API route**

Port from reference's `api/agents/route.ts`. Key changes:
- Read from `{projectPath}/.claude/agents/*.md` instead of hardcoded path
- Add POST for creating new agents (write .md file with frontmatter + workflow binding)
- Add PUT for updating agent definitions
- Add DELETE for removing agents

- [ ] **Step 5: Create planning API route**

```typescript
// GET ?projectId=xxx&type=prd|features|roles|userflow
//   → Read data/{type}.json from project directory
// PUT { projectId, type, data }
//   → Write data/{type}.json to project directory
```

- [ ] **Step 6: Create `src/app/api/settings/route.ts`**

```typescript
// GET: Read settings from global config
// PUT { theme?, language?, port? }: Update settings in global config
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/
git commit -m "feat: add API routes for issues, docs, files, agents, planning, and settings"
```

---

## Task 8: Hooks

**Files:**
- Create: `src/hooks/use-issue-polling.ts`
- Create: `src/hooks/use-project.ts`
- Create: `src/hooks/use-agents.ts`
- Create: `src/hooks/use-storage.ts`

- [ ] **Step 1: Create `src/hooks/use-project.ts`**

```typescript
'use client'
import { createContext, useContext } from 'react'
import type { Project } from '@/types/project'

interface ProjectContextValue {
  currentProject: Project | null
  projects: Project[]
  setCurrentProject: (project: Project) => void
  loading: boolean
}

export const ProjectContext = createContext<ProjectContextValue>(...)
export function useProject() { return useContext(ProjectContext) }
```

- [ ] **Step 2: Create `src/hooks/use-issue-polling.ts`**

Port from `~/workspace/4fact-vms-plan/apps/hub/src/hooks/use-issue-polling.ts` (198 lines).

Key change: add `projectId` to all fetch URLs as query parameter. Remove legacy migration logic.

```typescript
// All fetches change from:
//   fetch('/api/issues/poll')
// to:
//   fetch(`/api/issues/poll?projectId=${projectId}`)
```

- [ ] **Step 3: Create `src/hooks/use-agents.ts`**

Port from reference (56 lines). Add projectId to fetch URL.

- [ ] **Step 4: Create `src/hooks/use-storage.ts`**

Hook to detect environment and select appropriate StorageProvider:

```typescript
'use client'
export function useStorage() {
  // Detect if running in SaaS mode (no server-side API available)
  // Return { isSaasMode: boolean, requestAccess: () => Promise<void> }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add hooks for project context, issue polling, agents, and storage"
```

---

## Task 9: Layout Components (LNB + ProjectSelector)

**Files:**
- Create: `src/components/layout/lnb.tsx`
- Create: `src/components/layout/topbar.tsx`
- Create: `src/components/layout/project-selector.tsx`
- Create: `src/components/layout/project-provider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/layout/project-provider.tsx`**

Client component that wraps the app with ProjectContext. Fetches projects from `/api/projects` on mount. Stores current project in localStorage. Provides setCurrentProject.

- [ ] **Step 2: Create `src/components/layout/project-selector.tsx`**

Client component dropdown in sidebar. Uses shadcn/ui DropdownMenu. Shows current project name. Lists all projects. "Add Project" option at bottom.

- [ ] **Step 3: Create `src/components/layout/lnb.tsx`**

Port from reference's `components/layout/LNB.tsx` (86 lines). Key changes:
- Replace "AI Hub" branding with "agent-team-hub"
- Add ProjectSelector component at top
- Update menu structure to match spec:
  - Overview: Dashboard
  - 기획 Planning: PRD, Features, Roles, User Flow
  - 문서 Docs: Documents
  - 이슈 Issues: Issue Board
  - 관리 Manage: Agents, Settings
- Update route paths to match new routing structure
- Use shadcn/ui components and Lucide icons

- [ ] **Step 4: Create `src/components/layout/topbar.tsx`**

Port from reference (24 lines). No changes needed beyond import path updates.

- [ ] **Step 5: Update `src/app/layout.tsx`**

Wrap with ProjectProvider. Add LNB sidebar. Set up the flex layout (sidebar + main content area).

```tsx
<ProjectProvider>
  <body className="flex h-screen overflow-hidden bg-background">
    <LNB />
    <main className="flex-1 flex flex-col overflow-hidden">
      {children}
    </main>
  </body>
</ProjectProvider>
```

- [ ] **Step 6: Verify layout renders**

```bash
npm run dev
```

Expected: Sidebar with project selector, menu items, main content area with placeholder.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add layout with LNB sidebar, project selector, and topbar"
```

---

## Task 10: Dashboard Page

**Files:**
- Create: `src/app/page.tsx` (replace placeholder)

- [ ] **Step 1: Create dashboard page**

Port from reference's `app/page.tsx`. Key changes:
- Use `useProject()` to get current project
- Add `projectId` to all API fetch URLs
- Add "no project selected" empty state
- Add "project not initialized" state with init button
- Keep stats cards: Planning data, Docs, Active Issues, Agents
- Keep recent issues list and agent team section
- Use shadcn/ui Card, Badge components

- [ ] **Step 2: Verify dashboard renders with mock data**

```bash
npm run dev
```

Expected: Dashboard shows empty/zero states when no project is selected or initialized.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add dashboard page with project stats and quick views"
```

---

## Task 11: Issues Page & Components

**Files:**
- Create: `src/app/issues/page.tsx`
- Create: `src/components/issues/issue-list.tsx`
- Create: `src/components/issues/issue-detail.tsx`
- Create: `src/components/issues/issue-filters.tsx`
- Create: `src/components/issues/issue-badges.tsx`
- Create: `src/components/issues/issue-create-dialog.tsx`
- Create: `src/components/issues/assignee-multi-select.tsx`
- Create: `src/components/issues/polling-indicator.tsx`

- [ ] **Step 1: Port issue badge components**

Port from reference's `components/issues/issue-badges.tsx` (105 lines). These are pure display components with no changes needed beyond import paths.

- [ ] **Step 2: Port issue list component**

Port from reference's `components/issues/issue-list.tsx` (124 lines). No functional changes needed.

- [ ] **Step 3: Port issue detail component**

Port from reference's `components/issues/issue-detail.tsx` (597 lines). No functional changes needed beyond import paths.

- [ ] **Step 4: Port issue filters component**

Port from reference's `components/issues/issue-filters.tsx` (133 lines). No changes needed.

- [ ] **Step 5: Port issue create dialog and assignee multi-select**

Port from reference. Read their current content and copy with import path adjustments.

- [ ] **Step 6: Port polling indicator**

Port from reference. No changes needed.

- [ ] **Step 7: Create issues page**

Port from reference's issues page. Key changes:
- Use `useProject()` to get current projectId
- Pass projectId to `useIssuePolling()` hook
- Add "no project" empty state
- All API calls include `projectId` query param

Layout: dual-pane with list (left 420px) + detail panel (right flex). Include filtering, archive mode toggle, multi-select with bulk operations.

- [ ] **Step 8: Verify issues page**

```bash
npm run dev
```

Navigate to /issues. Expected: Issue board renders with empty state or fetched issues.

- [ ] **Step 9: Commit**

```bash
git add src/app/issues/ src/components/issues/
git commit -m "feat: add issues page with list, detail, filters, and real-time polling"
```

---

## Task 12: Documents Page & Components

**Files:**
- Create: `src/app/docs/page.tsx`
- Create: `src/components/docs/doc-list.tsx`
- Create: `src/components/docs/doc-viewer.tsx`
- Create: `src/components/ui/markdown-viewer.tsx`

- [ ] **Step 1: Create markdown viewer component**

Port from reference's `components/ui/MarkdownViewer.tsx`. Uses react-markdown + remark-gfm + react-syntax-highlighter. No changes needed.

- [ ] **Step 2: Create doc list component**

Port or create a document listing component. Shows docs grouped by category (plans, develop, research) with frontmatter metadata (title, emoji, author, token count).

- [ ] **Step 3: Create doc viewer component**

Renders a markdown document with frontmatter displayed as metadata header. Uses MarkdownViewer for content rendering.

- [ ] **Step 4: Create docs page**

Dual-pane layout: document list (left) + viewer (right). Fetch docs from `/api/docs?projectId=xxx`. Category tabs for filtering. Click doc to view content.

- [ ] **Step 5: Commit**

```bash
git add src/app/docs/ src/components/docs/ src/components/ui/markdown-viewer.tsx
git commit -m "feat: add documents page with markdown viewer"
```

---

## Task 13: Planning Pages (PRD, Features, Roles, UserFlow)

**Files:**
- Create: `src/app/planning/prd/page.tsx`
- Create: `src/app/planning/features/page.tsx`
- Create: `src/app/planning/roles/page.tsx`
- Create: `src/app/planning/userflow/page.tsx`
- Create: `src/components/planning/prd-section.tsx`
- Create: `src/components/planning/prd-sidebar.tsx`
- Create: `src/components/planning/feature-tree-view.tsx`
- Create: `src/components/planning/feature-directory-view.tsx`
- Create: `src/components/planning/feature-detail-panel.tsx`
- Create: `src/components/planning/requirement-detail-panel.tsx`
- Create: `src/components/ui/mermaid-diagram.tsx`
- Create: `src/components/ui/status-badge.tsx`
- Create: `src/components/ui/flow-diagram.tsx`

- [ ] **Step 1: Port shared UI components**

Port from reference:
- `components/ui/StatusBadge.tsx` → `src/components/ui/status-badge.tsx`
- `components/ui/mermaid-diagram.tsx` → `src/components/ui/mermaid-diagram.tsx`
- `components/ui/userflow/FlowDiagram.tsx` → `src/components/ui/flow-diagram.tsx`

- [ ] **Step 2: Port PRD components and page**

Port from reference:
- `components/prd/PrdSection.tsx` (34 lines) → `src/components/planning/prd-section.tsx`
- `components/prd/PrdSidebar.tsx` (79 lines) → `src/components/planning/prd-sidebar.tsx`
- PRD page: fetch `data/prd.json` via `/api/planning?projectId=xxx&type=prd`, render with sidebar navigation and section components.

- [ ] **Step 3: Port Features components and page**

Port from reference:
- `components/features/feature-tree-view.tsx` (668 lines)
- `components/features/feature-directory-view.tsx` (337 lines)
- `components/features/feature-detail-panel.tsx` (232 lines)
- `components/features/requirement-detail-panel.tsx` (185 lines)
- Features page: fetch `data/features.json`, render with tree/directory toggle view.

No changes needed beyond import path updates and adding projectId to API calls.

- [ ] **Step 4: Create Roles page**

Fetch `data/roles.json` via `/api/planning?projectId=xxx&type=roles`. Render role/permission matrix. Reference the existing hub's roles page for layout.

- [ ] **Step 5: Create UserFlow page**

Fetch `data/userflow.json` via `/api/planning?projectId=xxx&type=userflow`. Render flow diagrams. Use FlowDiagram and MermaidDiagram components.

- [ ] **Step 6: Add "data not found" empty states**

All planning pages should show a helpful empty state when the corresponding data file doesn't exist yet, with guidance on how to create it.

- [ ] **Step 7: Commit**

```bash
git add src/app/planning/ src/components/planning/ src/components/ui/status-badge.tsx src/components/ui/mermaid-diagram.tsx src/components/ui/flow-diagram.tsx
git commit -m "feat: add planning pages (PRD, Features, Roles, UserFlow)"
```

---

## Task 14: Agents Page (Full CRUD)

**Files:**
- Create: `src/app/agents/page.tsx`
- Create: `src/components/agents/agent-list.tsx`
- Create: `src/components/agents/agent-card.tsx`
- Create: `src/components/agents/agent-form.tsx`

- [ ] **Step 1: Create agent card component**

Display card with agent emoji, name, description, model, role. Show assigned issue count. Color-coded border using agent's color property.

- [ ] **Step 2: Create agent form component**

Dialog/sheet form for creating/editing agents. Fields:
- name (text)
- description (textarea)
- model (select: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5)
- color (color picker or preset palette)
- emoji (text input)
- role (text)
- responsibilities (textarea, markdown)

On save: constructs .md file with frontmatter + responsibilities content + auto-injected workflow binding section. Calls POST/PUT `/api/agents?projectId=xxx`.

- [ ] **Step 3: Create agent list component**

Grid of agent cards. "Add Agent" button at top. Click card to open edit form.

- [ ] **Step 4: Create agents page**

Fetch agents from `/api/agents?projectId=xxx`. Show agent grid. Handle create/edit/delete. When creating, auto-inject:

```markdown
## 세션 시작 시
1. `.claude/rules/hub-workflow.md` 읽기
2. `issues/`에서 assignee: "{agent-name}"인 활성 이슈 확인

## 이슈 관리
`.claude/rules/hub-workflow.md` 규칙을 따릅니다.
```

- [ ] **Step 5: Commit**

```bash
git add src/app/agents/ src/components/agents/
git commit -m "feat: add agents page with full CRUD and workflow binding"
```

---

## Task 15: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/settings/project-list.tsx`
- Create: `src/components/settings/add-project-dialog.tsx`

- [ ] **Step 1: Create add-project dialog**

Dialog with fields:
- Project name (text)
- Project path (text input for directory path)
- "Initialize" checkbox (default: true) — runs project init after registration

On submit: POST to `/api/projects`, then optionally POST to `/api/init`.

- [ ] **Step 2: Create project list component**

Table/list of registered projects. Shows name, path, initialized status. Actions: Open (switch to project), Initialize, Remove.

- [ ] **Step 3: Create settings page**

Two sections:
1. **Projects** — project list with add/remove/initialize
2. **Settings** — theme toggle, language, port configuration

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/ src/components/settings/
git commit -m "feat: add settings page with project management"
```

---

## Task 16: End-to-End Integration & Cleanup

**Files:**
- Modify: various files for integration
- Create: `.gitignore` updates

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

```bash
echo ".superpowers/" >> /Users/zeze-aicon/workspace/ai-hub/.gitignore
```

- [ ] **Step 2: Test end-to-end local mode flow**

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Go to Settings → Add Project (point to a test directory)
4. Initialize the project
5. Verify files created: CLAUDE.md section, .hub/, .claude/rules/, .claude/skills/, issues/, docs/, data/
6. Switch to project in sidebar
7. Dashboard shows project stats
8. Create an issue via Issues page
9. Verify ISS-001.json created in test directory
10. Create an agent via Agents page
11. Verify .claude/agents/agent-name.md created with workflow binding

- [ ] **Step 3: Test file-based sync**

1. While Hub is running, manually edit an issue JSON file in the test directory
2. Verify Hub UI updates within 3 seconds (polling)
3. Create a doc .md file with frontmatter in docs/ directory
4. Verify it appears in Docs page

- [ ] **Step 4: Update package.json metadata**

Add project metadata for npm:
```json
{
  "name": "agent-team-hub",
  "version": "0.1.0",
  "description": "File-based project management tool for AI agent team collaboration",
  "license": "MIT",
  "bin": { "agent-team-hub": "./scripts/start.js" }
}
```

- [ ] **Step 5: Create `scripts/start.js`**

Simple CLI entry point for `npx agent-team-hub`:

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process')
execSync('npx next dev', { stdio: 'inherit', cwd: __dirname + '/..' })
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete agent-team-hub v0.1.0 with end-to-end integration"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | package.json, next.config.ts, shadcn setup |
| 2 | Type definitions | src/types/*.ts (8 files) |
| 3 | Storage Abstraction Layer | src/lib/storage/*.ts (4 files) |
| 4 | Global config & project mgmt | src/lib/config.ts, project-manager.ts |
| 5 | Issue store (port) | src/lib/issue-store.ts, parsers.ts |
| 6 | API: Projects & Init | src/app/api/projects/, init/, templates/ |
| 7 | API: Issues, Docs, Files, etc | src/app/api/*.ts (8 routes) |
| 8 | Hooks | src/hooks/*.ts (4 hooks) |
| 9 | Layout (LNB + ProjectSelector) | src/components/layout/*.tsx |
| 10 | Dashboard page | src/app/page.tsx |
| 11 | Issues page + components | src/app/issues/, components/issues/ |
| 12 | Documents page | src/app/docs/, components/docs/ |
| 13 | Planning pages | src/app/planning/, components/planning/ |
| 14 | Agents page (CRUD) | src/app/agents/, components/agents/ |
| 15 | Settings page | src/app/settings/, components/settings/ |
| 16 | Integration & cleanup | E2E testing, npm packaging |
