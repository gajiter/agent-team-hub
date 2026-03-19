<!-- agent-team-hub:start -->
## 이슈 관리 시스템 (필수)

**어떤 업무든 코드를 작성하거나 파일을 수정하기 전에, 반드시 이슈를 먼저 생성하라.**

이것은 선택이 아니라 필수 규칙이다. 사람의 채팅 지시, 자발적 업무 발견, 다른 에이전트 요청 — 모두 이슈 생성이 선행되어야 한다.

### 이슈 생성 절차
1. `issues/_index.json` 읽기 → `nextId` 확인
2. `issues/ISS-{nextId를 3자리 패딩}.json` 생성 (스키마: `.claude/skills/hub/SKILL.md`)
3. `_index.json`의 `nextId`를 +1 증가시켜 저장
4. 이슈 status를 `in-progress`로 변경 후 작업 시작

### 상태 전환
- 작업 시작: status → `in-progress`
- 작업 완료: status → `resolved` + comments에 작업 내역 기록
- 상세 규칙: `.claude/rules/hub-workflow.md`

## 구조화 데이터 관리
기획 산출물(PRD, 기능 명세, 역할/권한, 유저 플로우)은 `data/` 디렉토리에 JSON으로 관리합니다.
- 기획 작업을 요청받으면 `.claude/skills/hub/SKILL.md`의 스키마에 맞춰 `data/` 하위에 JSON 파일을 생성/수정
- 파일이 없으면 새로 만들고, `data/` 디렉토리가 없으면 먼저 생성
- 스키마를 정확히 준수해야 Hub 대시보드가 올바르게 시각화합니다
<!-- agent-team-hub:end -->
