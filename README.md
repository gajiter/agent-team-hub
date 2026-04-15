# Agent Team Hub

**사람과 AI 에이전트가 함께 일하기 위한 로컬 프로젝트 관리 도구**

![기능 명세 관리](public/screenshots/features-plan.png)
![이슈 트래킹](public/screenshots/issues.png)

## 왜 만들었는가

Claude Code로 프로덕트를 만들다 보면 한 가지 근본적인 한계에 부딪힙니다. **Context Window**입니다. 기획, 설계, 개발을 하나의 세션에서 처리하려 하면 맥락이 희석되고 산출물의 품질이 떨어집니다.

사람 조직에서 PM, 설계자, 개발자가 역할을 나누듯, AI 에이전트도 전문화된 분업이 필요합니다. 그런데 에이전트끼리는 대화할 수 없습니다. 그래서 **파일**이 공용어가 됩니다. 기획 문서, 기능 명세, 이슈 — 모두 프로젝트 디렉토리 안의 JSON과 Markdown 파일로 존재하고, 어떤 에이전트든 읽고 쓸 수 있습니다.

Agent Team Hub는 이 파일들을 **사람이 시각적으로 확인하고 검수할 수 있도록** 만든 도구입니다.

## 핵심 아이디어

### 에이전트 간 협업 문제를 파일로 해결한다

현재 AI 에이전트 생태계의 가장 큰 병목은 **에이전트 간 통신**입니다. MCP, A2A 같은 프로토콜이 등장하고 있지만, 아직 성숙하지 않았고, 무엇보다 **토큰 비용**이 발생합니다. 에이전트가 다른 에이전트에게 맥락을 전달하려면 API를 호출해야 하고, 그때마다 입출력 토큰이 소모됩니다.

Agent Team Hub는 이 문제를 가장 원시적이면서도 효과적인 방법으로 해결합니다: **로컬 파일 시스템**. PRD를 `data/prd.json`에 쓰면, 기능 명세를 작성하는 에이전트는 그 파일을 읽기만 하면 됩니다. 이슈를 `issues/ISS-001.json`에 만들면, 개발 에이전트는 그 파일을 열어 작업 지시를 받습니다. API 호출도, 토큰 소모도, 네트워크 의존도 없습니다.

이것은 단순한 구현 편의가 아닙니다. **아키텍처 결정**입니다:

- **토큰 비용 제로** — 에이전트 간 정보 교환에 API 호출이 필요 없습니다
- **보안** — 기획 문서, 이슈, 에이전트 정의가 로컬 파일 시스템 밖으로 나가지 않습니다
- **Git 호환** — 모든 변경이 diff로 추적됩니다. 에이전트가 PRD를 수정하면, 사람은 `git diff`로 무엇이 바뀌었는지 정확히 확인할 수 있습니다
- **AI 최적화** — JSON은 AI가 가장 정확하게 파싱하고 생성할 수 있는 구조화된 포맷입니다

### 사람은 설계하고 검수한다, 만드는 것은 AI가 한다

AI가 코드를 작성하는 시대에 개발자의 역할은 바뀌고 있습니다. "직접 만드는 사람"에서 **"설계하고 검수하는 사람"**으로. Agent Team Hub는 이 새로운 역할 분담을 전제로 설계되었습니다.

**사람이 하는 일:**
- 프로젝트의 방향과 우선순위를 결정한다
- 에이전트가 만든 PRD, 기능 명세, 코드를 리뷰한다
- 이슈를 생성하고, 적절한 에이전트에게 할당한다
- 에이전트의 산출물이 의도에 맞는지 확인한다

**AI 에이전트가 하는 일:**
- 할당된 이슈를 확인하고 작업을 수행한다
- PRD, 기능 명세, 유저 플로우 등 구조화된 문서를 생성한다
- 작업 진행 상황을 이슈 코멘트로 보고한다
- 완료되면 이슈 상태를 업데이트한다

Agent Team Hub는 이 사이클의 **시각화 계층**입니다. 에이전트가 파일로 남긴 작업 결과를 사람이 직관적으로 파악할 수 있는 인터페이스를 제공합니다.

### Claude Code를 대체하지 않고 보완한다

Agent Team Hub는 에이전트를 직접 호출하거나 코드를 생성하지 않습니다. Claude Code가 하는 일을 대체하려는 도구가 아닙니다. 오히려 Claude Code를 **더 효과적으로 사용하기 위한 보조 도구**입니다.

프로젝트를 초기화하면 Claude Code가 이해할 수 있는 스킬, 워크플로우 규칙, CLI 도구가 자동으로 설치됩니다. 에이전트는 이 도구들을 사용해 이슈를 관리하고, Hub는 그 결과를 시각화합니다.

## 시스템 구조

### 데이터 레이어: 파일이 곧 데이터베이스

Agent Team Hub에는 별도의 데이터베이스가 없습니다. 모든 데이터는 프로젝트 디렉토리 안의 파일로 저장됩니다.

```
your-project/
├── .hub/
│   └── config.json              # 프로젝트 초기화 상태
├── issues/
│   ├── _index.json              # 이슈 ID 카운터
│   ├── ISS-001.json             # 개별 이슈 데이터
│   ├── ISS-002.json
│   └── archive/                 # 아카이브된 이슈
│       └── ISS-003.json
├── data/
│   ├── prd.json                 # PRD (제품 요구사항 문서)
│   ├── features.json            # 기능 명세 및 요구사항
│   └── userflow.json            # 유저 플로우 다이어그램 데이터
├── docs/
│   └── *.md                     # 프로젝트 문서 (자동 인덱싱)
└── .claude/
    ├── agents/                  # 에이전트 정의 파일
    │   ├── planner.md
    │   └── developer.md
    ├── rules/
    │   └── hub-workflow.md      # 에이전트 워크플로우 규칙
    └── skills/hub/
        ├── SKILL.md             # Claude Code 스킬 정의
        ├── scripts/
        │   └── issue-cli.js     # 이슈 관리 CLI 도구
        └── references/
            └── schemas.md       # JSON 스키마 레퍼런스
```

#### 동시성 제어: 파일 기반 락 시스템

여러 에이전트가 동시에 같은 이슈를 수정하는 것을 방지하기 위해 **파일 기반 락 메커니즘**을 사용합니다.

- 이슈 수정 시 `.json.lock` 파일이 생성됩니다 (10초 TTL)
- 락 획득 실패 시 최대 5회 지수 백오프 재시도
- TTL이 만료된 스테일 락은 자동으로 제거됩니다
- Hub UI에서 현재 락 상태를 실시간으로 확인할 수 있습니다

#### 실시간 동기화: 핑거프린트 기반 폴링

에이전트가 파일을 수정하면 Hub에 즉시 반영되어야 합니다. WebSocket 없이 이를 달성하기 위해 **핑거프린트 기반 폴링**을 사용합니다.

1. 3초마다 모든 이슈의 경량 요약(`id`, `updatedAt`, `status`, `commentsCount`)을 가져옵니다
2. 이 요약을 해시하여 핑거프린트를 생성합니다
3. 이전 핑거프린트와 다를 때만 전체 이슈 데이터를 다시 로드합니다

이 방식으로 불필요한 I/O를 최소화하면서도 에이전트의 변경사항을 거의 실시간으로 감지합니다.

### 스토리지 추상화: 브라우저와 서버 양쪽 지원

Agent Team Hub는 두 가지 모드로 동작할 수 있습니다:

| | 브라우저 모드 | 서버 모드 |
|---|---|---|
| **스토리지** | File System Access API | Node.js `fs/promises` |
| **설정 저장** | IndexedDB | `~/.agent-team-hub/config.json` |
| **네트워크** | 불필요 | localhost |
| **적합한 경우** | 완전한 오프라인 사용 | 개발 환경에서의 일반적 사용 |

두 모드 모두 동일한 `StorageProvider` 인터페이스를 구현하므로, 어떤 모드에서든 동일한 사용자 경험을 제공합니다.

## 주요 기능

### 대시보드

프로젝트의 전체 현황을 한 화면에서 파악합니다.

- **데이터 파일 현황** — PRD, Features, Userflow 파일의 존재 여부와 상태
- **산출물 패널** — 기획 문서들의 완성도와 최근 문서 목록
- **활성 이슈** — 최근 업데이트된 이슈 5건을 우선 표시
- **에이전트 팀** — 각 에이전트의 정보와 현재 할당된 이슈 수
- **원클릭 초기화** — 프로젝트가 아직 초기화되지 않았다면 버튼 하나로 셋업

### 이슈 트래킹

에이전트와 사람 사이의 작업 단위를 관리합니다.

- **상태 관리** — `open` → `in-progress` → `resolved` → `closed` 워크플로우
- **5가지 이슈 유형** — task, bug, feature, question, decision
- **4단계 우선순위** — critical, high, medium, low
- **멀티 담당자** — 하나의 이슈에 여러 에이전트/사람을 할당
- **코멘트** — 에이전트가 작업 진행 상황을 보고하거나 사람이 피드백을 남김
- **관련 파일** — 이슈와 연관된 소스 파일 경로를 기록
- **교차 참조** — 다른 이슈나 기능 명세와의 연결
- **일괄 작업** — 멀티 셀렉트 모드에서 여러 이슈를 한번에 아카이브/삭제
- **아카이브** — 완료된 이슈를 별도 보관, 필요시 복원 가능
- **실시간 동기화** — 에이전트가 CLI로 이슈를 수정하면 3초 이내에 UI에 반영

### 기획 문서 (Planning)

구조화된 JSON 기반의 기획 산출물을 시각적으로 탐색합니다.

#### PRD (Product Requirements Document)

`data/prd.json`에 저장된 제품 요구사항 문서를 시각화합니다. 에이전트가 작성한 PRD를 사람이 검토하기 위한 뷰입니다.

- **비전** — 프로젝트의 한 줄 요약, 목표, 배경
- **핵심 가치** — 제품이 추구하는 가치와 원칙
- **타겟 사용자** — 사용자 유형, 페르소나, 시나리오
- **유저 스토리** — BDD 스타일의 수용 기준을 포함한 스토리 목록, 역할별 필터링
- **비기능 요구사항** — 성능, 보안, 배포, 데이터 관리
- **MVP 범위** — 포함/제외 항목 정의
- **로드맵** — 단계별 출시 계획
- **KPI** — 운영, 사용성, 비즈니스 지표
- **제약 조건 & 미결 사항** — 기술적/비즈니스 제약과 아직 결정되지 않은 항목

#### 기능 명세 (Features)

`data/features.json`에 저장된 기능 명세와 요구사항을 탐색합니다.

- **트리 뷰** — 부모-자식 관계를 반영한 계층적 기능 구조
- **디렉토리 뷰** — 파일 브라우저 스타일의 플랫 목록
- **요구사항** — tenant, admin, platform 그룹별 요구사항 관리
- **기능 상세** — 유저 스토리, 수용 기준, 의존성, 연관 화면
- **단계별 계획** — phase 기반의 점진적 출시 계획
- **관계 시각화** — 기능 간 의존/확장 관계

#### 유저 플로우 (User Flow)

`data/userflow.json`에 저장된 사용자 여정을 인터랙티브 다이어그램으로 시각화합니다.

- **노드 타입** — start(시작), section(섹션), page(페이지), action(액션)
- **줌/팬** — 복잡한 플로우를 자유롭게 탐색
- **섹션 분리** — 사용자 여정별로 독립된 다이어그램
- **컬러 코드 범례** — 노드 유형별 색상 구분

### 문서 브라우저

`docs/` 디렉토리 아래의 Markdown 문서를 자동으로 인덱싱하고 탐색합니다.

- **자동 발견** — `docs/` 하위의 모든 `.md` 파일을 재귀적으로 스캔
- **메타데이터 추출** — YAML 프론트매터에서 제목, 설명, 작성자, 이모지 추출
- **카테고리 분류** — 서브디렉토리 구조를 기반으로 자동 그룹핑
- **목차 생성** — Markdown 헤딩에서 자동으로 Table of Contents 생성
- **토큰 추정** — 각 문서의 예상 토큰 수를 표시 (에이전트 컨텍스트 관리에 유용)

### 에이전트 팀 관리

AI 에이전트를 정의하고 역할을 부여합니다.

각 에이전트는 `.claude/agents/` 디렉토리에 YAML 프론트매터를 가진 Markdown 파일로 저장됩니다:

```markdown
---
name: Planner
description: PRD와 기능 명세를 작성하는 기획 에이전트
model: claude-opus-4
color: blue
emoji: 📋
role: Planner
responsibilities:
  - PRD 작성 및 업데이트
  - 기능 명세 구조화
  - 유저 스토리 검증
---

# Planner Agent

이 에이전트의 상세 지침과 가이드라인...
```

- **에이전트 카드** — 이모지, 이름, 역할, 설명을 한눈에 파악
- **생성/수정** — Hub UI에서 직접 에이전트를 추가하거나 설정을 변경
- **이슈 연동** — 각 에이전트에 현재 할당된 이슈 수를 대시보드에서 확인
- **모델 설정** — 에이전트별로 사용할 Claude 모델을 지정 가능

## Claude Code 연동

프로젝트를 초기화하면 Claude Code가 Agent Team Hub와 자연스럽게 협업할 수 있도록 다음 파일들이 자동 생성됩니다:

### 스킬 정의 (`.claude/skills/hub/SKILL.md`)

Claude Code에게 Hub의 데이터 스키마와 사용 방법을 알려주는 스킬 파일입니다. PRD, Features, Userflow의 JSON 스키마 정의와 CLI 명령어 레퍼런스를 포함합니다.

### 이슈 CLI (`.claude/skills/hub/scripts/issue-cli.js`)

에이전트가 터미널에서 이슈를 관리할 수 있는 Node.js CLI 도구입니다:

```bash
# 이슈 생성
node .claude/skills/hub/scripts/issue-cli.js create --title "로그인 기능 구현" --type task --assignee developer

# 상태 변경
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --status in-progress

# 코멘트 추가
node .claude/skills/hub/scripts/issue-cli.js comment ISS-001 --author planner --content "PRD 작성 완료, 리뷰 필요"

# 완료 처리
node .claude/skills/hub/scripts/issue-cli.js update ISS-001 --status resolved
```

### 워크플로우 규칙 (`.claude/rules/hub-workflow.md`)

에이전트의 작업 방식을 규정하는 규칙 파일입니다:
- 작업 시작 전 반드시 할당된 이슈 확인
- 이슈 상태 전이 규칙 (`open` → `in-progress` → `resolved`)
- 서브에이전트 조율 패턴
- 코멘트 작성 컨벤션

## 일반적인 워크플로우

### 1. 프로젝트 셋업

```bash
# Hub 실행
git clone https://github.com/calvinsnax/agent-team-hub.git
cd agent-team-hub
npm install
npm run dev
```

http://localhost:3100 에서 접속 → Settings → 프로젝트 폴더 추가 → "Initialize Project" 체크

### 2. 에이전트 팀 구성

Hub UI에서 에이전트를 정의합니다. 예를 들어:
- **Planner** — PRD, 기능 명세, 유저 플로우 작성
- **Developer** — 코드 구현, 버그 수정
- **Reviewer** — 코드 리뷰, 품질 검증

### 3. 기획 → 구현 사이클

```
사람: 이슈 생성 ("로그인 시스템 PRD 작성")
  → Planner 에이전트에 할당

Planner: 이슈 확인 → data/prd.json 작성 → 이슈에 코멘트 → 상태를 resolved로 변경

사람: Hub에서 PRD 리뷰 → 피드백 이슈 생성 또는 승인

사람: 구현 이슈 생성 ("로그인 기능 구현")
  → Developer 에이전트에 할당

Developer: 이슈 확인 → features.json 참조 → 코드 작성 → 상태를 resolved로 변경

사람: 코드 리뷰 → 완료 또는 수정 요청
```

### 4. 일상적 사용

- **아침** — 대시보드에서 프로젝트 현황 파악, 미결 이슈 확인
- **작업 중** — 에이전트에게 이슈를 할당하고 진행 상황을 모니터링
- **리뷰** — 에이전트의 산출물(PRD, 코드, 문서)을 확인하고 피드백

## 기술 스택

- **프레임워크** — Next.js 16, React 19, TypeScript 5
- **UI** — shadcn/ui (Radix UI), Tailwind CSS
- **마크다운** — react-markdown, remark-gfm, remark-cjk-friendly
- **다이어그램** — Mermaid, react-zoom-pan-pinch
- **스토리지** — File System Access API (브라우저) / `fs/promises` (서버)
- **국제화** — 한국어, 영어 지원

## 라이선스

[MIT](LICENSE)
