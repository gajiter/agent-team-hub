// Auto-generated from src/templates/ — do not edit manually.
// Run: node scripts/bundle-templates.js

export const CLAUDE_MD_SECTION = `<!-- agent-team-hub:start -->
## 이슈 관리 시스템 (필수)

**어떤 업무든 코드를 작성하거나 파일을 수정하기 전에, 반드시 이슈를 먼저 생성하라.**

이것은 선택이 아니라 필수 규칙이다. 사람의 채팅 지시, 자발적 업무 발견, 다른 에이전트 요청 — 모두 이슈 생성이 선행되어야 한다.

### 이슈 생성 절차
> **이슈 파일을 직접 Edit/Write하지 말 것. 반드시 CLI(\`node .claude/skills/hub/scripts/issue-cli.js\`)를 사용하라.**

\`\`\`bash
# 1. 이슈 생성 (ID 채번, 타임스탬프 자동)
node .claude/skills/hub/scripts/issue-cli.js create --title "제목" --type task --assignee claude --reporter user

# 2. 작업 시작
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status in-progress

# 3. 작업 완료
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status resolved
node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author claude --content "작업 내역"
\`\`\`

### 상태 전환
- 작업 시작: \`update --status in-progress\`
- 작업 완료: \`update --status resolved\` + \`comment\`로 작업 내역 기록
- 상세 사용법: \`.claude/skills/hub/SKILL.md\`

## 구조화 데이터 관리
기획 산출물(PRD, 기능 명세, 역할/권한, 유저 플로우)은 \`data/\` 디렉토리에 JSON으로 관리합니다.
- 기획 작업을 요청받으면 \`.claude/skills/hub/SKILL.md\`의 스키마에 맞춰 \`data/\` 하위에 JSON 파일을 생성/수정
- 파일이 없으면 새로 만들고, \`data/\` 디렉토리가 없으면 먼저 생성
- 스키마를 정확히 준수해야 Hub 대시보드가 올바르게 시각화합니다
<!-- agent-team-hub:end -->`

export const HUB_WORKFLOW_TEMPLATE = `# 이슈 워크플로우 규칙

AI 에이전트가 이슈를 처리할 때 따르는 규칙입니다.

**이슈 관리 시스템은 에이전트의 주요 태스크 관리 도구입니다.** 모든 업무는 이슈를 통해 추적합니다.

## 이슈 저장소 구조

\`\`\`
issues/
├── _index.json          ← 메타데이터 + nextId 카운터
├── ISS-001.json         ← 개별 이슈 파일
├── ISS-002.json
├── archive/             ← 보관된 이슈
└── ...
\`\`\`

각 이슈 파일은 독립적인 JSON 파일이므로 개별 읽기/쓰기가 가능합니다.

## 세션 시작 시 — 할당 이슈 확인

세션 시작 시 \`issues/\` 디렉토리의 파일을 읽어 자신에게 할당된 이슈를 확인합니다.

\`\`\`
1. issues/ 내 ISS-*.json 파일 목록 조회
2. 각 파일에서 assignee 또는 assignees 배열에 자신의 에이전트명이 포함된 이슈 필터링
3. status가 "open" 또는 "in-progress"인 이슈를 활성 이슈로 파악
\`\`\`

특정 이슈 작업을 지시받은 경우 해당 이슈를 우선 처리합니다.

## 이슈 기반 업무 원칙 (필수)

**모든 업무는 이슈로 추적합니다.** 업무의 출처에 따라 다음과 같이 처리합니다:

| 업무 출처 | 처리 방법 |
|----------|----------|
| 기존 이슈 할당 | 해당 이슈를 \`in-progress\`로 변경 후 작업 |
| 사람(채팅)의 직접 지시 | 이슈를 새로 생성(assignee: 자신)한 뒤 작업 시작 |
| 자발적 업무 발견 | 이슈를 새로 생성(assignee: 자신)한 뒤 작업 시작 |
| 다른 에이전트에 요청 | 이슈를 새로 생성(assignee: 대상 에이전트)하여 전달 |

> **핵심**: 이슈 없이 진행되는 업무가 없어야 합니다. 이슈가 없으면 먼저 만들고 시작합니다.

## 이슈 CLI 도구

> **중요:** 이슈 파일(JSON)을 직접 Edit/Write하지 마세요. 반드시 CLI를 사용하세요.

모든 이슈 관리는 \`node .claude/skills/hub/scripts/issue-cli.js\` 를 Bash 도구로 실행합니다.
CLI가 ID 채번, 타임스탬프 생성, 필수 필드 보장, 불변 필드 보호를 자동 처리합니다.

## 이슈 상태 전환 규칙

### 작업 시작 시

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status in-progress
\`\`\`

### 작업 완료 시

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status resolved
node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {에이전트명} --content "작업 내역 요약"
\`\`\`

### 담당자 변경 시

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --assignee {새 담당자} --assignees "{담당1},{담당2}"
node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {현재 에이전트명} --content "{새 에이전트}에게 이관합니다. 사유: ..."
\`\`\`

## 서브에이전트 실행 시 이슈 처리 (필수)

서브에이전트로 실행되는 경우에도 이슈 상태 전환 규칙은 동일하게 적용됩니다.

### 서브에이전트를 호출하는 에이전트 (부모)

서브에이전트를 호출할 때 **프롬프트에 이슈 resolve 지침을 반드시 포함**합니다:

\`\`\`
- 작업 완료 후 반드시 CLI로 이슈를 resolve할 것:
  node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status resolved
  node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {에이전트명} --content "작업 내역"
\`\`\`

### 서브에이전트로 실행되는 에이전트 (자식)

1. 할당된 이슈가 있으면 CLI로 **status를 \`in-progress\`로 변경** 후 작업 시작
2. 작업 완료 후 CLI로 **반드시 status를 \`resolved\`로 변경**하고 코멘트로 작업 내역 기록
3. 이슈 resolve를 완료한 뒤에 부모 에이전트에게 결과를 반환

> **핵심**: 서브에이전트는 수명이 짧으므로, 작업 완료 시 이슈 resolve를 잊기 쉽습니다.
> **결과 반환 전에 이슈 상태 전환을 먼저 수행**해야 합니다.

## 코멘트 작성 규칙

사람에게 전달할 내용이 있으면 CLI로 코멘트를 추가합니다.

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {에이전트명} --content "작업 결과, 질문, 참고 사항 등"
\`\`\`

- 코멘트 ID(\`c-{timestamp}\`)와 \`createdAt\`은 CLI가 자동 생성
- 코멘트는 기존 comments 배열에 **추가**됩니다. 기존 코멘트는 수정/삭제되지 않습니다.

## 이슈 유형별 처리 가이드

| type | 설명 | 처리 방법 |
|------|------|----------|
| task | 일반 작업 | 작업 수행 후 resolved |
| bug | 버그 수정 | 수정 후 resolved, 수정 파일 relatedFiles에 추가 |
| feature | 기능 요청 | 구현 후 resolved |
| question | 질문 | 코멘트로 답변 후 resolved |
| decision | 의사결정 | 결정 내용을 코멘트로 기록 후 resolved |

## 새 이슈 생성

새 이슈를 생성해야 하는 경우 (예: 작업 중 발견한 문제, 다른 에이전트에 대한 요청):

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js create \\
  --title "이슈 제목" \\
  --type task \\
  --priority medium \\
  --description "상세 설명" \\
  --assignee {담당 에이전트} \\
  --reporter {자신의 에이전트명} \\
  --labels "label1,label2" \\
  --relatedFiles "src/foo.tsx" \\
  --relatedIds "ISS-001"
\`\`\`

- \`--title\`과 \`--type\`은 필수, 나머지는 선택
- ID 채번(\`ISS-NNN\`), \`createdAt\`, \`updatedAt\`은 CLI가 자동 생성
- 배열 필드(\`assignees\`, \`labels\`, \`relatedFiles\`, \`relatedIds\`)는 쉼표로 구분

> **복수 담당자**: \`--assignees "에이전트1,에이전트2"\` 로 여러 에이전트를 지정할 수 있습니다.

## status 설명

| status | 의미 | 전환 주체 |
|--------|------|----------|
| open | 미착수 | 생성 시 기본값 |
| in-progress | 작업 중 | 담당 에이전트가 작업 시작 시 |
| resolved | 해결됨 | 담당 에이전트가 작업 완료 시 |
| closed | 닫힘 | 사람이 resolved를 확인 후 |
| archived | 보관됨 | 사람이 Hub에서 보관 처리 시 (\`issues/archive/\`로 물리적 이동) |`

export const HUB_SKILL_TEMPLATE = `---
name: hub
description: This skill should be used when the user asks to "이슈 생성", "이슈 만들어", "문서 작성", "PRD 작성", "기능 명세", "역할 권한", "유저 플로우", "구조화 데이터", "data/ 파일 생성", or mentions issue management, document creation, or structured data schemas for the Hub project.
---

# Hub 이슈, 문서, 구조화 데이터 관리

프로젝트의 이슈 추적, 문서 관리, 기획 구조화 데이터를 관리하는 스킬.

## 디렉토리 구조

\`\`\`
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
│   ├── roles.json           ← 역할/권한 매트릭스
│   └── userflow.json        ← 사용자 흐름 정의
└── .hub/
    └── config.json          ← 허브 설정
\`\`\`

## 이슈 관리

> **중요:** 이슈 파일(JSON)을 직접 Edit/Write하지 마세요. 반드시 아래 CLI를 사용하세요.
> CLI가 ID 채번, 타임스탬프, 필수 필드 보장, 포맷 일관성을 자동 처리합니다.

### CLI 사용법

모든 이슈 관리는 \`node .claude/skills/hub/scripts/issue-cli.js\` 를 Bash 도구로 실행합니다.

### 이슈 생성

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js create \\
  --title "이슈 제목" \\
  --type bug \\
  --priority high \\
  --description "상세 설명" \\
  --assignee claude \\
  --reporter user \\
  --labels "label1,label2" \\
  --relatedFiles "src/foo.tsx,src/bar.ts" \\
  --relatedIds "ISS-001,ISS-002"
\`\`\`

- \`--title\`과 \`--type\`은 필수
- \`--priority\`는 기본값 \`medium\`, \`--status\`는 기본값 \`open\`
- 배열 필드는 쉼표로 구분
- ID 채번과 타임스탬프는 자동 생성

### 이슈 수정

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --status in-progress
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --priority critical --labels "urgent,hotfix"
\`\`\`

- 수정 가능: \`title\`, \`description\`, \`status\`, \`priority\`, \`type\`, \`assignee\`, \`assignees\`, \`labels\`, \`relatedFiles\`, \`relatedIds\`
- \`updatedAt\`은 자동 갱신
- \`id\`, \`createdAt\`, \`reporter\`, \`comments\`는 변경 불가 (CLI가 차단)

### 코멘트 추가

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js comment ISS-001 --author claude --content "작업 완료 내역"
\`\`\`

- \`--author\`와 \`--content\`는 필수
- 코멘트 ID와 타임스탬프는 자동 생성

### 이슈 조회

\`\`\`bash
node .claude/skills/hub/scripts/issue-cli.js get ISS-001
node .claude/skills/hub/scripts/issue-cli.js list
node .claude/skills/hub/scripts/issue-cli.js list --status open --type bug
node .claude/skills/hub/scripts/issue-cli.js list --assignee claude --priority high
\`\`\`

## 문서 생성

\`docs/\` 디렉토리에 \`.md\` 파일 생성. 반드시 YAML frontmatter 포함.

\`\`\`markdown
---
title: "문서 제목"
description: "문서 설명"
author: "작성자 에이전트명"
emoji: "📄"
type: "guide"
createdAt: "ISO 8601"
---

문서 내용
\`\`\`

- **type**: \`guide\` | \`spec\` | \`note\` | \`reference\` | \`decision\`

## 구조화 데이터 관리

\`data/\` 디렉토리에 프로젝트 기획 구조화 데이터를 JSON으로 관리. Hub 대시보드가 이 파일들을 읽어 시각화.

### 공통 규칙

- 모든 파일은 JSON (indent 2)
- \`version\`과 \`project\` 필드를 반드시 포함
- 수정 시 전체 파일을 다시 쓰기 (부분 패치 불가)
- 스키마를 정확히 준수해야 Hub UI가 올바르게 렌더링됨

### 구조화 데이터 생성 가이드

기획 문서(PRD, 기능 명세 등)를 작성하라는 요청을 받으면:

1. \`data/\` 디렉토리가 없으면 생성
2. **\`references/schemas.md\`** 의 스키마에 맞춰 JSON 파일 작성
3. 프로젝트명, 버전, 날짜 등 메타데이터를 채움
4. ID 체계를 일관되게 유지 (US-01, F-01, REQ-01, NFR-P01 등)
5. 파일 간 참조를 정확히 연결 (userStories ↔ features ↔ requirements)

## 추가 리소스

### 참조 파일

상세 JSON 스키마는 아래 참조 파일에서 확인:

- **\`references/schemas.md\`** — 이슈 파일, PRD, 기능 명세, 역할/권한, 유저 플로우의 전체 JSON 스키마`

export const HUB_SKILL_SCHEMAS_TEMPLATE = `# Hub 구조화 데이터 JSON 스키마

이 문서는 Hub에서 사용하는 모든 JSON 스키마의 상세 정의를 포함합니다.

## 이슈 파일 스키마 (ISS-NNN.json)

\`\`\`json
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
\`\`\`

- **status**: \`open\` | \`in-progress\` | \`resolved\` | \`closed\` | \`archived\`
- **priority**: \`low\` | \`medium\` | \`high\` | \`critical\`
- **type**: \`task\` | \`bug\` | \`feature\` | \`question\` | \`decision\`

---

## data/prd.json — 제품 요구사항 정의 (PRD)

\`\`\`json
{
  "version": "2.0",
  "project": "프로젝트명",
  "updatedAt": "ISO 8601",
  "progress": 0,
  "sections": {
    "properties": {
      "serviceName": "서비스명",
      "version": "1.0",
      "status": "draft | in-review | approved",
      "basedOn": "기반 문서"
    },
    "vision": {
      "oneLiner": "한 줄 요약",
      "goals": ["목표1", "목표2"],
      "background": ["배경/문제1", "배경/문제2"]
    },
    "coreValues": [
      { "id": "CV-01", "name": "가치명", "description": "설명" }
    ],
    "target": {
      "userTypes": [
        { "role": "역할명", "description": "설명", "concerns": "주요 관심사" }
      ],
      "personas": [
        {
          "name": "이름", "role": "역할",
          "situation": "상황", "goal": "목표",
          "painPoint": "불편", "coreNeed": "핵심 니즈"
        }
      ],
      "scenarios": ["시나리오1"]
    },
    "userStories": [
      {
        "id": "US-01", "title": "제목", "size": "Small | Medium | Large",
        "actor": "역할명", "goal": "목적", "want": "원하는 것",
        "acceptance": { "given": "전제", "when": "행동", "then": "결과" }
      }
    ],
    "nonFunctionalRequirements": {
      "performance": [{ "id": "NFR-P01", "requirement": "내용", "target": "목표치" }],
      "security": [{ "id": "NFR-S01", "requirement": "내용" }],
      "deployment": [{ "id": "NFR-D01", "requirement": "내용" }],
      "dataManagement": [{ "id": "NFR-DM01", "requirement": "내용" }]
    },
    "mvpScope": {
      "included": [{ "id": "MVP-01", "item": "포함 항목", "relatedStories": ["US-01"] }],
      "excluded": [{ "item": "제외 항목", "reason": "사유" }]
    },
    "roadmap": [
      { "phase": 1, "title": "Phase 1", "targetDate": "2026-Q2 또는 null", "items": ["항목"] }
    ],
    "kpi": {
      "operationalStability": [{ "metric": "지표", "target": "목표", "period": "기간" }],
      "usability": [],
      "business": []
    },
    "constraints": [
      { "id": "CON-01", "description": "제약 조건" }
    ],
    "openIssues": [
      { "id": "OI-01", "item": "미결 항목", "status": "현재 상태", "prdImpact": "PRD 영향" }
    ]
  }
}
\`\`\`

> \`progress\`는 0-100 정수로, 전체 기획 진행률을 나타냅니다.

---

## data/features.json — 기능 명세

\`\`\`json
{
  "version": "1.0",
  "project": "프로젝트명",
  "requirements": [
    {
      "id": "REQ-01", "name": "요구사항명", "description": "설명",
      "group": "tenant | admin | platform",
      "order": 1, "priority": "high | medium | low",
      "status": "done | in-progress | todo",
      "acceptanceCriteria": ["기준1"]
    }
  ],
  "features": [
    {
      "id": "F-01", "name": "기능명", "description": "설명",
      "requirementId": "REQ-01", "phase": 1,
      "priority": "high | medium | low",
      "status": "done | in-progress | todo",
      "userStories": ["US-01"],
      "acceptanceCriteria": ["기준1"],
      "parentId": null,
      "dependencies": ["F-02"],
      "screens": ["화면명"]
    }
  ],
  "relations": [
    { "from": "F-01", "to": "F-02", "type": "depends | related | extends", "description": "설명" }
  ]
}
\`\`\`

> \`requirementId\`로 기능과 요구사항을 연결합니다. \`parentId\`로 기능의 계층 구조를 표현합니다.

---

## data/roles.json — 역할/권한 매트릭스

\`\`\`json
{
  "version": "1.0",
  "project": "프로젝트명",
  "scopeHierarchy": [
    { "scope": "global", "name": "전역", "description": "전체 시스템" },
    { "scope": "workspace", "name": "워크스페이스", "description": "워크스페이스 단위" },
    { "scope": "site", "name": "사이트", "description": "사이트 단위" }
  ],
  "roles": [
    { "id": "owner", "name": "소유자", "scope": "global", "description": "설명", "level": 1 }
  ],
  "permissions": [
    {
      "action": "행동 설명",
      "featureId": "F-01",
      "roles": { "owner": true, "admin": true, "member": false },
      "note": "조건부 허용인 경우 설명"
    }
  ],
  "scopeNotes": {
    "원칙명": "설명"
  }
}
\`\`\`

> \`scopeHierarchy\`와 \`scopeNotes\`는 선택적 필드입니다. \`roles\`의 \`level\`이 낮을수록 상위 권한입니다.

---

## data/userflow.json — 사용자 흐름

\`\`\`json
{
  "version": "1.0",
  "project": "프로젝트명",
  "sections": [
    {
      "name": "섹션명 (예: 인증 플로우)",
      "nodes": [
        { "id": "start", "type": "start", "label": "시작" },
        { "id": "login-page", "type": "page", "label": "로그인 페이지", "featureIds": ["F-01"] },
        { "id": "submit", "type": "action", "label": "로그인 버튼 클릭" },
        { "id": "auth-section", "type": "section", "label": "인증 처리" }
      ],
      "edges": [
        { "from": "start", "to": "login-page" },
        { "from": "login-page", "to": "submit" },
        { "from": "submit", "to": "auth-section" }
      ]
    }
  ]
}
\`\`\`

> 노드 type: \`start\`(시작점), \`section\`(섹션 그룹), \`page\`(화면), \`action\`(사용자 행동).
> \`featureIds\`로 features.json의 기능과 연결할 수 있습니다 (선택).`

export const HUB_ISSUE_CLI_TEMPLATE = `#!/usr/bin/env node

/**
 * Issue CLI — AI 에이전트가 이슈를 관리할 때 사용하는 CLI 도구.
 * 파일을 직접 수정하지 않고 이 CLI를 통해 일관된 포맷으로 이슈를 생성/수정/코멘트합니다.
 *
 * Usage:
 *   node scripts/issue-cli.js create --title "제목" --type bug --priority high [options]
 *   node scripts/issue-cli.js update ISS-001 --status in-progress --labels "a,b"
 *   node scripts/issue-cli.js comment ISS-001 --author claude --content "작업 완료"
 *   node scripts/issue-cli.js get ISS-001
 *   node scripts/issue-cli.js list [--status open] [--type bug]
 */

const fs = require('fs')
const path = require('path')

// __dirname = .claude/skills/hub/scripts → project root = 4 levels up
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..', '..')
const ISSUES_DIR = path.join(PROJECT_ROOT, 'issues')
const INDEX_PATH = path.join(ISSUES_DIR, '_index.json')

// ── Validation constants ──

const VALID_STATUS = ['open', 'in-progress', 'resolved', 'closed', 'archived']
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical']
const VALID_TYPE = ['task', 'bug', 'feature', 'question', 'decision']

// ── Helpers ──

function now() {
  return new Date().toISOString()
}

function padId(n) {
  return String(n).padStart(3, '0')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\\n', 'utf-8')
}

function issuePath(id) {
  return path.join(ISSUES_DIR, \`\${id}.json\`)
}

function parseArgs(args) {
  const result = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true
      result[key] = val
      if (val !== true) i++
    }
  }
  return result
}

function fail(msg) {
  console.error(\`ERROR: \${msg}\`)
  process.exit(1)
}

function validate(value, allowed, fieldName) {
  if (value && !allowed.includes(value)) {
    fail(\`Invalid \${fieldName}: "\${value}". Allowed: \${allowed.join(', ')}\`)
  }
}

// ── Commands ──

function cmdCreate(args) {
  const opts = parseArgs(args)

  if (!opts.title) fail('--title is required')
  if (!opts.type) fail('--type is required')

  validate(opts.type, VALID_TYPE, 'type')
  validate(opts.priority, VALID_PRIORITY, 'priority')
  validate(opts.status, VALID_STATUS, 'status')

  // Read and increment index
  const index = readJson(INDEX_PATH)
  const issueId = \`ISS-\${padId(index.nextId)}\`
  const timestamp = now()

  const issue = {
    id: issueId,
    title: opts.title,
    description: opts.description || '',
    status: opts.status || 'open',
    priority: opts.priority || 'medium',
    type: opts.type,
    assignee: opts.assignee || '',
    assignees: opts.assignees ? opts.assignees.split(',').map(s => s.trim()) : [],
    reporter: opts.reporter || '',
    labels: opts.labels ? opts.labels.split(',').map(s => s.trim()) : [],
    relatedFiles: opts.relatedFiles ? opts.relatedFiles.split(',').map(s => s.trim()) : [],
    relatedIds: opts.relatedIds ? opts.relatedIds.split(',').map(s => s.trim()) : [],
    comments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  writeJson(issuePath(issueId), issue)

  index.nextId += 1
  writeJson(INDEX_PATH, index)

  console.log(JSON.stringify(issue, null, 2))
}

function cmdUpdate(args) {
  const issueId = args[0]
  if (!issueId || issueId.startsWith('--')) fail('Issue ID is required (e.g., ISS-001)')

  const opts = parseArgs(args.slice(1))
  const filePath = issuePath(issueId)

  if (!fs.existsSync(filePath)) fail(\`Issue not found: \${issueId}\`)

  validate(opts.status, VALID_STATUS, 'status')
  validate(opts.priority, VALID_PRIORITY, 'priority')
  validate(opts.type, VALID_TYPE, 'type')

  const issue = readJson(filePath)

  // Immutable fields
  const IMMUTABLE = ['id', 'createdAt', 'reporter', 'comments']

  // Updatable fields (scalar)
  const SCALAR_FIELDS = ['title', 'description', 'status', 'priority', 'type', 'assignee']
  // Updatable fields (array, comma-separated)
  const ARRAY_FIELDS = ['assignees', 'labels', 'relatedFiles', 'relatedIds']

  let changed = false

  for (const key of SCALAR_FIELDS) {
    if (opts[key] !== undefined) {
      if (IMMUTABLE.includes(key)) {
        fail(\`Cannot modify immutable field: \${key}\`)
      }
      issue[key] = opts[key]
      changed = true
    }
  }

  for (const key of ARRAY_FIELDS) {
    if (opts[key] !== undefined) {
      issue[key] = opts[key].split(',').map(s => s.trim())
      changed = true
    }
  }

  if (!changed) fail('No fields to update. Use --field value to update fields.')

  issue.updatedAt = now()
  writeJson(filePath, issue)

  console.log(JSON.stringify(issue, null, 2))
}

function cmdComment(args) {
  const issueId = args[0]
  if (!issueId || issueId.startsWith('--')) fail('Issue ID is required (e.g., ISS-001)')

  const opts = parseArgs(args.slice(1))

  if (!opts.author) fail('--author is required')
  if (!opts.content) fail('--content is required')

  const filePath = issuePath(issueId)
  if (!fs.existsSync(filePath)) fail(\`Issue not found: \${issueId}\`)

  const issue = readJson(filePath)
  const timestamp = now()

  const comment = {
    id: \`c-\${Date.now()}\`,
    author: opts.author,
    content: opts.content,
    createdAt: timestamp,
  }

  issue.comments.push(comment)
  issue.updatedAt = timestamp
  writeJson(filePath, issue)

  console.log(JSON.stringify(comment, null, 2))
}

function cmdGet(args) {
  const issueId = args[0]
  if (!issueId) fail('Issue ID is required (e.g., ISS-001)')

  const filePath = issuePath(issueId)
  if (!fs.existsSync(filePath)) fail(\`Issue not found: \${issueId}\`)

  const issue = readJson(filePath)
  console.log(JSON.stringify(issue, null, 2))
}

function cmdList(args) {
  const opts = parseArgs(args)

  const files = fs.readdirSync(ISSUES_DIR).filter(f => f.startsWith('ISS-') && f.endsWith('.json'))
  let issues = files.map(f => readJson(path.join(ISSUES_DIR, f)))

  if (opts.status) {
    validate(opts.status, VALID_STATUS, 'status')
    issues = issues.filter(i => i.status === opts.status)
  }
  if (opts.type) {
    validate(opts.type, VALID_TYPE, 'type')
    issues = issues.filter(i => i.type === opts.type)
  }
  if (opts.priority) {
    validate(opts.priority, VALID_PRIORITY, 'priority')
    issues = issues.filter(i => i.priority === opts.priority)
  }
  if (opts.assignee) {
    issues = issues.filter(i => i.assignee === opts.assignee)
  }
  if (opts.label) {
    issues = issues.filter(i => i.labels && i.labels.includes(opts.label))
  }

  // Summary output
  const summary = issues.map(i => ({
    id: i.id,
    title: i.title,
    status: i.status,
    priority: i.priority,
    type: i.type,
    assignee: i.assignee,
  }))

  console.log(JSON.stringify(summary, null, 2))
}

// ── Main ──

const [command, ...args] = process.argv.slice(2)

const commands = { create: cmdCreate, update: cmdUpdate, comment: cmdComment, get: cmdGet, list: cmdList }

if (!command || !commands[command]) {
  console.log(\`Usage: issue-cli <command> [options]

Commands:
  create   Create a new issue
           --title (required) --type (required) --priority --status
           --description --assignee --assignees --reporter
           --labels --relatedFiles --relatedIds

  update   Update an existing issue
           issue-cli update ISS-001 --status resolved --priority high
           Updatable: title, description, status, priority, type,
                      assignee, assignees, labels, relatedFiles, relatedIds

  comment  Add a comment to an issue
           issue-cli comment ISS-001 --author claude --content "내용"

  get      Read an issue
           issue-cli get ISS-001

  list     List issues with optional filters
           --status --type --priority --assignee --label\`)
  process.exit(command ? 1 : 0)
}

commands[command](args)`
