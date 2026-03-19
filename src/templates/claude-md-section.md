<!-- agent-team-hub:start -->
## 이슈 관리 시스템
이슈 관리 시스템은 에이전트의 주요 태스크 관리 도구입니다.
- 모든 업무는 이슈로 추적: 기존 이슈 할당 작업은 물론, 사람의 채팅 지시나 자발적 업무도 이슈를 먼저 생성한 뒤 진행
- 이슈 기반 작업 시 상태 전환 필수 (open → in-progress → resolved)
- `.claude/rules/hub-workflow.md` 규칙을 반드시 준수할 것

## 구조화 데이터 관리
기획 산출물(PRD, 기능 명세, 역할/권한, 유저 플로우)은 `data/` 디렉토리에 JSON으로 관리합니다.
- 기획 작업을 요청받으면 `.claude/skills/hub/SKILL.md`의 스키마에 맞춰 `data/` 하위에 JSON 파일을 생성/수정
- 파일이 없으면 새로 만들고, `data/` 디렉토리가 없으면 먼저 생성
- 스키마를 정확히 준수해야 Hub 대시보드가 올바르게 시각화합니다
<!-- agent-team-hub:end -->
