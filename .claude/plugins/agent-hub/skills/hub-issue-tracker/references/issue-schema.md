# 이슈 JSON 스키마

## 이슈 파일 (ISS-NNN.json)

```json
{
  "id": "ISS-001",
  "title": "이슈 제목",
  "description": "상세 설명",
  "status": "open",
  "priority": "medium",
  "type": "task",
  "assignee": "에이전트명",
  "assignees": ["에이전트명"],
  "reporter": "생성자 에이전트명",
  "labels": [],
  "relatedFiles": [],
  "relatedIds": [],
  "comments": [],
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | `ISS-NNN` 형식, CLI가 자동 채번 |
| title | string | 이슈 제목 |
| description | string | 상세 설명 |
| status | enum | `open` \| `in-progress` \| `resolved` \| `closed` \| `archived` |
| priority | enum | `low` \| `medium` \| `high` \| `critical` |
| type | enum | `task` \| `bug` \| `feature` \| `question` \| `decision` |
| assignee | string | 주 담당자 (하위 호환용, assignees[0]과 동일) |
| assignees | string[] | 담당자 목록 |
| reporter | string | 생성자 |
| labels | string[] | 라벨 |
| relatedFiles | string[] | 관련 파일 경로 |
| relatedIds | string[] | 관련 이슈 ID |
| comments | Comment[] | 코멘트 배열 |
| createdAt | string | ISO 8601 생성 시각 |
| updatedAt | string | ISO 8601 수정 시각 |

### 코멘트 스키마

```json
{
  "id": "c-1234567890",
  "author": "에이전트명",
  "content": "코멘트 내용",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### status 라이프사이클

| status | 의미 | 전환 주체 |
|--------|------|----------|
| open | 미착수 | 생성 시 기본값 |
| in-progress | 작업 중 | 에이전트가 작업 시작 시 |
| resolved | 해결됨 | 에이전트가 작업 완료 시 |
| closed | 닫힘 | 사람이 resolved 확인 후 |
| archived | 보관됨 | 사람이 Hub에서 보관 처리 시 |

### 인덱스 파일 (_index.json)

```json
{
  "version": "1.0",
  "nextId": 10
}
```

`nextId`는 다음 이슈 생성 시 사용할 번호. CLI가 자동 증가시킴.
