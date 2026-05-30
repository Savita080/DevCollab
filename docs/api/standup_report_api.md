# Daily Standup Report API Reference

This API reference covers the Standup Report Generator, an AI-powered service for DevCollab that creates personalised daily standups based on a user's workspace role (admin vs contributor).

**Architecture:**
This service is a **PURE COMPUTE LAYER**. The Node.js backend queries MongoDB, assembles the `StandupRequest` payload, and POSTs it here.

**Base URL:** `http://localhost:8003` *(configurable via env vars)*

---

### GET /health

Service health check.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "standup-report-generator",
  "llm_provider": "groq",
  "llm_configured": true,
  "activity_pulse_weights": {
    "chat": 0.3,
    "tasks": 0.5,
    "wiki": 0.2
  }
}
```

---

### POST /api/standup

Generate a personalised daily standup report based on the user's workspace role.

#### Request Body (`StandupRequest`)

```json
{
  "user_workspace_role": "ADMIN",
  "user_name": "Alice",
  "workspace_name": "DevCollab Workspace",
  "projects": [
    {
      "project_id": "proj_123",
      "project_name": "Frontend Redesign",
      "tasks": [...],
      "chat_messages": [...],
      "wiki_updates": [...]
    }
  ],
  "workspace_data": {}
}
```

| Field | Type | Description |
|---|---|---|
| `user_workspace_role` | `string` | User's role: `OWNER`, `ADMIN`, `MEMBER`, or `VIEWER`. |
| `user_name` | `string` | Display name for the greeting. |
| `workspace_name` | `string` | Used for the admin-level summary. |
| `projects` | `array` | List of `ProjectPayload` objects containing tasks, chat, and wiki data. |
| `workspace_data` | `object` | Optional workspace-level data for admins. |

#### Response Schema (`StandupResponse`)

Returns a report tailored to the role. `ADMIN` / `OWNER` users get a high-level workspace summary and per-project admin cards, while `MEMBER` / `VIEWER` users get detailed per-project contributor reports.

**Response `200 OK`:**
```json
{
  "report_type": "ADMIN",
  "greeting": "Good morning, Alice!",
  "duration_ms": 1200,
  "workspace_summary": "Overall the workspace is highly active.",
  "project_reports": [
    {
      "project_id": "proj_123",
      "project_name": "Frontend Redesign",
      "pulse_score": 85,
      "summary": "Team is moving fast on mockups.",
      "blockers": ["Waiting on API team"],
      "action_items": ["Review new designs"]
    }
  ]
}
```

#### Error Responses

| HTTP Status | Condition | Response body |
|-------------|-----------|---------------|
| `422` | No projects provided | `{"detail": "No projects provided. The user must be a member of at least one project."}` |
| `500` | Summary generation failed | `{"detail": "<error details>"}` |
