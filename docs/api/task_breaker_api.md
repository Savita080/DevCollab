# Task Breaker API Reference

This API reference covers the DevCollab Task Breaker service, an agentic FastAPI microservice for AI task breakdown. It splits high-level feature requests into granular subtasks.

**Architecture:**
Uses a 2-step pipeline. Step 1 analyzes a feature request and can ask clarifying questions. Step 2 generates the actual subtasks incorporating answers to those questions.

**Base URL:** `http://localhost:8004` *(configurable via env vars)*

---

### GET /health

Service health check.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "task-breaker",
  "llm_provider": "groq",
  "groq_configured": true,
  "openai_configured": false
}
```

---

### POST /api/analyze

**Step 1:** Analyze a high-level task/feature request. If ambiguous, returns multiple-choice questions to clarify architectural or UX details.

#### Request Body (`AnalyzeRequest`)

```json
{
  "projectId": "proj_123",
  "featureDescription": "Add Google OAuth login",
  "context": {
    "project_name": "Web App",
    "project_description": "A collaborative tool",
    "existing_tasks": ["Setup Express Server"]
  }
}
```

#### Response Schema (`AnalyzeResponse`)

**Response `200 OK`:**
```json
{
  "project_id": "proj_123",
  "duration_ms": 1100,
  "is_ambiguous": true,
  "clarifying_questions": [
    {
      "question": "Which scopes are required for Google OAuth?",
      "options": ["Profile and Email only", "Calendar access", "Drive access"]
    }
  ]
}
```

---

### POST /api/breakdown

**Step 2:** Decompose a task into exactly 4-5 granular subtasks, factoring in answers to clarifying questions.

#### Request Body (`TaskBreakdownRequest`)

```json
{
  "projectId": "proj_123",
  "featureDescription": "Add Google OAuth login",
  "context": {
    "project_name": "Web App",
    "project_description": "A collaborative tool",
    "existing_tasks": ["Setup Express Server"]
  },
  "clarifying_answers": [
    {
      "question": "Which scopes are required for Google OAuth?",
      "answer": "Profile and Email only"
    }
  ]
}
```

#### Response Schema (`TaskBreakdownResponse`)

**Response `200 OK`:**
```json
{
  "project_id": "proj_123",
  "duration_ms": 2500,
  "subtasks": [
    {
      "title": "Configure Google Cloud Console",
      "description": "Create OAuth credentials and set redirect URIs.",
      "complexity": "Low",
      "dependencies": []
    },
    {
      "title": "Implement Passport.js Strategy",
      "description": "Add Google strategy to backend auth routes.",
      "complexity": "Medium",
      "dependencies": ["Configure Google Cloud Console"]
    }
  ]
}
```

#### Error Responses

| HTTP Status | Condition | Response body |
|-------------|-----------|---------------|
| `400` | LLM configuration missing | `{"detail": "GROQ_API_KEY is not configured in settings."}` |
| `500` | Internal error | `{"detail": "Internal AI Analysis Error: <error>"}` |
