---
name: hub-issue-tracker
description: "프로젝트 내 코드 변경, 버그 수정, 기능 구현, 리팩토링, 설정 변경 등 실질적인 작업 요청 시 이슈를 생성하고 라이프사이클을 관리합니다. 사용자가 명시적으로 이슈를 언급하지 않더라도, 파일 수정이 수반되는 작업이라면 반드시 이 스킬을 사용하세요. 이슈 목록 조회, 단순 질문, 코드 설명 등 정보 확인만 하는 경우에는 트리거하지 않습니다. 이 스킬은 이슈 조회/관리 요청(이슈 목록, 이슈 상태 확인, 이슈 검색)에서도 사용합니다."
---

# 이슈 관리 가드레일

이 스킬은 에이전트가 작업을 시작하기 전에 이슈를 생성하고, 작업 중/완료 시 이슈 상태를 관리하는 가드레일입니다.

## 왜 이슈를 만들어야 하는가

이슈는 단순한 기록이 아닙니다. Hub 대시보드에서 프로젝트 전체 상태를 시각화하는 데이터 소스입니다.
이슈 없이 진행된 작업은 프로젝트 히스토리에서 보이지 않으며, 다른 에이전트나 사람이 무엇이 변경되었는지 파악할 수 없습니다.
이슈를 만드는 데 30초가 걸리지 않지만, 이슈 없이 진행된 작업을 사후에 추적하는 데는 몇 배의 시간이 듭니다.

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
