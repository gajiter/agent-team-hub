# Hub 이슈 및 문서 관리 스킬

이 스킬은 프로젝트의 이슈, 문서, 기획 데이터를 관리하는 방법을 설명합니다.

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
├── data/
│   ├── prd.json             ← 제품 요구사항 정의
│   ├── features.json        ← 기능 목록
│   ├── roles.json           ← 에이전트 역할 정의
│   └── userflow.json        ← 사용자 흐름
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

## 기획 데이터 읽기

`data/` 디렉토리의 JSON 파일에서 프로젝트 기획 데이터를 읽을 수 있습니다.

| 파일 | 설명 |
|------|------|
| `data/prd.json` | 제품 요구사항 정의 (PRD) |
| `data/features.json` | 기능 목록 및 상세 |
| `data/roles.json` | 에이전트 역할 및 담당 영역 |
| `data/userflow.json` | 사용자 흐름 정의 |

이 파일들은 읽기 전용으로 취급합니다. 수정이 필요한 경우 이슈를 생성하여 요청합니다.
