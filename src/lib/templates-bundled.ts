// Bundled template contents for browser-mode initialization
// These are embedded as string constants so they work without filesystem access.

export const CLAUDE_MD_SECTION = `<!-- agent-team-hub:start -->
## 이슈 관리 시스템
이슈 관리 시스템은 에이전트의 주요 태스크 관리 도구입니다.
- 모든 업무는 이슈로 추적: 기존 이슈 할당 작업은 물론, 사람의 채팅 지시나 자발적 업무도 이슈를 먼저 생성한 뒤 진행
- 이슈 기반 작업 시 상태 전환 필수 (open → in-progress → resolved)
- \`.claude/rules/hub-workflow.md\` 규칙을 반드시 준수할 것

## 구조화 데이터 관리
기획 산출물(PRD, 기능 명세, 역할/권한, 유저 플로우)은 \`data/\` 디렉토리에 JSON으로 관리합니다.
- 기획 작업을 요청받으면 \`.claude/skills/hub.md\`의 스키마에 맞춰 \`data/\` 하위에 JSON 파일을 생성/수정
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

## 이슈 상태 전환 규칙

### 작업 시작 시

이슈 작업을 시작할 때 **status를 \`in-progress\`로 변경**합니다.

\`\`\`json
{
  "status": "in-progress",
  "updatedAt": "<현재 ISO 8601 시간>"
}
\`\`\`

### 작업 완료 시

이슈를 해결했을 때 **status를 \`resolved\`로 변경**하고, **코멘트로 작업 내역을 기록**합니다.

\`\`\`json
{
  "status": "resolved",
  "updatedAt": "<현재 ISO 8601 시간>",
  "comments": [
    {
      "id": "c-{timestamp}",
      "author": "{에이전트명}",
      "content": "작업 내역 요약...",
      "createdAt": "<현재 ISO 8601 시간>"
    }
  ]
}
\`\`\`

### 담당자 변경 시

자신이 처리할 수 없거나 다른 에이전트가 적합한 경우 **assignee/assignees를 변경**하고 코멘트로 사유를 기록합니다.

\`\`\`json
{
  "assignee": "{새 주 담당 에이전트명}",
  "assignees": ["{새 담당1}", "{새 담당2}"],
  "updatedAt": "...",
  "comments": [
    {
      "id": "c-{timestamp}",
      "author": "{현재 에이전트명}",
      "content": "{새 에이전트}에게 이관합니다. 사유: ...",
      "createdAt": "..."
    }
  ]
}
\`\`\`

## 서브에이전트 실행 시 이슈 처리 (필수)

서브에이전트로 실행되는 경우에도 이슈 상태 전환 규칙은 동일하게 적용됩니다.

### 서브에이전트를 호출하는 에이전트 (부모)

서브에이전트를 호출할 때 **프롬프트에 이슈 resolve 지침을 반드시 포함**합니다:

\`\`\`
- 작업 완료 후 반드시 해당 이슈 파일(issues/ISS-NNN.json)의 status를 "resolved"로 변경하고,
  comments에 작업 내역을 기록할 것
\`\`\`

### 서브에이전트로 실행되는 에이전트 (자식)

1. 할당된 이슈가 있으면 **status를 \`in-progress\`로 변경** 후 작업 시작
2. 작업 완료 후 **반드시 status를 \`resolved\`로 변경**하고 코멘트로 작업 내역 기록
3. 이슈 resolve를 완료한 뒤에 부모 에이전트에게 결과를 반환

> **핵심**: 서브에이전트는 수명이 짧으므로, 작업 완료 시 이슈 resolve를 잊기 쉽습니다.
> **결과 반환 전에 이슈 상태 전환을 먼저 수행**해야 합니다.

## 코멘트 작성 규칙

사람에게 전달할 내용이 있으면 코멘트를 추가합니다.

- **id**: \`c-{Date.now()}\` 또는 \`c-{이슈번호}-{순번}\` 형식
- **author**: 자신의 에이전트명
- **content**: 작업 결과, 질문, 참고 사항 등 (평문)
- **createdAt**: ISO 8601 형식

코멘트는 기존 comments 배열에 **추가**합니다. 기존 코멘트를 수정/삭제하지 않습니다.

## 이슈 파일 수정 방법

\`\`\`
1. 이슈 파일 읽기: issues/ISS-NNN.json
2. 필요한 필드 수정 (status, assignee, comments 등)
3. updatedAt을 현재 시간으로 갱신
4. 파일 전체를 다시 쓰기 (JSON.stringify, indent 2)
\`\`\`

> **주의**: 이슈 파일을 수정할 때 다른 필드(id, title, description, reporter, createdAt 등)를 변경하지 마세요.

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

\`\`\`
1. _index.json 읽기 → nextId 확인
2. ISS-{nextId 3자리 패딩}.json 파일 생성
3. _index.json의 nextId를 +1 증가시켜 저장
\`\`\`

필수 필드:
\`\`\`json
{
  "id": "ISS-NNN",
  "title": "이슈 제목",
  "description": "상세 설명",
  "status": "open",
  "priority": "medium",
  "type": "task",
  "assignee": "{주 담당 에이전트 또는 human}",
  "assignees": ["{담당 에이전트1}", "{담당 에이전트2}"],
  "reporter": "{자신의 에이전트명}",
  "labels": [],
  "relatedFiles": [],
  "relatedIds": [],
  "comments": [],
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
\`\`\`

> **복수 담당자**: \`assignees\` 배열로 여러 에이전트를 담당자로 지정할 수 있습니다.
> \`assignee\`는 하위 호환용으로, \`assignees[0]\`과 동일한 값을 유지합니다.

## status 설명

| status | 의미 | 전환 주체 |
|--------|------|----------|
| open | 미착수 | 생성 시 기본값 |
| in-progress | 작업 중 | 담당 에이전트가 작업 시작 시 |
| resolved | 해결됨 | 담당 에이전트가 작업 완료 시 |
| closed | 닫힘 | 사람이 resolved를 확인 후 |
| archived | 보관됨 | 사람이 Hub에서 보관 처리 시 (\`issues/archive/\`로 물리적 이동) |`

export const HUB_SKILL_TEMPLATE = `# Hub 이슈, 문서, 구조화 데이터 관리 스킬

이 스킬은 프로젝트의 이슈, 문서, 기획 구조화 데이터를 관리하는 방법을 설명합니다.

## 디렉토리 구조

\`\`\`
<project-root>/
├── issues/
│   ├── _index.json          ← 메타데이터 (nextId 카운터)
│   ├── ISS-001.json         ← 개별 이슈 파일
│   ├── ISS-002.json
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

## 이슈 생성

1. \`issues/_index.json\` 파일을 읽어 \`nextId\`를 확인합니다.
2. \`ISS-{nextId를 3자리로 패딩}.json\` 파일을 \`issues/\` 디렉토리에 생성합니다.
3. \`_index.json\`의 \`nextId\`를 +1 증가시켜 다시 저장합니다.

### _index.json 스키마

\`\`\`json
{
  "version": "1.0",
  "nextId": 1
}
\`\`\`

### 이슈 파일 스키마 (ISS-NNN.json)

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

## 이슈 수정

1. \`issues/ISS-NNN.json\` 파일을 읽습니다.
2. 필요한 필드를 수정합니다 (status, assignee, assignees 등).
3. \`updatedAt\`을 현재 ISO 8601 시간으로 갱신합니다.
4. 파일 전체를 다시 씁니다 (JSON.stringify, indent 2).

> **주의**: id, title, description, reporter, createdAt 등 원본 필드는 변경하지 마세요.

## 코멘트 추가

이슈의 \`comments\` 배열에 새 코멘트 객체를 **추가(append)**합니다. 기존 코멘트를 수정/삭제하지 않습니다.

### 코멘트 스키마

\`\`\`json
{
  "id": "c-{Date.now()}",
  "author": "에이전트명",
  "content": "코멘트 내용 (평문)",
  "createdAt": "2026-01-01T12:00:00Z"
}
\`\`\`

## 문서 생성

\`docs/\` 디렉토리에 \`.md\` 파일을 생성합니다. 반드시 YAML frontmatter를 포함합니다.

### 문서 형식

\`\`\`markdown
---
title: "문서 제목"
description: "문서 설명"
author: "작성자 에이전트명"
emoji: "📄"
type: "guide"
createdAt: "2026-01-01T00:00:00Z"
---

문서 내용을 여기에 작성합니다.
\`\`\`

- **type**: \`guide\` | \`spec\` | \`note\` | \`reference\` | \`decision\`

---

## 구조화 데이터 관리

\`data/\` 디렉토리에 프로젝트 기획 구조화 데이터를 JSON으로 생성하고 관리합니다.
Hub 대시보드가 이 파일들을 읽어 시각화합니다.

**파일이 아직 없으면 에이전트가 직접 생성합니다.** \`data/\` 디렉토리가 없으면 먼저 만드세요.

### 공통 규칙

- 모든 파일은 JSON (indent 2)
- \`version\`과 \`project\` 필드를 반드시 포함
- 수정 시 전체 파일을 다시 쓰기 (부분 패치 불가)
- 스키마를 정확히 준수해야 Hub UI가 올바르게 렌더링됩니다

---

### data/prd.json — 제품 요구사항 정의 (PRD)

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

### data/features.json — 기능 명세

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

### data/roles.json — 역할/권한 매트릭스

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

### data/userflow.json — 사용자 흐름

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
> \`featureIds\`로 features.json의 기능과 연결할 수 있습니다 (선택).

---

### 구조화 데이터 생성 가이드

기획 문서(PRD, 기능 명세 등)를 작성하라는 요청을 받으면:

1. \`data/\` 디렉토리가 없으면 생성
2. 위 스키마에 맞춰 JSON 파일을 작성
3. 프로젝트명, 버전, 날짜 등 메타데이터를 채움
4. ID 체계를 일관되게 유지 (US-01, F-01, REQ-01, NFR-P01 등)
5. 파일 간 참조를 정확히 연결 (userStories ↔ features ↔ requirements)

구조화 데이터를 수정할 때도 전체 파일을 다시 써야 합니다. 부분 패치는 지원하지 않습니다.`
