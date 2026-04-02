---
name: hub
description: This skill should be used when the user asks to "이슈 생성", "이슈 만들어", "문서 작성", "PRD 작성", "기능 명세", "유저 플로우", "구조화 데이터", "data/ 파일 생성", or mentions issue management, document creation, or structured data schemas for the Hub project.
---

# Hub 이슈, 문서, 구조화 데이터 관리

프로젝트의 이슈 추적, 문서 관리, 기획 구조화 데이터를 관리하는 스킬.

## 디렉토리 구조

```
<project-root>/
├── issues/
│   ├── _index.json          ← 메타데이터 (nextId 카운터)
│   ├── ISS-001.json         ← 개별 이슈 파일
│   └── archive/             ← 보관된 이슈
├── docs/
│   └── *.md                 ← 문서 파일 (frontmatter 포함)
├── data/                    ← 구조화 데이터 (에이전트가 생성/관리)
│   ├── prd.json             ← 제품 요구사항 정의
│   ├── features.json        ← 기능 명세 및 요구사항
│   └── userflow.json        ← 사용자 흐름 정의
└── .hub/
    └── config.json          ← 허브 설정
```

## 이슈 관리

> **중요:** 이슈 파일(JSON)을 직접 Edit/Write하지 마세요. 반드시 아래 CLI를 사용하세요.
> CLI가 ID 채번, 타임스탬프, 필수 필드 보장, 포맷 일관성을 자동 처리합니다.

### CLI 사용법

모든 이슈 관리는 `node .claude/skills/hub/scripts/issue-cli.js` 를 Bash 도구로 실행합니다.

### 이슈 생성

```bash
node .claude/skills/hub/scripts/issue-cli.js create \
  --title "이슈 제목" \
  --type bug \
  --priority high \
  --description "상세 설명" \
  --assignee claude \
  --reporter user \
  --labels "label1,label2" \
  --relatedFiles "src/foo.tsx,src/bar.ts" \
  --relatedIds "ISS-001,ISS-002"
```

- `--title`과 `--type`은 필수
- `--priority`는 기본값 `medium`, `--status`는 기본값 `open`
- 배열 필드는 쉼표로 구분
- ID 채번과 타임스탬프는 자동 생성

### 이슈 수정

```bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --status in-progress
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --priority critical --labels "urgent,hotfix"
```

- 수정 가능: `title`, `description`, `status`, `priority`, `type`, `assignee`, `assignees`, `labels`, `relatedFiles`, `relatedIds`
- `updatedAt`은 자동 갱신
- `id`, `createdAt`, `reporter`, `comments`는 변경 불가 (CLI가 차단)

### 코멘트 추가

```bash
node .claude/skills/hub/scripts/issue-cli.js comment ISS-001 --author claude --content "작업 완료 내역"
```

- `--author`와 `--content`는 필수
- 코멘트 ID와 타임스탬프는 자동 생성

### 이슈 조회

```bash
node .claude/skills/hub/scripts/issue-cli.js get ISS-001
node .claude/skills/hub/scripts/issue-cli.js list
node .claude/skills/hub/scripts/issue-cli.js list --status open --type bug
node .claude/skills/hub/scripts/issue-cli.js list --assignee claude --priority high
```

## 문서 생성

`docs/` 디렉토리에 `.md` 파일 생성. 반드시 YAML frontmatter 포함.

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

## 구조화 데이터 관리

`data/` 디렉토리에 프로젝트 기획 구조화 데이터를 JSON으로 관리. Hub 대시보드가 이 파일들을 읽어 시각화.

### 공통 규칙

- 모든 파일은 JSON (indent 2)
- `version`과 `project` 필드를 반드시 포함
- 수정 시 전체 파일을 다시 쓰기 (부분 패치 불가)
- 스키마를 정확히 준수해야 Hub UI가 올바르게 렌더링됨

### 구조화 데이터 생성 가이드

기획 문서(PRD, 기능 명세 등)를 작성하라는 요청을 받으면:

1. `data/` 디렉토리가 없으면 생성
2. **`references/schemas.md`** 의 스키마에 맞춰 JSON 파일 작성
3. 프로젝트명, 버전, 날짜 등 메타데이터를 채움
4. ID 체계를 일관되게 유지 (US-01, F-01, REQ-01, NFR-P01 등)
5. 파일 간 참조를 정확히 연결 (userStories ↔ features ↔ requirements)

## 추가 리소스

### 참조 파일

상세 JSON 스키마는 아래 참조 파일에서 확인:

- **`references/schemas.md`** — 이슈 파일, PRD, 기능 명세, 유저 플로우의 전체 JSON 스키마
