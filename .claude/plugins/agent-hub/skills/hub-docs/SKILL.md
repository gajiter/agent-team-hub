---
name: hub-docs
description: "PRD 작성, 기능 명세, 유저 플로우, 구조화 데이터 생성 등 기획 산출물을 작성할 때 사용합니다. '문서 작성', 'PRD 만들어', '기능 명세 작성', '유저 플로우', 'data/ 파일 생성' 등의 요청 시 반드시 이 스킬을 사용하세요."
---

# 문서 및 구조화 데이터 관리

프로젝트의 기획 산출물(PRD, 기능 명세, 유저 플로우)을 구조화 데이터로 생성하고, 문서를 작성하는 스킬입니다.

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
| `data/userflow.json` | 사용자 흐름 정의 |

### 공통 규칙

- 모든 파일은 JSON (indent 2)
- `version`과 `project` 필드를 반드시 포함
- 수정 시 전체 파일을 다시 쓰기 (부분 패치 불가)
- 스키마를 정확히 준수해야 Hub UI가 올바르게 렌더링됨

## 상세 스키마

각 데이터 파일의 전체 JSON 스키마는 `references/schemas.md`를 참조하세요.
