# Project Progress Summary API Reference

This API reference covers the Project Progress Summary service, an AI-powered project health summary for DevCollab.

**Architecture:**
This service is a **PURE COMPUTE LAYER**. The Node.js backend queries MongoDB, assembles the `SummaryRequest` payload, and POSTs it here. This service never touches MongoDB directly.

**Base URL:** `http://localhost:8002` *(configurable via env vars)*

---

### GET /health

Service health check.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "project-progress-summary",
  "llm_provider": "groq",
  "llm_configured": true,
  "health_score_weights": {
    "completion_rate": 0.4,
    "overdue_penalty": -0.2,
    "velocity": 0.2,
    "priority_balance": 0.1,
    "stale_penalty": -0.1
  }
}
```

---

### POST /api/summarize

Generate a full AI project summary. Computes an ML health score (0–100) from task data and generates a structured summary with insights, velocity, deadlines, and member contributions.

#### Request Body (`SummaryRequest`)

```json
{
  "project_id": "proj_123",
  "project_name": "Frontend Redesign",
  "project_description": "Revamping the UI for better UX.",
  "tasks": [
    {
      "task_id": "task_1",
      "title": "Design Mockups",
      "status": "IN_PROGRESS",
      "priority": "P1",
      "due_date": "2024-12-31T23:59:59Z",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-05T10:00:00Z",
      "assignee_id": "user_1",
      "assignee_name": "Alice"
    }
  ],
  "members": [
    {
      "user_id": "user_1",
      "name": "Alice",
      "role": "Designer"
    }
  ]
}
```

#### Response Schema (`SummaryResponse`)

**Response `200 OK`:**
```json
{
  "project_id": "proj_123",
  "project_name": "Frontend Redesign",
  "generated_at": "2024-01-06T10:00:00Z",
  "duration_ms": 1500,
  "health_score": {
    "score": 85,
    "band": "On Track",
    "color": "green",
    "breakdown": {
      "completion_rate": {
        "score": 35,
        "max_score": 40,
        "value": "8/10 done",
        "percent": 87.5
      }
    }
  },
  "summary_text": "The project is making steady progress...",
  "key_insights": [
    {
      "type": "positive",
      "icon": "🚀",
      "title": "High Velocity",
      "detail": "Team completed 5 tasks this week."
    }
  ],
  "task_breakdown": {
    "total": 10,
    "by_status": {
      "DONE": { "count": 8, "percent": 80.0 }
    },
    "by_priority": {
      "P0": { "TODO": 0, "DONE": 2 }
    }
  },
  "velocity": {
    "window_days": 7,
    "daily_completions": [0, 1, 0, 2, 0, 2, 0],
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "total_this_week": 5,
    "trend": "up"
  },
  "upcoming_deadlines": [
    {
      "task_id": "task_2",
      "title": "API Integration",
      "due_date": "2024-01-10T23:59:59Z",
      "days_left": 4,
      "priority": "P0",
      "status": "TODO",
      "is_overdue": false
    }
  ],
  "member_contributions": [
    {
      "user_id": "user_1",
      "name": "Alice",
      "avatar_color": "#ff5733",
      "assigned": 5,
      "completed": 4,
      "completion_rate": 80.0
    }
  ]
}
```

#### Error Responses

| HTTP Status | Condition | Response body |
|-------------|-----------|---------------|
| `500` | Summary generation failed | `{"detail": "Summary generation failed: <error>"}` |
