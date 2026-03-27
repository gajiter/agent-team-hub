# Hub 구조화 데이터 JSON 스키마

이 문서는 Hub 기획 산출물의 JSON 스키마 정의를 포함합니다.

---

## data/prd.json — 제품 요구사항 정의 (PRD)

```json
{
  "version": "2.0",
  "project": "프로젝트명",
  "updatedAt": "ISO 8601",
  "progress": 0,
  "sections": {
    "properties": {
      "serviceName": "서비스명",
      "version": "1.0",
      "status": "draft | in-review | approved",
      "basedOn": "기반 문서"
    },
    "vision": {
      "oneLiner": "한 줄 요약",
      "goals": ["목표1", "목표2"],
      "background": ["배경/문제1", "배경/문제2"]
    },
    "coreValues": [
      { "id": "CV-01", "name": "가치명", "description": "설명" }
    ],
    "target": {
      "userTypes": [
        { "role": "역할명", "description": "설명", "concerns": "주요 관심사" }
      ],
      "personas": [
        {
          "name": "이름", "role": "역할",
          "situation": "상황", "goal": "목표",
          "painPoint": "불편", "coreNeed": "핵심 니즈"
        }
      ],
      "scenarios": ["시나리오1"]
    },
    "userStories": [
      {
        "id": "US-01", "title": "제목", "size": "Small | Medium | Large",
        "actor": "역할명", "goal": "목적", "want": "원하는 것",
        "acceptance": { "given": "전제", "when": "행동", "then": "결과" }
      }
    ],
    "nonFunctionalRequirements": {
      "performance": [{ "id": "NFR-P01", "requirement": "내용", "target": "목표치" }],
      "security": [{ "id": "NFR-S01", "requirement": "내용" }],
      "deployment": [{ "id": "NFR-D01", "requirement": "내용" }],
      "dataManagement": [{ "id": "NFR-DM01", "requirement": "내용" }]
    },
    "mvpScope": {
      "included": [{ "id": "MVP-01", "item": "포함 항목", "relatedStories": ["US-01"] }],
      "excluded": [{ "item": "제외 항목", "reason": "사유" }]
    },
    "roadmap": [
      { "phase": 1, "title": "Phase 1", "targetDate": "2026-Q2 또는 null", "items": ["항목"] }
    ],
    "kpi": {
      "operationalStability": [{ "metric": "지표", "target": "목표", "period": "기간" }],
      "usability": [],
      "business": []
    },
    "constraints": [
      { "id": "CON-01", "description": "제약 조건" }
    ],
    "openIssues": [
      { "id": "OI-01", "item": "미결 항목", "status": "현재 상태", "prdImpact": "PRD 영향" }
    ]
  }
}
```

> `progress`는 0-100 정수로, 전체 기획 진행률을 나타냅니다.

---

## data/features.json — 기능 명세

```json
{
  "version": "1.0",
  "project": "프로젝트명",
  "requirements": [
    {
      "id": "REQ-01", "name": "요구사항명", "description": "설명",
      "group": "tenant | admin | platform",
      "order": 1, "priority": "high | medium | low",
      "status": "done | in-progress | todo",
      "acceptanceCriteria": ["기준1"]
    }
  ],
  "features": [
    {
      "id": "F-01", "name": "기능명", "description": "설명",
      "requirementId": "REQ-01", "phase": 1,
      "priority": "high | medium | low",
      "status": "done | in-progress | todo",
      "userStories": ["US-01"],
      "acceptanceCriteria": ["기준1"],
      "parentId": null,
      "dependencies": ["F-02"],
      "screens": ["화면명"]
    }
  ],
  "relations": [
    { "from": "F-01", "to": "F-02", "type": "depends | related | extends", "description": "설명" }
  ]
}
```

> `requirementId`로 기능과 요구사항을 연결합니다. `parentId`로 기능의 계층 구조를 표현합니다.

---

## data/roles.json — 역할/권한 매트릭스

```json
{
  "version": "1.0",
  "project": "프로젝트명",
  "scopeHierarchy": [
    { "scope": "global", "name": "전역", "description": "전체 시스템" },
    { "scope": "workspace", "name": "워크스페이스", "description": "워크스페이스 단위" },
    { "scope": "site", "name": "사이트", "description": "사이트 단위" }
  ],
  "roles": [
    { "id": "owner", "name": "소유자", "scope": "global", "description": "설명", "level": 1 }
  ],
  "permissions": [
    {
      "action": "행동 설명",
      "featureId": "F-01",
      "roles": { "owner": true, "admin": true, "member": false },
      "note": "조건부 허용인 경우 설명"
    }
  ],
  "scopeNotes": {
    "원칙명": "설명"
  }
}
```

> `scopeHierarchy`와 `scopeNotes`는 선택적 필드입니다. `roles`의 `level`이 낮을수록 상위 권한입니다.

---

## data/userflow.json — 사용자 흐름

```json
{
  "version": "1.0",
  "project": "프로젝트명",
  "sections": [
    {
      "name": "섹션명 (예: 인증 플로우)",
      "nodes": [
        { "id": "start", "type": "start", "label": "시작" },
        { "id": "login-page", "type": "page", "label": "로그인 페이지", "featureIds": ["F-01"] },
        { "id": "submit", "type": "action", "label": "로그인 버튼 클릭" },
        { "id": "auth-section", "type": "section", "label": "인증 처리" }
      ],
      "edges": [
        { "from": "start", "to": "login-page" },
        { "from": "login-page", "to": "submit" },
        { "from": "submit", "to": "auth-section" }
      ]
    }
  ]
}
```

> 노드 type: `start`(시작점), `section`(섹션 그룹), `page`(화면), `action`(사용자 행동).
> `featureIds`로 features.json의 기능과 연결할 수 있습니다 (선택).
