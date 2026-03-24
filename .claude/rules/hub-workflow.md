# 이슈 워크플로우 규칙

AI 에이전트가 이슈를 처리할 때 따르는 규칙입니다.

**이슈 관리 시스템은 에이전트의 주요 태스크 관리 도구입니다.** 모든 업무는 이슈를 통해 추적합니다.

## 이슈 저장소 구조

```
issues/
├── _index.json          ← 메타데이터 + nextId 카운터
├── ISS-001.json         ← 개별 이슈 파일
├── ISS-002.json
├── archive/             ← 보관된 이슈
└── ...
```

각 이슈 파일은 독립적인 JSON 파일이므로 개별 읽기/쓰기가 가능합니다.

## 세션 시작 시 — 할당 이슈 확인

세션 시작 시 `issues/` 디렉토리의 파일을 읽어 자신에게 할당된 이슈를 확인합니다.

```
1. issues/ 내 ISS-*.json 파일 목록 조회
2. 각 파일에서 assignee 또는 assignees 배열에 자신의 에이전트명이 포함된 이슈 필터링
3. status가 "open" 또는 "in-progress"인 이슈를 활성 이슈로 파악
```

특정 이슈 작업을 지시받은 경우 해당 이슈를 우선 처리합니다.

## 이슈 기반 업무 원칙 (필수)

**모든 업무는 이슈로 추적합니다.** 업무의 출처에 따라 다음과 같이 처리합니다:

| 업무 출처 | 처리 방법 |
|----------|----------|
| 기존 이슈 할당 | 해당 이슈를 `in-progress`로 변경 후 작업 |
| 사람(채팅)의 직접 지시 | 이슈를 새로 생성(assignee: 자신)한 뒤 작업 시작 |
| 자발적 업무 발견 | 이슈를 새로 생성(assignee: 자신)한 뒤 작업 시작 |
| 다른 에이전트에 요청 | 이슈를 새로 생성(assignee: 대상 에이전트)하여 전달 |

> **핵심**: 이슈 없이 진행되는 업무가 없어야 합니다. 이슈가 없으면 먼저 만들고 시작합니다.

## 이슈 상태 전환 규칙

### 작업 시작 시

이슈 작업을 시작할 때 **status를 `in-progress`로 변경**합니다.

```json
{
  "status": "in-progress",
  "updatedAt": "<현재 ISO 8601 시간>"
}
```

### 작업 완료 시

이슈를 해결했을 때 **status를 `resolved`로 변경**하고, **코멘트로 작업 내역을 기록**합니다.

```json
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
```

### 담당자 변경 시

자신이 처리할 수 없거나 다른 에이전트가 적합한 경우 **assignee/assignees를 변경**하고 코멘트로 사유를 기록합니다.

```json
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
```

## 서브에이전트 실행 시 이슈 처리 (필수)

서브에이전트로 실행되는 경우에도 이슈 상태 전환 규칙은 동일하게 적용됩니다.

### 서브에이전트를 호출하는 에이전트 (부모)

서브에이전트를 호출할 때 **프롬프트에 이슈 resolve 지침을 반드시 포함**합니다:

```
- 작업 완료 후 반드시 해당 이슈 파일(issues/ISS-NNN.json)의 status를 "resolved"로 변경하고,
  comments에 작업 내역을 기록할 것
```

### 서브에이전트로 실행되는 에이전트 (자식)

1. 할당된 이슈가 있으면 **status를 `in-progress`로 변경** 후 작업 시작
2. 작업 완료 후 **반드시 status를 `resolved`로 변경**하고 코멘트로 작업 내역 기록
3. 이슈 resolve를 완료한 뒤에 부모 에이전트에게 결과를 반환

> **핵심**: 서브에이전트는 수명이 짧으므로, 작업 완료 시 이슈 resolve를 잊기 쉽습니다.
> **결과 반환 전에 이슈 상태 전환을 먼저 수행**해야 합니다.

## 코멘트 작성 규칙

사람에게 전달할 내용이 있으면 코멘트를 추가합니다.

- **id**: `c-{Date.now()}` 또는 `c-{이슈번호}-{순번}` 형식
- **author**: 자신의 에이전트명
- **content**: 작업 결과, 질문, 참고 사항 등 (평문)
- **createdAt**: ISO 8601 형식

코멘트는 기존 comments 배열에 **추가**합니다. 기존 코멘트를 수정/삭제하지 않습니다.

## 이슈 파일 수정 방법

```
1. 이슈 파일 읽기: issues/ISS-NNN.json
2. 필요한 필드 수정 (status, assignee, comments 등)
3. updatedAt을 현재 시간으로 갱신
4. 파일 전체를 다시 쓰기 (JSON.stringify, indent 2)
```

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

```
1. _index.json 읽기 → nextId 확인
2. ISS-{nextId 3자리 패딩}.json 파일 생성
3. _index.json의 nextId를 +1 증가시켜 저장
```

필수 필드:
```json
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
```

> **복수 담당자**: `assignees` 배열로 여러 에이전트를 담당자로 지정할 수 있습니다.
> `assignee`는 하위 호환용으로, `assignees[0]`과 동일한 값을 유지합니다.

## status 설명

| status | 의미 | 전환 주체 |
|--------|------|----------|
| open | 미착수 | 생성 시 기본값 |
| in-progress | 작업 중 | 담당 에이전트가 작업 시작 시 |
| resolved | 해결됨 | 담당 에이전트가 작업 완료 시 |
| closed | 닫힘 | 사람이 resolved를 확인 후 |
| archived | 보관됨 | 사람이 Hub에서 보관 처리 시 (`issues/archive/`로 물리적 이동) |
