# agent-hub 플러그인 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** hub 워크플로우를 CLAUDE.md/rules 의존에서 탈피하여, 자급자족하는 agent-hub 플러그인 2개 스킬로 재구성

**Architecture:** `.claude/plugins/agent-hub/` 에 hub-issue-tracker (가드레일 패턴 이슈 관리)와 hub-docs (문서/구조화 데이터 생성) 2개 스킬을 배치. 기존 CLAUDE.md 주입 섹션, rules/hub-workflow.md, .claude/skills/hub/ 를 모두 제거.

**Tech Stack:** Node.js (issue-cli.js), Markdown (SKILL.md), JSON schemas

---

## 파일 맵

| 조치 | 경로 | 역할 |
|------|------|------|
| Create | `.claude/plugins/agent-hub/skills/hub-issue-tracker/SKILL.md` | 이슈 관리 가드레일 스킬 |
| Create | `.claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js` | 이슈 CRUD CLI (기존 복사 + 경로 수정) |
| Create | `.claude/plugins/agent-hub/skills/hub-issue-tracker/references/issue-schema.md` | 이슈 JSON 스키마 |
| Create | `.claude/plugins/agent-hub/skills/hub-docs/SKILL.md` | 문서/구조화 데이터 스킬 |
| Create | `.claude/plugins/agent-hub/skills/hub-docs/references/schemas.md` | PRD/features/roles/userflow 스키마 |
| Create | `.claude/plugins/agent-hub/README.md` | 플러그인 설명 |
| Modify | `CLAUDE.md` | hub 주입 섹션 제거 |
| Delete | `.claude/rules/hub-workflow.md` | 워크플로우 규칙 제거 |
| Delete | `.claude/skills/hub/` (전체) | 기존 스킬 제거 |

---

### Task 1: hub-issue-tracker SKILL.md 작성

**Files:**
- Create: `.claude/plugins/agent-hub/skills/hub-issue-tracker/SKILL.md`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts
mkdir -p .claude/plugins/agent-hub/skills/hub-issue-tracker/references
```

- [ ] **Step 2: SKILL.md 작성**

아래 내용으로 `.claude/plugins/agent-hub/skills/hub-issue-tracker/SKILL.md` 생성:

```markdown
---
name: hub-issue-tracker
description: "프로젝트 내 코드 변경, 버그 수정, 기능 구현, 리팩토링, 설정 변경 등 실질적인 작업 요청 시 이슈를 생성하고 라이프사이클을 관리합니다. 사용자가 명시적으로 이슈를 언급하지 않더라도, 파일 수정이 수반되는 작업이라면 반드시 이 스킬을 사용하세요. 이슈 목록 조회, 단순 질문, 코드 설명 등 정보 확인만 하는 경우에는 트리거하지 않습니다. 이 스킬은 이슈 조회/관리 요청(이슈 목록, 이슈 상태 확인, 이슈 검색)에서도 사용합니다."
---

# 이슈 관리 가드레일

이 스킬은 에이전트가 작업을 시작하기 전에 이슈를 생성하고, 작업 중/완료 시 이슈 상태를 관리하는 가드레일입니다.

## 왜 이슈를 만들어야 하는가

이슈는 단순한 기록이 아닙니다. Hub 대시보드에서 프로젝트 전체 상태를 시각화하는 데이터 소스입니다.
이슈 없이 진행된 작업은 프로젝트 히스토리에서 보이지 않으며, 다른 에이전트나 사람이 무엇이 변경되었는지 파악할 수 없습니다.
이슈를 만드는 데 30초가 걸리지만, 이슈 없이 진행된 작업을 사후에 추적하는 데는 몇 배의 시간이 듭니다.

## 의사결정 트리

사용자 요청을 받으면, 작업을 시작하기 **전에** 아래 트리를 따라 판단합니다.

### 이슈 불필요 — 바로 진행

- 단순 질문이나 설명 요청 ("이 코드 뭐야?", "이 함수 설명해줘", "차이점이 뭐야?")
- 대화, 인사, 의견 요청
- 설정 확인, 환경 정보 조회
- 이슈 자체를 조회하거나 관리하는 요청 ("이슈 목록 보여줘", "ISS-003 상태 알려줘")

이 경우 이슈 생성 없이 바로 요청을 처리합니다.
이슈 조회/관리 요청은 아래 **CLI 사용법** 섹션의 조회 명령어를 사용합니다.

### 이슈 필요 — 생성 후 작업

- 코드 수정이 수반되는 작업 (버그 수정, 기능 구현, 리팩토링)
- 파일 생성, 삭제, 변경
- 설정 파일, 인프라, CI/CD 변경
- 테스트 추가/수정

이 경우 **반드시 이슈를 먼저 생성**한 뒤 작업을 시작합니다.

### 판단 애매 — 사용자에게 확인

- 조사 후 수정이 필요할 수도 있는 요청 ("이거 왜 안 되지?", "성능이 느린 것 같은데")
- 범위가 불명확한 요청 ("좀 개선해줘", "정리 좀 해줘")
- 탐색적 요청 ("~해볼까?", "~검토해줘")

이 경우 사용자에게 물어봅니다:
> "이 작업은 코드 수정이 필요할 수 있습니다. 이슈를 생성하고 진행할까요?"

사용자가 이슈 생성을 원하지 않으면, 이슈 없이 진행합니다.

## 이슈 라이프사이클

이슈가 필요하다고 판단되면 다음 순서를 따릅니다.

### 1. 기존 이슈 확인

먼저 이미 관련된 열린 이슈가 있는지 확인합니다:

```bash
node <skill-path>/scripts/issue-cli.js list --status open --assignee claude
```

관련 이슈가 있으면 새로 만들지 않고 해당 이슈를 사용합니다.

### 2. 이슈 생성

관련 이슈가 없으면 새로 생성합니다:

```bash
node <skill-path>/scripts/issue-cli.js create \
  --title "작업 제목" \
  --type task \
  --assignee claude \
  --reporter user \
  --description "작업 설명"
```

- `--type`: `task` | `bug` | `feature` | `question` | `decision`
- `--priority`: `low` | `medium` | `high` | `critical` (기본: medium)

### 3. 작업 시작

```bash
node <skill-path>/scripts/issue-cli.js update ISS-NNN --status in-progress
```

### 4. 작업 수행

실제 작업을 진행합니다. 이 단계에서 스킬의 역할은 끝나며, 에이전트가 자유롭게 작업합니다.

### 5. 작업 완료

작업이 끝나면 **반드시** 이슈를 종료합니다. 이 단계를 빠뜨리지 마세요:

```bash
node <skill-path>/scripts/issue-cli.js update ISS-NNN --status resolved
node <skill-path>/scripts/issue-cli.js comment ISS-NNN --author claude --content "작업 내역 요약"
```

## 서브에이전트 규칙

서브에이전트로 실행되는 경우에도 동일한 규칙을 따릅니다:

- 할당된 이슈가 있으면 `in-progress`로 변경 후 작업 시작
- 작업 완료 시 `resolved`로 변경 + 코멘트 기록
- **결과 반환 전에 이슈 상태 전환을 먼저 수행** (서브에이전트는 수명이 짧아 잊기 쉬움)

서브에이전트를 호출하는 부모 에이전트는 프롬프트에 이슈 ID와 resolve 지침을 포함합니다.

## CLI 사용법

모든 이슈 관리는 CLI를 통해 수행합니다. 이슈 JSON 파일을 직접 Edit/Write하지 마세요.

> `<skill-path>`는 이 스킬이 설치된 경로입니다. 실행 시 Bash 도구에서 상대 경로 또는 절대 경로를 사용하세요.

### 생성

```bash
node <skill-path>/scripts/issue-cli.js create \
  --title "제목" --type bug --priority high \
  --description "설명" --assignee claude --reporter user \
  --labels "label1,label2" --relatedFiles "src/foo.tsx"
```

필수: `--title`, `--type`

### 수정

```bash
node <skill-path>/scripts/issue-cli.js update ISS-001 --status in-progress
node <skill-path>/scripts/issue-cli.js update ISS-001 --priority critical --labels "urgent"
```

수정 가능 필드: title, description, status, priority, type, assignee, assignees, labels, relatedFiles, relatedIds

### 코멘트

```bash
node <skill-path>/scripts/issue-cli.js comment ISS-001 --author claude --content "작업 완료"
```

필수: `--author`, `--content`

### 조회

```bash
node <skill-path>/scripts/issue-cli.js get ISS-001
node <skill-path>/scripts/issue-cli.js list
node <skill-path>/scripts/issue-cli.js list --status open --type bug --assignee claude
```

## 이슈 디렉토리 구조

```
<project-root>/issues/
├── _index.json          ← 메타데이터 (nextId 카운터)
├── ISS-001.json         ← 개별 이슈
├── ISS-002.json
└── archive/             ← 보관된 이슈
```

이슈 파일이 없거나 `issues/` 디렉토리가 없으면, CLI가 자동 생성합니다.

## 상세 스키마

이슈 JSON의 전체 스키마는 `references/issue-schema.md`를 참조하세요.
```

- [ ] **Step 3: 커밋**

```bash
git add .claude/plugins/agent-hub/skills/hub-issue-tracker/SKILL.md
git commit -m "feat: add hub-issue-tracker skill with guardrail pattern"
```

---

### Task 2: issue-cli.js 이동 및 경로 수정

**Files:**
- Create: `.claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js`
- Reference: `.claude/skills/hub/scripts/issue-cli.js` (원본)

- [ ] **Step 1: 기존 issue-cli.js를 새 위치에 복사**

```bash
cp .claude/skills/hub/scripts/issue-cli.js .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js
```

- [ ] **Step 2: PROJECT_ROOT 경로 수정**

`.claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js` 의 19번째 줄:

변경 전:
```javascript
// __dirname = .claude/skills/hub/scripts → project root = 4 levels up
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..', '..')
```

변경 후:
```javascript
// __dirname = .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts → project root = 7 levels up
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..', '..')
```

- [ ] **Step 3: CLI 동작 확인**

```bash
node .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js list
```

Expected: 이슈 목록 JSON 출력 (빈 배열 `[]` 이어도 정상)

- [ ] **Step 4: 커밋**

```bash
git add .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js
git commit -m "feat: move issue-cli.js to agent-hub plugin with updated path"
```

---

### Task 3: issue-schema.md 작성

**Files:**
- Create: `.claude/plugins/agent-hub/skills/hub-issue-tracker/references/issue-schema.md`
- Reference: `.claude/skills/hub/references/schemas.md` (이슈 섹션만 추출)

- [ ] **Step 1: issue-schema.md 작성**

아래 내용으로 `.claude/plugins/agent-hub/skills/hub-issue-tracker/references/issue-schema.md` 생성:

```markdown
# 이슈 JSON 스키마

## 이슈 파일 (ISS-NNN.json)

```json
{
  "id": "ISS-001",
  "title": "이슈 제목",
  "description": "상세 설명",
  "status": "open",
  "priority": "medium",
  "type": "task",
  "assignee": "에이전트명",
  "assignees": ["에이전트명"],
  "reporter": "생성자 에이전트명",
  "labels": [],
  "relatedFiles": [],
  "relatedIds": [],
  "comments": [],
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | `ISS-NNN` 형식, CLI가 자동 채번 |
| title | string | 이슈 제목 |
| description | string | 상세 설명 |
| status | enum | `open` \| `in-progress` \| `resolved` \| `closed` \| `archived` |
| priority | enum | `low` \| `medium` \| `high` \| `critical` |
| type | enum | `task` \| `bug` \| `feature` \| `question` \| `decision` |
| assignee | string | 주 담당자 (하위 호환용, assignees[0]과 동일) |
| assignees | string[] | 담당자 목록 |
| reporter | string | 생성자 |
| labels | string[] | 라벨 |
| relatedFiles | string[] | 관련 파일 경로 |
| relatedIds | string[] | 관련 이슈 ID |
| comments | Comment[] | 코멘트 배열 |
| createdAt | string | ISO 8601 생성 시각 |
| updatedAt | string | ISO 8601 수정 시각 |

### 코멘트 스키마

```json
{
  "id": "c-1234567890",
  "author": "에이전트명",
  "content": "코멘트 내용",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### status 라이프사이클

| status | 의미 | 전환 주체 |
|--------|------|----------|
| open | 미착수 | 생성 시 기본값 |
| in-progress | 작업 중 | 에이전트가 작업 시작 시 |
| resolved | 해결됨 | 에이전트가 작업 완료 시 |
| closed | 닫힘 | 사람이 resolved 확인 후 |
| archived | 보관됨 | 사람이 Hub에서 보관 처리 시 |

### 인덱스 파일 (_index.json)

```json
{
  "version": "1.0",
  "nextId": 10
}
```

`nextId`는 다음 이슈 생성 시 사용할 번호. CLI가 자동 증가시킴.
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/plugins/agent-hub/skills/hub-issue-tracker/references/issue-schema.md
git commit -m "feat: add issue schema reference for hub-issue-tracker"
```

---

### Task 4: hub-docs SKILL.md 작성

**Files:**
- Create: `.claude/plugins/agent-hub/skills/hub-docs/SKILL.md`
- Create: `.claude/plugins/agent-hub/skills/hub-docs/references/schemas.md`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p .claude/plugins/agent-hub/skills/hub-docs/references
```

- [ ] **Step 2: SKILL.md 작성**

아래 내용으로 `.claude/plugins/agent-hub/skills/hub-docs/SKILL.md` 생성:

```markdown
---
name: hub-docs
description: "PRD 작성, 기능 명세, 역할/권한 정의, 유저 플로우, 구조화 데이터 생성 등 기획 산출물을 작성할 때 사용합니다. '문서 작성', 'PRD 만들어', '기능 명세 작성', '역할 권한 정의', '유저 플로우', 'data/ 파일 생성' 등의 요청 시 반드시 이 스킬을 사용하세요."
---

# 문서 및 구조화 데이터 관리

프로젝트의 기획 산출물(PRD, 기능 명세, 역할/권한, 유저 플로우)을 구조화 데이터로 생성하고, 문서를 작성하는 스킬입니다.

## 문서 생성

`docs/` 디렉토리에 마크다운 파일을 생성합니다. 반드시 YAML frontmatter를 포함합니다.

```markdown
---
title: "문서 제목"
description: "문서 설명"
author: "작성자 에이전트명"
emoji: "📄"
type: "guide"
createdAt: "ISO 8601"
---

문서 내용
```

- **type**: `guide` | `spec` | `note` | `reference` | `decision`

## 구조화 데이터 생성

기획 산출물은 `data/` 디렉토리에 JSON으로 생성합니다. Hub 대시보드가 이 파일들을 읽어 시각화합니다.

### 생성 절차

1. `data/` 디렉토리가 없으면 생성
2. `references/schemas.md`의 스키마에 맞춰 JSON 파일 작성
3. 프로젝트명, 버전, 날짜 등 메타데이터를 채움
4. ID 체계를 일관되게 유지 (US-01, F-01, REQ-01 등)
5. 파일 간 참조를 정확히 연결 (userStories ↔ features ↔ requirements)

### 파일 목록

| 파일 | 용도 |
|------|------|
| `data/prd.json` | 제품 요구사항 정의 (PRD) |
| `data/features.json` | 기능 명세 및 요구사항 |
| `data/roles.json` | 역할/권한 매트릭스 |
| `data/userflow.json` | 사용자 흐름 정의 |

### 공통 규칙

- 모든 파일은 JSON (indent 2)
- `version`과 `project` 필드를 반드시 포함
- 수정 시 전체 파일을 다시 쓰기 (부분 패치 불가)
- 스키마를 정확히 준수해야 Hub UI가 올바르게 렌더링됨

## 상세 스키마

각 데이터 파일의 전체 JSON 스키마는 `references/schemas.md`를 참조하세요.
```

- [ ] **Step 3: schemas.md 작성 (이슈 스키마 제외)**

기존 `.claude/skills/hub/references/schemas.md`에서 이슈 스키마 섹션을 제거한 나머지를 `.claude/plugins/agent-hub/skills/hub-docs/references/schemas.md`에 작성:

```markdown
# Hub 구조화 데이터 JSON 스키마

이 문서는 Hub 기획 산출물의 JSON 스키마 정의를 포함합니다.

---

## data/prd.json — 제품 요구사항 정의 (PRD)

[기존 schemas.md의 33~102번째 줄 그대로 복사]

---

## data/features.json — 기능 명세

[기존 schemas.md의 108~140번째 줄 그대로 복사]

---

## data/roles.json — 역할/권한 매트릭스

[기존 schemas.md의 146~172번째 줄 그대로 복사]

---

## data/userflow.json — 사용자 흐름

[기존 schemas.md의 178~205번째 줄 그대로 복사]
```

- [ ] **Step 4: 커밋**

```bash
git add .claude/plugins/agent-hub/skills/hub-docs/
git commit -m "feat: add hub-docs skill for structured data and documents"
```

---

### Task 5: README.md 작성

**Files:**
- Create: `.claude/plugins/agent-hub/README.md`

- [ ] **Step 1: README.md 작성**

```markdown
# agent-hub

프로젝트 이슈 관리와 기획 산출물 생성을 위한 Claude Code 플러그인.

## 스킬

### hub-issue-tracker

코드 변경이 수반되는 작업 시 이슈를 자동 관리하는 가드레일 스킬.
- 작업 전 이슈 필요 여부 판단
- 이슈 생성, 상태 전환, 완료 처리
- CLI 기반 이슈 CRUD

### hub-docs

기획 산출물을 구조화 데이터로 생성하는 스킬.
- PRD, 기능 명세, 역할/권한, 유저 플로우
- `data/` 디렉토리에 JSON 스키마 준수 파일 생성
- `docs/` 디렉토리에 YAML frontmatter 문서 생성

## 설치

이 디렉토리를 프로젝트의 `.claude/plugins/agent-hub/`에 배치합니다.
```

- [ ] **Step 2: 커밋**

```bash
git add .claude/plugins/agent-hub/README.md
git commit -m "docs: add agent-hub plugin README"
```

---

### Task 6: 기존 파일 제거

**Files:**
- Delete: `.claude/rules/hub-workflow.md`
- Delete: `.claude/skills/hub/` (전체)
- Modify: `CLAUDE.md` (hub 섹션 제거)

- [ ] **Step 1: .claude/rules/hub-workflow.md 삭제**

```bash
rm .claude/rules/hub-workflow.md
```

- [ ] **Step 2: .claude/skills/hub/ 전체 삭제**

```bash
rm -rf .claude/skills/hub
```

- [ ] **Step 3: CLAUDE.md에서 hub 섹션 제거**

`CLAUDE.md`에서 `<!-- agent-team-hub:start -->` 부터 `<!-- agent-team-hub:end -->` 까지 전체 삭제.

변경 후 CLAUDE.md 내용:

```markdown
@AGENTS.md
```

- [ ] **Step 4: 커밋**

```bash
git add -A .claude/rules/hub-workflow.md .claude/skills/hub/ CLAUDE.md
git commit -m "refactor: remove hub rules, CLAUDE.md injection, and old hub skill

Hub workflow is now fully self-contained in the agent-hub plugin.
No more external rule files or CLAUDE.md injection needed."
```

---

### Task 7: 통합 검증

- [ ] **Step 1: 플러그인 구조 확인**

```bash
find .claude/plugins/agent-hub -type f | sort
```

Expected:
```
.claude/plugins/agent-hub/README.md
.claude/plugins/agent-hub/skills/hub-docs/SKILL.md
.claude/plugins/agent-hub/skills/hub-docs/references/schemas.md
.claude/plugins/agent-hub/skills/hub-issue-tracker/SKILL.md
.claude/plugins/agent-hub/skills/hub-issue-tracker/references/issue-schema.md
.claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js
```

- [ ] **Step 2: 기존 파일 제거 확인**

```bash
test ! -f .claude/rules/hub-workflow.md && echo "OK: hub-workflow.md removed"
test ! -d .claude/skills/hub && echo "OK: old hub skill removed"
grep -c "agent-team-hub" CLAUDE.md || echo "OK: hub section removed from CLAUDE.md"
```

Expected: 세 줄 모두 OK

- [ ] **Step 3: issue-cli.js 동작 확인**

```bash
node .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js list
```

Expected: JSON 배열 출력 (빈 배열이어도 정상)

- [ ] **Step 4: issue-cli.js create/get 동작 확인**

```bash
node .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js create --title "통합 테스트" --type task --assignee claude --reporter user
```

Expected: 생성된 이슈 JSON 출력 (ISS-010 이상)

```bash
node .claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/issue-cli.js list --status open
```

Expected: 방금 생성한 이슈가 포함된 배열

테스트 이슈는 검증 후 삭제:

```bash
rm issues/ISS-0*.json  # 테스트 이슈만 삭제 (번호 확인 후)
```

(또는 테스트 이슈를 `resolved`로 변경하여 유지해도 무방)
