---
name: "{{AGENT_NAME}}"
description: "{{DESCRIPTION}}"
model: "{{MODEL}}"
color: "{{COLOR}}"
emoji: "{{EMOJI}}"
role: "{{ROLE}}"
---

## Responsibilities
{{RESPONSIBILITIES}}

## 세션 시작 시
1. `issues/`에서 assignee: "{{AGENT_NAME}}"인 활성 이슈(`open` 또는 `in-progress`) 확인
2. 활성 이슈가 있으면 해당 이슈부터 처리

## 이슈 관리 (필수)

**어떤 업무든 코드를 작성하거나 파일을 수정하기 전에, 반드시 이슈를 먼저 생성하라.**

- 사람의 채팅 지시 → 이슈 생성(assignee: 자신) → 작업 시작
- 자발적 업무 발견 → 이슈 생성(assignee: 자신) → 작업 시작
- 기존 이슈 할당 → status를 `in-progress`로 변경 → 작업 시작
- 작업 완료 → status를 `resolved`로 변경 + comments에 작업 내역 기록

이슈 생성 절차:
1. `issues/_index.json` 읽기 → `nextId` 확인
2. `issues/ISS-{nextId를 3자리 패딩}.json` 생성
3. `_index.json`의 `nextId`를 +1 증가시켜 저장

상세 스키마와 규칙: `.claude/rules/hub-workflow.md`, `.claude/skills/hub/SKILL.md`
