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

## 이슈 CLI 도구

> **중요:** 이슈 파일(JSON)을 직접 Edit/Write하지 마세요. 반드시 CLI를 사용하세요.

모든 이슈 관리는 `node .claude/skills/hub/scripts/issue-cli.js` 를 Bash 도구로 실행합니다.
CLI가 ID 채번, 타임스탬프 생성, 필수 필드 보장, 불변 필드 보호를 자동 처리합니다.

## 이슈 상태 전환 규칙

### 작업 시작 시

```bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status in-progress
```

### 작업 완료 시

```bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status resolved
node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {에이전트명} --content "작업 내역 요약"
```

### 담당자 변경 시

```bash
node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --assignee {새 담당자} --assignees "{담당1},{담당2}"
node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {현재 에이전트명} --content "{새 에이전트}에게 이관합니다. 사유: ..."
```

## 서브에이전트 실행 시 이슈 처리 (필수)

서브에이전트로 실행되는 경우에도 이슈 상태 전환 규칙은 동일하게 적용됩니다.

### 서브에이전트를 호출하는 에이전트 (부모)

서브에이전트를 호출할 때 **프롬프트에 이슈 resolve 지침을 반드시 포함**합니다:

```
- 작업 완료 후 반드시 CLI로 이슈를 resolve할 것:
  node .claude/skills/hub/scripts/issue-cli.js update ISS-NNN --status resolved
  node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {에이전트명} --content "작업 내역"
```

### 서브에이전트로 실행되는 에이전트 (자식)

1. 할당된 이슈가 있으면 CLI로 **status를 `in-progress`로 변경** 후 작업 시작
2. 작업 완료 후 CLI로 **반드시 status를 `resolved`로 변경**하고 코멘트로 작업 내역 기록
3. 이슈 resolve를 완료한 뒤에 부모 에이전트에게 결과를 반환

> **핵심**: 서브에이전트는 수명이 짧으므로, 작업 완료 시 이슈 resolve를 잊기 쉽습니다.
> **결과 반환 전에 이슈 상태 전환을 먼저 수행**해야 합니다.

## 코멘트 작성 규칙

사람에게 전달할 내용이 있으면 CLI로 코멘트를 추가합니다.

```bash
node .claude/skills/hub/scripts/issue-cli.js comment ISS-NNN --author {에이전트명} --content "작업 결과, 질문, 참고 사항 등"
```

- 코멘트 ID(`c-{timestamp}`)와 `createdAt`은 CLI가 자동 생성
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

```bash
node .claude/skills/hub/scripts/issue-cli.js create \
  --title "이슈 제목" \
  --type task \
  --priority medium \
  --description "상세 설명" \
  --assignee {담당 에이전트} \
  --reporter {자신의 에이전트명} \
  --labels "label1,label2" \
  --relatedFiles "src/foo.tsx" \
  --relatedIds "ISS-001"
```

- `--title`과 `--type`은 필수, 나머지는 선택
- ID 채번(`ISS-NNN`), `createdAt`, `updatedAt`은 CLI가 자동 생성
- 배열 필드(`assignees`, `labels`, `relatedFiles`, `relatedIds`)는 쉼표로 구분

> **복수 담당자**: `--assignees "에이전트1,에이전트2"` 로 여러 에이전트를 지정할 수 있습니다.

## status 설명

| status | 의미 | 전환 주체 |
|--------|------|----------|
| open | 미착수 | 생성 시 기본값 |
| in-progress | 작업 중 | 담당 에이전트가 작업 시작 시 |
| resolved | 해결됨 | 담당 에이전트가 작업 완료 시 |
| closed | 닫힘 | 사람이 resolved를 확인 후 |
| archived | 보관됨 | 사람이 Hub에서 보관 처리 시 (`issues/archive/`로 물리적 이동) |
