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

# Run the test suite (Vitest — auth, RBAC, IDOR)
npm test
```

Server starts at `http://localhost:3000`

> **Entry points:** `app.js` builds the Express app (routes + middleware) and is what the tests import; `main.js` bootstraps the real server (DB connect, Socket.IO, index sync, startup).

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
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `BREVO_API_KEY` | No | Brevo API key for invite emails |
| `BREVO_SENDER_EMAIL` | No | Verified sender email on Brevo |
| `RAZORPAY_KEY_ID` | No | Razorpay key ID (test keys work without KYC) |
| `RAZORPAY_KEY_SECRET` | No | Razorpay key secret |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name (chat + task image uploads) |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret (signs direct uploads) |
| `VAPID_PUBLIC_KEY` | No | Web-push VAPID public key (browser notifications) |
| `VAPID_PRIVATE_KEY` | No | Web-push VAPID private key |
| `VAPID_EMAIL` | No | Contact email for VAPID (`mailto:`) |
| `PY_REVIEWER_URL` | No | Python code-review service (default: http://localhost:8000) |
| `JS_REVIEWER_URL` | No | JS/TS code-review service (default: http://localhost:8001) |
| `COMB_REVIEWER_URL` | No | Java/C++/Go review service (default: http://localhost:8002) |
| `AI_STANDUP_URL` | No | Standup report service |
| `AI_SUMMARY_URL` | No | Project summary service |
| `AI_BLOCKER_URL` | No | Bottleneck detection service |
| `AI_BREAKDOWN_URL` | No | Task breakdown service |

> **Minimum to run:** `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`
> Image uploads, web-push, and each AI feature stay disabled (graceful) until their vars are set.

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
| Chat | `/workspaces/:wId/projects/:pId/chat` + `/workspaces/:wId/chat` | Project + workspace chat: send, edit, delete, pin, react, search, read receipts, image attachments |
| Notifications | `/notifications` | unread, mark-read, web-push subscribe |
| Activity | `/workspaces/:wId/projects/:pId/activity` | Feed (latest 100) |
| Uploads | `/uploads` | `GET /signature` — signed direct Cloudinary image upload |
| AI | `/ai` | review-code, standup, summarize, generate-tasks, bottleneck |
| Subscriptions | `/subscriptions` | subscribe, verify, cancel, status — **per-user, no workspace context** |

Full API reference: [`../docs/api/backend_api.md`](../docs/api/backend_api.md)

## Real-Time (Socket.IO)

Socket.IO runs on the same port as HTTP. **The connection is authenticated** — the
client sends its JWT in the handshake (`socket.handshake.auth.token`); the server
verifies it and sets `socket.userId`. Identity is never taken from client payloads.

| Event | Description |
|---|---|
| `user_online` | Announce display name/avatar for presence (userId comes from the verified JWT, not the payload) |
| `join_project` / `leave_project` | Join/leave a project room for live kanban + chat |
| `presence:join` / `presence:leave` / `presence:request` | Page-scoped presence (e.g. `chat:<id>`, `wb:<id>`, `ws:<id>`) → `presence:scope_update` |
| `task_move` | Drag a kanban card (authorized server-side) |
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
