# DevCollab — Backend

Node.js/Express REST API + Socket.IO server for the DevCollab platform.

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js v5
- **Database:** MongoDB (Mongoose v9)
- **Real-Time:** Socket.IO v4
- **Cache / Presence:** Redis (ioredis) — optional, graceful fallback
- **Auth:** JWT + Google OAuth
- **Email:** Brevo (transactional)
- **Payments:** Razorpay Orders API

## Prerequisites

- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Redis instance — optional (Upstash recommended)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Fill in the values in .env (see Environment Variables section below)

# 3. Start development server
npm run dev
```

Server starts at `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `FRONTEND_URL` | Yes | Frontend URL for CORS + invite links |
| `REDIS_URL` | No | Redis connection string (presence + whiteboard cache) |
| `AI_SERVICE_URL` | No | Python AI service URL (default: http://localhost:8000) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `BREVO_API_KEY` | No | Brevo API key for invite emails |
| `BREVO_SENDER_EMAIL` | No | Verified sender email on Brevo |
| `RAZORPAY_KEY_ID` | No | Razorpay key ID (test keys work without KYC) |
| `RAZORPAY_KEY_SECRET` | No | Razorpay key secret |

> **Minimum to run:** `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`

## API Overview

Base URL: `http://localhost:3000/api`

All protected routes require: `Authorization: Bearer <token>`

| Domain | Base Route | Key Endpoints |
|---|---|---|
| Auth | `/auth` | register, login, google, GET/PATCH `/me` |
| Workspaces | `/workspaces` | CRUD, invite, members, transfer ownership |
| Projects | `/workspaces/:wId/projects` | CRUD, project members |
| Tasks | `/workspaces/:wId/projects/:pId/tasks` | CRUD, kanban ordering |
| Comments | `/tasks/:taskId/comments` | CRUD + live @mention notifications |
| Snippets | `/workspaces/:wId/projects/:pId/snippets` | CRUD + tags |
| Wiki | `/workspaces/:wId/projects/:pId/wiki` | CRUD + version history |
| Whiteboards | `/workspaces/:wId/projects/:pId/whiteboards` | CRUD + real-time drawing |
| Chat | `/workspaces/:wId/projects/:pId/chat` | Project + workspace chat |
| Notifications | `/notifications` | unread, mark-read |
| Activity | `/workspaces/:wId/projects/:pId/activity` | Feed (latest 50) |
| AI | `/ai` | review-code, standup, summarize, generate-tasks, bottleneck |
| Subscriptions | `/subscriptions` | subscribe, verify, cancel, status — **per-user, no workspace context** |

Full API reference: [`../docs/api/backend_api.md`](../docs/api/backend_api.md)

## Real-Time (Socket.IO)

Socket.IO runs on the same port as HTTP. Key events:

| Event | Description |
|---|---|
| `user_online` | Register presence (send `userId` on login) |
| `join_project` | Join a project room for live kanban + chat |
| `task_move` | Drag a kanban card |
| `join_whiteboard` | Join a whiteboard session |
| `whiteboard_draw` | Broadcast drawing strokes |

## Plan Limits

Plan is per-user and governs all workspaces that user **owns**.

| Resource | FREE | PRO |
|---|---|---|
| Workspaces owned | 2 | Unlimited |
| Projects per workspace | 3 | Unlimited |
| Members per workspace | 4 | 50 |
| Tasks per project | 50 | Unlimited |
| Wiki pages per project | 10 | Unlimited |
| Whiteboards per project | 2 | Unlimited |
| Snippets per project | 20 | Unlimited |
| AI requests/month | 10 | 200 |

Limits are enforced in `middleware/planLimits.js`. The middleware resolves the workspace owner's plan at request time — non-owner members inherit the owner's plan for workspace-scoped limits.

## Verify Setup

```bash
curl http://localhost:3000
# { "message": "DevCollab Backend Is running" }
```
