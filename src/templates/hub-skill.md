# Hub 이슈, 문서, 구조화 데이터 관리 스킬

이 스킬은 프로젝트의 이슈, 문서, 기획 구조화 데이터를 관리하는 방법을 설명합니다.

## 디렉토리 구조

```
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
```

## 이슈 생성

1. `issues/_index.json` 파일을 읽어 `nextId`를 확인합니다.
2. `ISS-{nextId를 3자리로 패딩}.json` 파일을 `issues/` 디렉토리에 생성합니다.
3. `_index.json`의 `nextId`를 +1 증가시켜 다시 저장합니다.

### _index.json 스키마

```json
{
  "version": "1.0",
  "nextId": 1
}
```

### 이슈 파일 스키마 (ISS-NNN.json)

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

- **status**: `open` | `in-progress` | `resolved` | `closed` | `archived`
- **priority**: `low` | `medium` | `high` | `critical`
- **type**: `task` | `bug` | `feature` | `question` | `decision`

## 이슈 수정

1. `issues/ISS-NNN.json` 파일을 읽습니다.
2. 필요한 필드를 수정합니다 (status, assignee, assignees 등).
3. `updatedAt`을 현재 ISO 8601 시간으로 갱신합니다.
4. 파일 전체를 다시 씁니다 (JSON.stringify, indent 2).

> **주의**: id, title, description, reporter, createdAt 등 원본 필드는 변경하지 마세요.

## 코멘트 추가

이슈의 `comments` 배열에 새 코멘트 객체를 **추가(append)**합니다. 기존 코멘트를 수정/삭제하지 않습니다.

### 코멘트 스키마

```json
{
  "id": "c-{Date.now()}",
  "author": "에이전트명",
  "content": "코멘트 내용 (평문)",
  "createdAt": "2026-01-01T12:00:00Z"
}
```

## 문서 생성

`docs/` 디렉토리에 `.md` 파일을 생성합니다. 반드시 YAML frontmatter를 포함합니다.

### 문서 형식

```markdown
---
title: "문서 제목"
description: "문서 설명"
author: "작성자 에이전트명"
emoji: "📄"
type: "guide"
createdAt: "2026-01-01T00:00:00Z"
---

문서 내용을 여기에 작성합니다.
```

- **type**: `guide` | `spec` | `note` | `reference` | `decision`

---

## 구조화 데이터 관리

`data/` 디렉토리에 프로젝트 기획 구조화 데이터를 JSON으로 생성하고 관리합니다.
Hub 대시보드가 이 파일들을 읽어 시각화합니다.

**파일이 아직 없으면 에이전트가 직접 생성합니다.** `data/` 디렉토리가 없으면 먼저 만드세요.

### 공통 규칙

- 모든 파일은 JSON (indent 2)
- `version`과 `project` 필드를 반드시 포함
- 수정 시 전체 파일을 다시 쓰기 (부분 패치 불가)
- 스키마를 정확히 준수해야 Hub UI가 올바르게 렌더링됩니다

---

### data/prd.json — 제품 요구사항 정의 (PRD)

```json
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
```

> `progress`는 0-100 정수로, 전체 기획 진행률을 나타냅니다.

---

### data/features.json — 기능 명세

```json
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
```

> `requirementId`로 기능과 요구사항을 연결합니다. `parentId`로 기능의 계층 구조를 표현합니다.

---

### data/roles.json — 역할/권한 매트릭스

```json
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
```

> `scopeHierarchy`와 `scopeNotes`는 선택적 필드입니다. `roles`의 `level`이 낮을수록 상위 권한입니다.

---

### data/userflow.json — 사용자 흐름

```json
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
```

> 노드 type: `start`(시작점), `section`(섹션 그룹), `page`(화면), `action`(사용자 행동).
> `featureIds`로 features.json의 기능과 연결할 수 있습니다 (선택).

---

### 구조화 데이터 생성 가이드

기획 문서(PRD, 기능 명세 등)를 작성하라는 요청을 받으면:

1. `data/` 디렉토리가 없으면 생성
2. 위 스키마에 맞춰 JSON 파일을 작성
3. 프로젝트명, 버전, 날짜 등 메타데이터를 채움
4. ID 체계를 일관되게 유지 (US-01, F-01, REQ-01, NFR-P01 등)
5. 파일 간 참조를 정확히 연결 (userStories ↔ features ↔ requirements)

구조화 데이터를 수정할 때도 전체 파일을 다시 써야 합니다. 부분 패치는 지원하지 않습니다.
