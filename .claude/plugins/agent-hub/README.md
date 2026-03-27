# agent-hub

프로젝트 이슈 관리와 기획 산출물 생성을 위한 Claude Code 플러그인.

## 스킬

### hub-issue-tracker

코드 변경이 수반되는 작업 시 이슈를 자동 관리하는 가드레일 스킬.
- 작업 전 이슈 필요 여부 판단
- 이슈 생성, 상태 전환, 완료 처리
- CLI 기반 이슈 CRUD

### hub-docs

기획 산출물을 구조화 데이터로 생성하는 스킬.
- PRD, 기능 명세, 역할/권한, 유저 플로우
- `data/` 디렉토리에 JSON 스키마 준수 파일 생성
- `docs/` 디렉토리에 YAML frontmatter 문서 생성

## 설치

이 디렉토리를 프로젝트의 `.claude/plugins/agent-hub/`에 배치합니다.
