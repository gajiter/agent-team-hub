# agent-team-hub Design Spec

## Context

AI 코딩 에이전트(Claude Code, Cursor 등)를 사용하는 개발자와 AI 에이전트 팀 운영자를 위한 **파일 기반 프로젝트 관리 협업 도구**. Jira와 유사한 역할을 하되, 모든 데이터를 실제 프로젝트 디렉토리의 파일(JSON, Markdown)로 관리한다. 기존 ~/workspace/4fact-vms-plan/apps/hub 구현체를 기반으로 범용 오픈소스 도구로 재설계한다.

### 핵심 목표
- 사람-AI, AI-AI 간 소통과 프로젝트 문서 관리를 하나의 도구에서 수행
- 로컬 기반으로 구동하되, SaaS 배포도 가능한 아키텍처
- Claude Code 에이전트가 파일 기반으로 Hub 데이터를 직접 조작 가능
- 프로젝트 초기화 시 에이전트 워크플로우 규칙/스킬을 자동 생성하여 모든 에이전트가 워크플로우를 준수하도록 강제

---

## 1. Architecture

### Unified Next.js + Storage Abstraction Layer

하나의 Next.js 풀스택 앱으로 UI + API + Storage를 모두 처리한다.

```
┌─────────────────────────────────────────────────────┐
│              agent-team-hub (Next.js)                │
│                                                      │
│  UI Layer                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Planning │ │   Docs   │ │  Issues  │            │
│  │ PRD/Feat │ │ Markdown │ │ Tracking │            │
│  │ Role/Flow│ │ Browser  │ │  Board   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Agents  │ │Dashboard │ │ Settings │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  API Layer (Route Handlers)                          │
│  /api/projects /api/issues /api/docs /api/files     │
│  /api/agents /api/planning /api/init /api/settings  │
│                                                      │
│  Storage Abstraction Layer                           │
│  ┌──────────────────┐ ┌──────────────────────┐      │
│  │ LocalStorage     │ │ BrowserStorage       │      │
│  │ (Node.js fs)     │ │ (FS Access API)      │      │
│  │ ← Local Mode     │ │ ← SaaS Mode         │      │
│  └──────────────────┘ └──────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### 동작 모드

**로컬 모드**: `next dev` 또는 `npx agent-team-hub` → API Route에서 LocalStorageProvider (Node.js fs) 사용 → 프로젝트 디렉토리 직접 접근

**SaaS 모드**: Vercel 등에 정적 배포 → 클라이언트에서 BrowserStorageProvider 사용 → Chrome File System Access API로 사용자 PC 파일 접근. 제약사항: Chrome/Edge만 지원, 페이지 새로고침 시 권한 재요청 필요(IndexedDB 핸들 캐시로 완화).

### Multi-Project 관리

- 중앙 Hub 인스턴스 하나가 여러 프로젝트를 관리
- 글로벌 설정: `~/.agent-team-hub/config.json` (프로젝트 목록, 앱 설정)
- 프로젝트별 설정: 각 프로젝트 루트의 `.hub/config.json`

---

## 2. Data Model

### 프로젝트 디렉토리 구조

프로젝트 초기화 시 아래 구조가 생성/사용된다:

```
my-project/
├── CLAUDE.md                    # Hub 섹션 자동 삽입
├── .hub/
│   └── config.json              # 프로젝트 설정
├── .claude/
│   ├── rules/
│   │   └── hub-workflow.md      # 이슈 워크플로우 규칙 (자동 생성)
│   ├── skills/
│   │   └── hub.md               # Hub 데이터 CRUD 스킬 (자동 생성)
│   └── agents/                  # 에이전트 정의 (UI에서 관리)
│       ├── planner.md
│       └── backend.md
├── docs/                        # 마크다운 문서
│   ├── plans/
│   ├── develop/
│   └── research/
├── issues/                      # 이슈 트래킹 (JSON)
│   ├── _index.json              # {nextId, metadata}
│   ├── ISS-001.json
│   └── archive/
└── data/                        # 기획 데이터 (JSON)
    ├── prd.json
    ├── features.json
    ├── roles.json
    └── userflow.json
```

### 글로벌 설정 (~/.agent-team-hub/config.json)

```json
{
  "projects": [
    {
      "id": "proj-uuid",
      "name": "My Project",
      "path": "/Users/me/my-project",
      "createdAt": "2026-03-19"
    }
  ],
  "settings": {
    "theme": "dark",
    "language": "ko",
    "port": 3000
  }
}
```

### Issue Schema (issues/ISS-NNN.json)

```json
{
  "id": "ISS-001",
  "title": "string",
  "description": "string",
  "status": "open | in-progress | resolved | closed",
  "priority": "critical | high | medium | low",
  "type": "task | bug | feature | question | decision",
  "assignee": "string (deprecated, 하위 호환용)",
  "assignees": ["string (primary, 다중 할당 지원)"],
  "reporter": "string",
  "labels": ["string"],
  "relatedFiles": ["path"],
  "relatedIds": ["F-001"],
  "comments": [
    {
      "id": "c-{timestamp}",
      "author": "string",
      "content": "string",
      "createdAt": "ISO 8601"
    }
  ],
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

### Document Frontmatter Schema

```yaml
---
title: "Document Title"
description: "Brief description"
author: "agent-name or human"
emoji: "📝"
type: "plan | develop | research"
references: ["docs/...", "data/..."]
createdAt: "2026-03-19"
---
```

### Agent Definition Schema (.claude/agents/*.md)

```yaml
---
name: "Backend Developer"
description: "API design and implementation"
model: "claude-sonnet-4-6"
color: "#3b82f6"
emoji: "⚙️"
role: "developer"
---

## Responsibilities
...

## 세션 시작 시
1. `.claude/rules/hub-workflow.md` 읽기
2. `issues/`에서 assignee: "{agent-name}"인 활성 이슈 확인

## 이슈 관리
`.claude/rules/hub-workflow.md` 규칙을 따릅니다.
```

---

## 3. UI Layout & Navigation

### 사이드바 메뉴 구조

| 섹션 | 메뉴 항목 | 설명 |
|------|-----------|------|
| Overview | Dashboard | 프로젝트 개요, 통계, 최근 이슈, 에이전트 팀 |
| 기획 (Planning) | PRD | PRD JSON 시각화 (11개 섹션) |
| | Features | 기능 트리/디렉토리 뷰 |
| | Roles | 역할/권한 매트릭스 |
| | User Flow | 유저 플로우 다이어그램 |
| 문서 (Docs) | Documents | frontmatter 기반 문서 목록/뷰어 |
| 이슈 (Issues) | Issue Board | 이슈 CRUD, 필터링, 아카이브, 실시간 폴링 |
| 관리 (Manage) | Agents | 에이전트 CRUD, 상태 표시 |
| | Settings | 프로젝트 관리, 앱 설정 |

### 프로젝트 셀렉터

사이드바 상단에 드롭다운으로 등록된 프로젝트 전환 가능.

### Tech Stack (UI)
- Next.js 15+ (App Router)
- Tailwind CSS
- shadcn/ui (Radix UI 기반)
- Lucide React (아이콘)
- Mermaid (다이어그램)
- React Markdown + Syntax Highlighter

---

## 4. Storage Abstraction Layer

### Interface

```typescript
interface StorageProvider {
  readFile(projectId: string, path: string): Promise<string>
  writeFile(projectId: string, path: string, content: string): Promise<void>
  deleteFile(projectId: string, path: string): Promise<void>
  listDirectory(projectId: string, path: string): Promise<FileEntry[]>
  exists(projectId: string, path: string): Promise<boolean>
  watchChanges?(projectId: string, callback: () => void): void
}
```

### LocalStorageProvider (로컬 모드)
- Node.js `fs/promises` 기반
- projectId → 글로벌 config의 프로젝트 경로로 매핑
- Next.js API Route (서버 사이드)에서 실행
- 경로 검증으로 path traversal 방지

### BrowserStorageProvider (SaaS 모드)
- File System Access API 기반
- projectId → DirectoryHandle 매핑
- 클라이언트 사이드에서 실행
- IndexedDB에 DirectoryHandle 캐시 (재방문 시 빠른 복구)
- Chrome/Edge 전용. Firefox/Safari 등 미지원 브라우저에서는 SaaS 모드 전체 이용 불가 — "Chrome 또는 Edge에서 접속해주세요" 안내 후 차단. 로컬 모드 설치를 권장하는 가이드 표시

---

## 5. Agent Workflow Enforcement

### 4계층 계약적 강제 메커니즘

프로젝트 초기화 시 Hub가 아래 파일들을 자동 생성하여 모든 에이전트가 워크플로우를 준수하도록 강제:

**Layer 1: CLAUDE.md (헌법)**
```markdown
<!-- agent-team-hub:start -->
## 이슈 관리 시스템
이슈 관리 시스템은 에이전트의 주요 태스크 관리 도구입니다.
- 모든 업무는 이슈로 추적
- 이슈 기반 작업 시 상태 전환 필수 (open → in-progress → resolved)
- `.claude/rules/hub-workflow.md` 규칙을 반드시 준수할 것
<!-- agent-team-hub:end -->
```

**Layer 2: .claude/rules/hub-workflow.md (상세 규칙)**
- 세션 시작 시 `issues/` 디렉토리에서 자신에게 할당된 이슈 확인
- 업무 출처별 처리 방법 (기존 이슈 / 채팅 지시 / 자발적 발견 → 모두 이슈 생성 후 진행)
- 상태 전이 규칙 (open → in-progress → resolved, 코멘트 필수)
- 서브에이전트 실행 시 이슈 해결 지시 포함 필수

**Layer 3: .claude/agents/*.md (에이전트별 바인딩)**
- Hub UI에서 에이전트 생성 시 자동으로 세션 시작 절차와 이슈 관리 섹션 삽입
- 각 에이전트가 명시적으로 `hub-workflow.md` 참조

**Layer 4: .claude/skills/hub.md (CRUD 스킬)**
- 이슈 생성/조회/수정/완료의 구체적 파일 조작 방법
- 문서 생성/수정의 frontmatter 규격
- 기획 데이터(PRD, Features, Roles, UserFlow) JSON 스키마
- _index.json nextId 관리 방법

---

## 6. Source Code Structure

```
agent-team-hub/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # 루트 레이아웃 (사이드바 + 메인)
│   │   ├── page.tsx                   # 대시보드
│   │   ├── planning/                  # 기획 섹션
│   │   │   ├── prd/page.tsx
│   │   │   ├── features/page.tsx
│   │   │   ├── roles/page.tsx
│   │   │   └── userflow/page.tsx
│   │   ├── docs/page.tsx
│   │   ├── issues/page.tsx
│   │   ├── agents/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/
│   │       ├── projects/route.ts      # 프로젝트 CRUD
│   │       ├── issues/                # 이슈 CRUD + polling + locks
│   │       ├── docs/route.ts
│   │       ├── files/route.ts
│   │       ├── agents/route.ts
│   │       ├── planning/route.ts
│   │       └── init/route.ts          # 프로젝트 초기화
│   ├── components/
│   │   ├── ui/                        # shadcn/ui
│   │   ├── layout/                    # LNB, Topbar, ProjectSelector
│   │   ├── planning/                  # PRD, Features, Roles, UserFlow
│   │   ├── issues/                    # IssueList, IssueDetail, IssueForm
│   │   ├── docs/                      # DocList, DocViewer
│   │   └── agents/                    # AgentList, AgentForm, AgentCard
│   ├── lib/
│   │   ├── storage/
│   │   │   ├── interface.ts           # StorageProvider 인터페이스
│   │   │   ├── local.ts              # LocalStorageProvider
│   │   │   └── browser.ts            # BrowserStorageProvider
│   │   ├── issue-store.ts            # 이슈 CRUD + 락
│   │   ├── project-init.ts           # 프로젝트 초기화
│   │   ├── parsers.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-issue-polling.ts
│   │   ├── use-project.ts
│   │   └── use-storage.ts
│   ├── types/
│   │   ├── issues.ts
│   │   ├── prd.ts
│   │   ├── features.ts
│   │   ├── agents.ts
│   │   ├── project.ts
│   │   └── storage.ts
│   └── templates/                     # 프로젝트 초기화 템플릿
│       ├── claude-md-section.md
│       ├── hub-workflow.md
│       ├── hub-skill.md
│       └── agent-template.md
└── scripts/
    └── install.sh
```

### 기존 코드 재활용

기존 ~/workspace/4fact-vms-plan/apps/hub에서 재활용할 코드:
- `lib/issue-store.ts` → 이슈 CRUD + 락 메커니즘 (거의 그대로)
- `lib/parsers.ts` → frontmatter 파싱 (그대로)
- `hooks/use-issue-polling.ts` → fingerprint 기반 폴링 (그대로)
- `types/issues.ts`, `types/prd.ts`, `types/features.ts` → 타입 정의 (그대로)
- `components/issues/` → 이슈 관련 컴포넌트 (경로 수정 후 재활용)
- `components/prd/`, `components/features/` → 기획 뷰 컴포넌트 (재활용)
- API 라우트 → Storage Abstraction Layer를 통하도록 리팩토링

### 새로 구현할 부분
- Storage Abstraction Layer (interface.ts, local.ts, browser.ts)
- Multi-Project 관리 (ProjectSelector, /api/projects, use-project)
- 프로젝트 초기화 (project-init.ts, templates/)
- 에이전트 CRUD UI (현재는 read-only → 생성/수정/삭제 추가)
- 글로벌 설정 관리

---

## 7. Verification Plan

### 로컬 모드 검증
1. `npx agent-team-hub` 또는 `npm run dev`로 앱 실행
2. Settings에서 새 프로젝트 등록 (디렉토리 경로 지정)
3. 프로젝트 초기화 → CLAUDE.md, .claude/rules/, .claude/skills/ 파일 생성 확인
4. Dashboard에서 프로젝트 통계 표시 확인
5. Issues에서 이슈 생성/수정/삭제/아카이브 → 실제 JSON 파일 변경 확인
6. Docs에서 문서 목록 표시 → frontmatter 파싱 확인
7. Planning에서 PRD/Features/Roles/UserFlow 시각화 확인
8. Agents에서 에이전트 생성 → .claude/agents/ 파일 생성 + 워크플로우 바인딩 확인
9. 별도 터미널에서 issues/ISS-NNN.json 직접 수정 → Hub UI에 실시간 반영 확인 (폴링)

### SaaS 모드 검증
1. Vercel에 배포
2. Chrome에서 접속 → File System Access API로 디렉토리 선택
3. 로컬 모드와 동일한 기능이 동작하는지 확인
4. 페이지 새로고침 후 IndexedDB 핸들 캐시로 빠른 복구 확인

### Claude Code 스킬 검증
1. 프로젝트에서 Claude Code 세션 시작
2. 에이전트가 hub-workflow.md를 읽고 이슈를 확인하는지 검증
3. 이슈 생성 → ISS-NNN.json 파일 생성 + _index.json nextId 증가 확인
4. 이슈 상태 변경 + 코멘트 추가 → Hub UI에 반영 확인
