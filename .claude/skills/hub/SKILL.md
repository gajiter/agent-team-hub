---
name: hub
description: This skill should be used when the user asks to "이슈 생성", "이슈 만들어", "문서 작성", "PRD 작성", "기능 명세", "역할 권한", "유저 플로우", "구조화 데이터", "data/ 파일 생성", or mentions issue management, document creation, or structured data schemas for the Hub project.
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
│   ├── roles.json           ← 역할/권한 매트릭스
│   └── userflow.json        ← 사용자 흐름 정의
└── .hub/
    └── config.json          ← 허브 설정
```

## 이슈 관리

### 이슈 생성

1. `issues/_index.json` 파일을 읽어 `nextId` 확인
2. `ISS-{nextId를 3자리로 패딩}.json` 파일을 `issues/`에 생성
3. `_index.json`의 `nextId`를 +1 증가시켜 저장

### _index.json 스키마

```json
{
  "version": "1.0",
  "nextId": 1
}
```

### 이슈 파일 필수 필드

| 필드 | 값 |
|------|-----|
| id | `ISS-NNN` |
| title | 이슈 제목 |
| description | 상세 설명 |
| status | `open` \| `in-progress` \| `resolved` \| `closed` \| `archived` |
| priority | `low` \| `medium` \| `high` \| `critical` |
| type | `task` \| `bug` \| `feature` \| `question` \| `decision` |
| assignee | 주 담당 에이전트명 |
| assignees | 담당 에이전트 배열 |
| reporter | 생성자 에이전트명 |
| labels, relatedFiles, relatedIds, comments | 빈 배열 `[]` |
| createdAt, updatedAt | ISO 8601 |

### 이슈 수정

1. `issues/ISS-NNN.json` 파일 읽기
2. 필요한 필드 수정 (status, assignee, comments 등)
3. `updatedAt`을 현재 ISO 8601 시간으로 갱신
4. 파일 전체를 다시 쓰기 (JSON.stringify, indent 2)

> id, title, description, reporter, createdAt 등 원본 필드는 변경하지 말 것.

### 코멘트 추가

이슈의 `comments` 배열에 새 코멘트 객체를 **append**. 기존 코멘트를 수정/삭제하지 않음.

```json
{
  "id": "c-{Date.now()}",
  "author": "에이전트명",
  "content": "코멘트 내용 (평문)",
  "createdAt": "ISO 8601"
}
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

- **`references/schemas.md`** — 이슈 파일, PRD, 기능 명세, 역할/권한, 유저 플로우의 전체 JSON 스키마
