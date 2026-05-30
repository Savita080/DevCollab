# AI Microservices Documentation

This document outlines the API contracts, expected inputs, expected outputs, and environment variables for the internal AI Python Microservices.

---

## 1. Code Reviewer (`aiCodeReviewer`)
**Port**: `8000`  
**Endpoint**: `POST /review`

This service runs a multi-agent LangChain pipeline to review code for syntax, security, readability, performance, and robustness. It performs static analysis (preflight) before running the LLM agents.

### Expected Input
```json
{
  "code": "def add(a, b):\n    unused = 42\n    return a + b",
  "language": "Python",
  "context": "Math utility function",
  "weights": {
    "syntax": 0.2,
    "security": 0.4,
    "clean_code": 0.03,
    "readability": 0.05,
    "performance": 0.3,
    "robustness": 0.02
  }
}
```
*Note: `context` and `weights` are optional.*

### Expected Output
```json
{
  "language": "Python",
  "weighted_score": 75.5,
  "raw_scores": {
    "syntax": 100,
    "security": 80,
    "clean_code": 50
  },
  "agent_results": [
    {
      "criteria": "clean_code",
      "score": 50,
      "issues": ["Unused variable 'unused' detected."],
      "suggestions": ["Remove the 'unused' variable assignment."],
      "summary": "Clean up unused variables."
    }
  ],
  "duration_ms": 12450
}
```

### `.env.example`
```env
HOST=0.0.0.0
PORT=8000
RELOAD=true
CORS_ORIGINS=*

LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
```

---

## 2. Blockage Identifier (`blocker`)
**Port**: `8001` (Assumed based on backend controller, though default `.env` says 8000. Adjust based on your docker-compose/setup)  
**Endpoint**: `POST /find-bottleneck`

An AI & mathematical engine that detects stalled tasks using log-normal distribution, identifies blockers via NLP, and surfaces team bottlenecks through graph analysis on negative comments.

### Expected Input
```json
{
  "project_id": "proj_123",
  "project_name": "Frontend Redesign",
  "active_tasks": [
    {
      "task_id": "task_abc",
      "title": "Build Navbar",
      "status": "IN_PROGRESS",
      "priority": "P1",
      "created_at": "2026-05-20T00:00:00Z",
      "updated_at": "2026-05-24T00:00:00Z",
      "comments": [
        {
          "_id": "cmt_1",
          "author_id": "user_1",
          "author_name": "Alice",
          "content": "I'm blocked waiting on @Bob for the API.",
          "created_at": "2026-05-23T00:00:00Z"
        }
      ]
    }
  ],
  "historical_tasks": [] 
}
```
*Note: `historical_tasks` uses the same structure as `active_tasks` but for DONE/IN_REVIEW items. It is used to calibrate stall thresholds.*

### Expected Output
```json
{
  "project_id": "proj_123",
  "project_name": "Frontend Redesign",
  "total_active_tasks": 1,
  "stalled_tasks_count": 1,
  "results": [
    {
      "task_id": "task_abc",
      "title": "Build Navbar",
      "priority": "P1",
      "status": "IN_PROGRESS",
      "duration_hours": 96.0,
      "is_stalled": true,
      "stall_method": "log_normal",
      "urgency_score": 0.85,
      "percentile_rank": 95.0,
      "blocker_categories": [
        {
          "category": "dependency",
          "similarity_score": 0.88,
          "is_blocked": true
        }
      ],
      "dominant_category": "dependency",
      "sentiment_score": -0.45,
      "has_negative_sentiment": true,
      "negative_comments": [
        {
          "_id": "cmt_1",
          "author_id": "user_1",
          "author_name": "Alice",
          "content": "I'm blocked waiting on @Bob for the API.",
          "created_at": "2026-05-23T00:00:00Z"
        }
      ],
      "mentioned_users": [
        {
          "user_id": "user_2",
          "user_name": "Bob",
          "in_degree": 1,
          "out_degree": 0
        }
      ],
      "dependency_in_degree": 0,
      "severity_multiplier": 1.0,
      "ai_diagnosis": "Alice is blocked on Bob for API requirements.",
      "analysis_timestamp": "2026-05-24T08:00:00Z"
    }
  ],
  "duration_ms": 3400
}
```

### `.env.example`
```env
# Optional if service needs direct MongoDB access (though current architecture pushes data from Node)
MONGO_URI=mongodb://localhost:27017
DB_NAME=devcollab

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Math engine constants
STALL_Z_THRESHOLD=1.645
MIN_HISTORICAL_SAMPLES=5
STATIC_STALL_HOURS=72

LAMBDA_P0=0.05
LAMBDA_P1=0.02
LAMBDA_P2=0.008

COSINE_THRESHOLD=0.65
SENTIMENT_NEGATIVE_THRESHOLD=-0.3

HOST=0.0.0.0
PORT=8001
RELOAD=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 3. Project Summary (`progressSummary`)
**Port**: `8003`  
**Endpoint**: `POST /api/summarize`

Calculates a comprehensive project health score based on velocity, overdue tasks, and priorities. It also leverages an LLM to build a narrative text summary and extract key insight cards.

### Expected Input
```json
{
  "project_id": "proj_123",
  "project_name": "Frontend Redesign",
  "tasks": [
    {
      "task_id": "task_1",
      "title": "Design System",
      "status": "DONE",
      "priority": "P0",
      "created_at": "2026-05-01T00:00:00Z",
      "updated_at": "2026-05-20T00:00:00Z"
    }
  ],
  "members": [
    {
      "user_id": "user_1",
      "name": "Alice",
      "role": "admin"
    }
  ]
}
```

### Expected Output
```json
{
  "project_id": "proj_123",
  "project_name": "Frontend Redesign",
  "generated_at": "2026-05-24T08:00:00Z",
  "health_score": {
    "score": 85,
    "band": "On Track",
    "color": "green",
    "breakdown": {
      "velocity": {
        "score": 15,
        "max_score": 20,
        "value": "15 tasks/week",
        "percent": 75.0
      }
    }
  },
  "summary_text": "The project is proceeding smoothly with strong recent velocity.",
  "key_insights": [
    {
      "type": "positive",
      "icon": "🚀",
      "title": "High Velocity",
      "detail": "Team completed 15 tasks this week."
    }
  ],
  "task_breakdown": {
    "total": 1,
    "by_status": {
      "DONE": { "count": 1, "percent": 100.0 }
    },
    "by_priority": {
      "P0": { "DONE": 1 }
    }
  },
  "velocity": {
    "window_days": 7,
    "daily_completions": [0,0,0,0,0,1,0],
    "labels": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    "total_this_week": 1,
    "trend": "up"
  },
  "upcoming_deadlines": [],
  "member_contributions": [
    {
      "user_id": "user_1",
      "name": "Alice",
      "avatar_color": "#ff0000",
      "assigned": 1,
      "completed": 1,
      "completion_rate": 100.0
    }
  ],
  "duration_ms": 1500
}
```

### `.env.example`
```env
GROQ_API_KEY=your_groq_api_key_here
PORT=8003
```

---

## 4. Standup Report (`standupReport`)
**Port**: `8002`  
**Endpoint**: `POST /api/standup`

Generates personalized daily standup reports. It utilizes an Activity Pulse mathematical formula (exponential decay based on recent actions) and map-reduce LLM summarization for chat logs and wiki edits.

### Expected Input
```json
{
  "user_workspace_role": "MEMBER",
  "user_name": "Alice",
  "projects": [
    {
      "project_id": "proj_123",
      "project_name": "Frontend Redesign",
      "user_role_in_project": "CONTRIBUTOR",
      "tasks_moved": [
        {
          "task_id": "t1",
          "title": "Fix bug",
          "status": "DONE",
          "priority": "P1",
          "updated_at": "2026-05-24T00:00:00Z"
        }
      ],
      "activity_logs": [],
      "chat_messages": [],
      "wiki_changes": [],
      "whiteboard_changes": [],
      "new_members": [],
      "role_changes": []
    }
  ]
}
```

### Expected Output (Contributor Example)
```json
{
  "report_type": "contributor",
  "generated_at": "2026-05-24T08:00:00Z",
  "greeting": "Good morning, Alice!",
  "contributor_reports": [
    {
      "project_name": "Frontend Redesign",
      "tasks_summary": "| Task | Status | \n |---|---| \n | Fix Bug | DONE |",
      "chat_summary": "No recent chat activity.",
      "wiki_summary": "No documentation changes.",
      "whiteboard_summary": "No whiteboard updates.",
      "member_changes": "No team changes.",
      "activity_pulse": {
         "score": 40.0,
         "chat_count": 0,
         "task_count": 1,
         "wiki_count": 0,
         "chat_weighted": 0.0,
         "task_weighted": 40.0,
         "wiki_weighted": 0.0
      }
    }
  ],
  "duration_ms": 2100
}
```

### `.env.example`
```env
# LLM Provider Options: groq, openai, anthropic, ollama
LLM_PROVIDER=groq

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Fast model override (used for chat chunk summarisation in MapReduce)
# FAST_LLM_MODEL=llama-3.1-8b-instant

# Activity Pulse Weights
WEIGHT_CHAT=0.2
WEIGHT_TASKS=0.4
WEIGHT_WIKI=0.4

# Activity Pulse Decay Constants
K_CHAT=0.05
K_TASKS=0.2
K_WIKI=0.3

# Chat Summarisation
CHAT_CHUNK_SIZE=30

HOST=0.0.0.0
PORT=8002
RELOAD=true
CORS_ORIGINS=*
```

---

## 5. Task Breaker (`taskBreaker`)
**Port**: `8004`  
**Endpoint**: `POST /api/breakdown`

Breaks down a high-level feature description into actionable subtasks using an LLM. Accepts optional project context (name, description, existing tasks) to generate context-aware subtasks with titles, descriptions, priorities, and labels.

### Expected Input
```json
{
  "projectId": "proj_998xak20",
  "featureDescription": "make a settings page",
  "context": {
    "project_name": "DevCollab Project Management",
    "project_description": "A collaborative project management tool built with Next.js on the frontend and Supabase PostgreSQL on the backend.",
    "existing_tasks": []
  }
}
```

*Note: `context` is optional. `context.existing_tasks` is used to avoid generating duplicate subtasks.*

### Expected Output
```json
{
  "project_id": "proj_998xak20",
  "feature_title": "Settings Page",
  "subtasks": [
    {
      "title": "Design Settings Page UI",
      "description": "Create a new React component for the settings page...",
      "priority": "P1",
      "labels": ["frontend", "UI"]
    },
    {
      "title": "Implement Settings API Endpoint",
      "description": "Create a new API endpoint using Supabase PostgreSQL...",
      "priority": "P0",
      "labels": ["backend", "api", "database"]
    }
  ],
  "duration_ms": 1876
}
```

### `.env.example`
```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

HOST=0.0.0.0
PORT=8004
RELOAD=true
CORS_ORIGINS=*
```
