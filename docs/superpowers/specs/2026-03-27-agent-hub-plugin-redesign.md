# agent-hub 플러그인 재설계

## 배경

현재 hub 연동이 3곳에 분산되어 있다:
1. `CLAUDE.md` — `<!-- agent-team-hub:start/end -->` 주입 섹션
2. `.claude/rules/hub-workflow.md` — 194줄짜리 워크플로우 규칙
3. `.claude/skills/hub/` — 스킬 본체

이렇게 된 이유는 스킬만으로는 에이전트가 이슈 관리를 자발적으로 하지 않았기 때문이었다. 하지만 이는 스킬의 완성도 문제이므로, 잘 설계된 스킬이라면 CLAUDE.md 주입이나 별도 규칙 파일 없이도 에이전트가 이슈를 철저히 관리할 수 있어야 한다.

## 목표

- CLAUDE.md 주입, rules 파일 등 외부 보조 장치를 **모두 제거**
- **스킬만으로** 에이전트가 이슈 관리를 인식하고 수행하도록 함
- 이슈 관리와 문서/데이터 관리를 분리하여 각각의 트리거가 명확하도록 함

## 설계

### 플러그인 구조

```
.claude/plugins/agent-hub/
├── skills/
│   ├── hub-issue-tracker/
│   │   ├── SKILL.md                  ← 이슈 관리 가드레일 스킬
│   │   ├── scripts/
│   │   │   └── issue-cli.js          ← 이슈 CRUD CLI
│   │   └── references/
│   │       └── issue-schema.md       ← 이슈 JSON 스키마
│   └── hub-docs/
│       ├── SKILL.md                  ← 문서/구조화 데이터 생성 스킬
│       └── references/
│           └── schemas.md            ← 문서/데이터 JSON 스키마 (PRD, features, roles, userflow)
└── README.md
```

### 스킬 1: hub-issue-tracker

**역할:** 가드레일 패턴. 코드 변경이 수반되는 작업 요청 시 자동 트리거되어, 이슈 필요 여부를 판단하고 라이프사이클을 관리.

**트리거 description:**
> 프로젝트 내 코드 변경, 버그 수정, 기능 구현, 리팩토링 등 실질적인 작업 요청 시 이슈를 생성하고 라이프사이클을 관리합니다. 사용자가 명시적으로 이슈를 언급하지 않더라도, 코드 수정이 수반되는 작업이라면 반드시 이 스킬을 사용하세요. 단순 질문, 코드 설명, 이슈 조회 등 정보 확인만 하는 경우에는 트리거하지 않습니다.

**의사결정 트리:**

```
사용자 요청 수신
  │
  ├─ [이슈 불필요] → 바로 진행
  │   ├─ 단순 질문/설명 요청 ("이 코드 뭐야?", "이 함수 설명해줘")
  │   ├─ 이슈 자체 조회/관리 ("이슈 목록 보여줘", "ISS-003 상태 알려줘")
  │   └─ 대화/인사/설정 변경/정보 확인
  │
  ├─ [이슈 필요] → 이슈 생성 후 작업
  │   ├─ 코드 수정이 수반되는 작업 (버그 수정, 기능 구현, 리팩토링)
  │   ├─ 파일 생성/삭제/변경
  │   └─ 설정 파일, 인프라, CI/CD 변경
  │
  └─ [판단 애매] → 사용자에게 확인
      ├─ 조사 후 수정 가능성이 있는 요청 ("이거 왜 안 되지?" → 디버깅 후 수정?)
      ├─ 범위가 불명확한 요청 ("좀 개선해줘")
      └─ 탐색적 요청 ("~해볼까?", "~검토해줘")
```

**이슈 라이프사이클:**

1. **기존 이슈 확인** — `issue-cli.js list --assignee claude --status open` 으로 관련 이슈 존재 여부 확인
2. **없으면 생성** — `issue-cli.js create --title "..." --type task --assignee claude --reporter user`
3. **작업 시작** — `issue-cli.js update ISS-NNN --status in-progress`
4. **작업 수행** — 에이전트가 실제 작업 진행
5. **작업 완료** — `issue-cli.js update ISS-NNN --status resolved` + `issue-cli.js comment ISS-NNN --author claude --content "작업 내역"`

**이슈 CLI 경로:** `node <plugin-path>/skills/hub-issue-tracker/scripts/issue-cli.js`

issue-cli.js의 PROJECT_ROOT resolve 로직을 새 위치에 맞게 수정 필요.

**스킬 본문에 포함할 내용:**
- 의사결정 트리 (위에 정의)
- CLI 사용법 (create, update, comment, get, list)
- 라이프사이클 규칙 (시작 시 in-progress, 완료 시 resolved + comment)
- 서브에이전트 실행 시에도 동일 규칙 적용 지침
- "왜 이슈를 만들어야 하는가" 설명 (에이전트가 목적을 이해해야 더 잘 따름)

**references/issue-schema.md에 포함할 내용:**
- 이슈 JSON 스키마 (기존 schemas.md의 이슈 섹션)
- status, priority, type 열거형 정의
- 코멘트 스키마

### 스킬 2: hub-docs

**역할:** 기획 산출물(PRD, 기능 명세, 역할/권한, 유저 플로우)을 구조화 데이터로 생성하고, 문서를 작성.

**트리거 description:**
> PRD 작성, 기능 명세, 역할/권한 정의, 유저 플로우, 구조화 데이터 생성 등 기획 산출물을 작성할 때 사용합니다. 'PRD 만들어', '기능 명세 작성', '역할 권한 정의', '유저 플로우', 'data/ 파일 생성', '문서 작성' 등의 요청 시 반드시 이 스킬을 사용하세요.

**스킬 본문에 포함할 내용:**
- 문서 생성 규칙 (docs/ 디렉토리, YAML frontmatter)
- 구조화 데이터 생성 가이드 (data/ 디렉토리, 스키마 준수)
- references/schemas.md 참조 지시

**references/schemas.md에 포함할 내용:**
- 기존 schemas.md에서 이슈 스키마를 제외한 나머지 전체
- PRD, features, roles, userflow 스키마

### 제거 대상

| 파일 | 조치 |
|------|------|
| `.claude/rules/hub-workflow.md` | 삭제 |
| `CLAUDE.md`의 `<!-- agent-team-hub:start -->` ~ `<!-- agent-team-hub:end -->` 섹션 | 삭제 |
| `.claude/skills/hub/` 디렉토리 전체 | 삭제 |

### issue-cli.js 변경 사항

- `PROJECT_ROOT` resolve 로직 변경: `.claude/plugins/agent-hub/skills/hub-issue-tracker/scripts/` 에서 프로젝트 루트까지의 상대 경로 수정 (7단계 상위: `../../../../../../..`)
- 로직/기능 변경 없음

## 설계 원칙

1. **스킬이 자급자족** — 외부 규칙 파일이나 CLAUDE.md 주입 없이 스킬 자체가 워크플로우를 완전히 정의
2. **why를 설명** — "이슈를 만들어라"가 아니라 "왜 이슈를 만들어야 하는지"를 에이전트에게 설명하여 자발적 준수 유도
3. **pushy description** — skill-creator 가이드에 따라 트리거 조건을 넓고 적극적으로 설정
4. **예외 처리** — 이슈 불필요 케이스를 명시적으로 정의하고, 애매한 케이스는 사용자에게 확인
5. **관심사 분리** — 이슈 관리와 문서/데이터 생성을 별도 스킬로 분리
