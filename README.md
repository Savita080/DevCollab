<div align="center">

<br />

<img src="https://img.shields.io/badge/-DEVCOLLAB-1a1a2e?style=for-the-badge&labelColor=1a1a2e" alt="DevCollab" height="40" />

# 🚀 DevCollab

### **One workspace. Zero context-switching. Ship faster.**

*The tool student dev teams reach for when Trello + GitHub + Notion + Discord stops cutting it.*

<br />

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangChain](https://img.shields.io/badge/LangChain-Groq-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain.com)

<br />

```
🏆  Built for DevFusion 2.0  ·  3 devs  ·  ~35 endpoints  ·  5 AI services  ·  16 socket events
```

<br />

[**🌐 Live Demo**](https://www.devcollab.tech/) · [**📖 Documentation**](docs/api/backend_api.md) · [**🚀 Quick Start**](#-quick-start) · [**🧠 Architecture**](#%EF%B8%8F-architecture) · [**💎 Pricing**](#-pricing) · [**🗺️ Roadmap**](#%EF%B8%8F-roadmap)

---
### Test Account
- Email: `test@test.com`
- Password: `test1234`
- Workspace role in **test workspace**: **Member** (viewer permissions)
- In **DevCollab** workspace: workspace-level **Viewer**
- Project-level role in **ADD Ons** and **BUGS** projects: **Viewer**

<br />

---

</div>

## 💡 Why DevCollab?

> Student dev teams spend more time **switching tools** than **shipping code**.
> Tasks live in Trello. Code lives in GitHub. Notes live in Notion. Discussions die in Discord. Standups never happen because nobody wants to summarize what they did yesterday.

**DevCollab** is the workspace that fixes that. Plan, code, document, draw, and chat — all in one tab — with an AI layer that handles the boring parts so your team can focus on building.

<br />

<table>
<tr>
<td width="33%" align="center" valign="top">

### ⚡
**Real-time First**

Every kanban move, comment, mention, and whiteboard stroke broadcasts instantly. Built on Socket.IO with Redis presence.

</td>
<td width="33%" align="center" valign="top">

### 🤖
**AI That Actually Helps**

6 specialist agents review your code in parallel. Generate standups, detect bottlenecks, scaffold task lists from a feature description.

</td>
<td width="33%" align="center" valign="top">

### 💳
**Zero-Friction Billing**

Razorpay Orders API with HMAC verification — **no KYC required for dev**. Test keys work out of the box.

</td>
</tr>
</table>

---

## 🎯 Features

<table>
<tr>
<td width="50%" valign="top">

### 🏢 Workspaces & Projects
Multi-tenant workspaces with **two-tier RBAC** — workspace roles (`OWNER`/`ADMIN`/`MEMBER`/`VIEWER`) and project roles (`CONTRIBUTOR`/`VIEWER`). Email invites via Brevo. Ownership transfer. Member management.

### 📋 Live Kanban Board
Drag-and-drop tasks across `TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`. Priorities (`P0`/`P1`/`P2`), assignees, due dates, labels, and file attachments. **Every move syncs to every viewer in real time.**

### 💬 Real-Time Chat
Per-project and per-workspace channels. Messages broadcast over Socket.IO with online-presence tracking via Redis.

### 🧠 AI Project Assistant
One-click **standup reports**, **project summaries**, **bottleneck analysis**, and **AI-generated task breakdowns** — describe a feature, get a backlog.

### 🔍 AI Code Reviewer
Six specialist agents review your code in parallel: clean code, syntax, security, readability, performance, robustness. Returns a scored report with line-level feedback. SSE streaming supported.

</td>
<td width="50%" valign="top">

### 📚 Versioned Wiki
Markdown pages with **full version history** and **required commit messages** (min 10 chars). Rollback any change. Like Confluence with Git semantics.

### 🎨 Collaborative Whiteboard
Excalidraw-powered canvas with real-time stroke broadcast. Redis caches live state, MongoDB persists every 10s. Sketch architectures together.

### 💻 Snippet Library
Language-tagged snippets per project with search, syntax highlighting, and AI review built in. No more "where did I save that regex?"

### 🔔 @Mentions & Notifications
`@username` in comments auto-detects, persists a notification, and pushes a live Socket.IO event if the user is online. Mark-all-read. Done.

### 📊 Activity Feed & Profiles
Per-project audit trail of every action — task moves, wiki edits, role changes. Rich profiles with bio, avatar, GitHub URL, and skill tags.

</td>
</tr>
</table>

---

## 🆚 How It Compares

<div align="center">

| Capability | DevCollab | Trello | Notion | Linear | Slack |
|---|:---:|:---:|:---:|:---:|:---:|
| Real-time Kanban | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| Versioned Wiki | ✅ | ❌ | ⚠️ | ❌ | ❌ |
| Collaborative Whiteboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Code Snippet Library | ✅ | ❌ | ⚠️ | ❌ | ⚠️ |
| AI Code Review | ✅ | ❌ | ❌ | ❌ | ❌ |
| AI Standups & Bottleneck Detection | ✅ | ❌ | ❌ | ❌ | ❌ |
| Real-time Chat | ✅ | ❌ | ❌ | ❌ | ✅ |
| @Mention Notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Activity Feed | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| **All-in-one** | ✅ | ❌ | ❌ | ❌ | ❌ |

✅ Native · ⚠️ Limited / via plugin · ❌ Not supported

</div>

---

## 🏗️ Architecture

Three independent services. Each runs on its own port. Each scales on its own.

```
                          ┌─────────────────────────┐
                          │   👤  Browser Client    │
                          │     React 19 · Vite     │
                          │       :5173             │
                          └────────────┬────────────┘
                                       │ HTTPS · WebSocket
                                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │              Backend  ·  Express 5 + Socket.IO           │
        │                       :3000                              │
        │  ┌────────────┬────────────┬────────────┬─────────────┐  │
        │  │   Auth     │    RBAC    │ PlanLimits │   Sockets   │  │
        │  │  JWT/OAuth │ 2-tier     │ FREE/PRO   │ Kanban + WB │  │
        │  └────────────┴────────────┴────────────┴─────────────┘  │
        └──────┬─────────────────┬──────────────────┬──────────────┘
               │                 │                  │
               ▼                 ▼                  ▼
       ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐
       │   MongoDB    │  │    Redis     │  │   AI Services (4)     │
       │   Atlas      │  │   ioredis    │  │   FastAPI · LangChain │
       │              │  │  (optional)  │  │   Groq LLM            │
       │ 13 models    │  │ presence +   │  │ • Code Reviewer :8000 │
       │              │  │ whiteboard   │  │ • Standup Report      │
       │              │  │ cache        │  │ • Bottleneck Detector │
       │              │  │              │  │ • Progress Summary    │
       └──────────────┘  └──────────────┘  └───────────────────────┘
```

<details>
<summary><b>🔬 How a single drag-and-drop flows through the system</b></summary>

```
  User drags task          
       │                    
       ▼                    
  Socket emits ─────► Backend                      
  "task_move"        │                              
                     ├── Validates JWT             
                     ├── Checks project RBAC       
                     ├── Updates MongoDB position  
                     └── Broadcasts ─────► All clients in
                         "task_moved"             project room
                                                  (instant sync)
```

</details>

<br />

| Service | Stack | Purpose |
|---|---|---|
| 🟢 **`backend/`** | Node.js · Express 5 · Socket.IO 4 · Mongoose 9 · Redis · JWT · Razorpay · Brevo | REST API, real-time events, auth, RBAC, billing, plan limits |
| 🔵 **`frontend/`** | React 19 · Vite 8 · Router 7 · Zustand · socket.io-client · @hello-pangea/dnd | SPA — Kanban, chat, wiki editor, whiteboard, billing UI |
| 🟣 **`aiServices/`** | Python · FastAPI · LangChain · Groq · Pydantic | 4 microservices — code review, standups, bottlenecks, progress |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top"><b>🟢 Backend</b></td>
<td>Node.js 18+ · Express v5 · MongoDB (Mongoose v9) · Redis (ioredis) · Socket.IO v4 · JWT · Google OAuth · Brevo · Razorpay Orders API · ES Modules</td>
</tr>
<tr>
<td valign="top"><b>🔵 Frontend</b></td>
<td>React 19 · Vite 8 · React Router v7 · Zustand · Axios · socket.io-client · @hello-pangea/dnd · Excalidraw</td>
</tr>
<tr>
<td valign="top"><b>🟣 AI</b></td>
<td>Python 3.10+ · FastAPI · LangChain · Groq LLM · Pydantic · Multi-agent orchestration · SSE streaming</td>
</tr>
<tr>
<td valign="top"><b>☁️ Infra</b></td>
<td>MongoDB Atlas · Upstash Redis · Brevo SMTP · Razorpay · Google Cloud OAuth</td>
</tr>
</table>

---

## ⚡ Quick Start

> Get all three services running locally in under 5 minutes.

### Prerequisites

- **Node.js** v18+ · **Python** 3.10+
- **MongoDB Atlas** account (or local MongoDB)
- **Redis** *(optional — backend degrades gracefully)*

<br />

<details open>
<summary><b>1️⃣ &nbsp; Clone the repo</b></summary>

```bash
git clone <repo-url> DevCollab && cd DevCollab
```

</details>

<details open>
<summary><b>2️⃣ &nbsp; Backend</b> <i>(:3000)</i></summary>

```bash
cd backend
npm install
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL
npm run dev                # → http://localhost:3000
```

> 📖 Full env reference: [`backend/README.md`](backend/README.md)

</details>

<details open>
<summary><b>3️⃣ &nbsp; Frontend</b> <i>(:5173)</i></summary>

```bash
cd frontend
npm install
npm run dev                # → http://localhost:5173
```

</details>

<details>
<summary><b>4️⃣ &nbsp; AI Services</b> <i>(:8000+, optional)</i></summary>

Each AI service is a standalone FastAPI app. Run any subset you need.

```bash
cd aiServices/aiCodeReviewer
pip install -r requirements.txt
python api.py              # → http://localhost:8000
```

Repeat for `standupReport/`, `blocker/`, `progressSummary/`.

</details>

<details>
<summary><b>✅ &nbsp; Verify everything's running</b></summary>

```bash
curl http://localhost:3000
# { "message": "DevCollab Backend Is running" }
```

Open `http://localhost:5173` and you're in. 🎉

</details>

---

## 💎 Pricing

<div align="center">

|  | 🆓 **FREE** | 💎 **PRO** — ₹499 / year |
|---|:---:|:---:|
| **Workspaces owned** | 2 | ♾️ Unlimited |
| **Projects** per workspace | 3 | ♾️ Unlimited |
| **Members** per workspace | 4 | 50 |
| **Tasks** per project | 50 | ♾️ Unlimited |
| **Wiki pages** per project | 10 | ♾️ Unlimited |
| **Whiteboards** per project | 2 | ♾️ Unlimited |
| **Snippets** per project | 20 | ♾️ Unlimited |
| **AI requests** per month | 10 | 200 |

</div>

Subscription is **per user account** — the plan governs all workspaces the user owns. Limits enforced at the API layer via `planLimits` middleware. Upgrades flow through Razorpay's Orders API with HMAC-SHA256 signature verification — **no webhooks, no KYC, no friction**.

---

## 📁 Project Structure

```
DevCollab/
│
├── 🟢 backend/                    Node.js · Express 5 · Socket.IO
│   ├── controllers/              Domain handlers (auth, tasks, wiki, …)
│   ├── middleware/               auth · rbac · planLimits
│   ├── models/                   13 Mongoose schemas
│   ├── routes/                   Express routers (one per domain)
│   ├── sockets/                  kanbanSocket + whiteboardSocket
│   ├── main.js                   Entry point
│   └── README.md                 Setup & env reference
│
├── 🔵 frontend/                   React 19 · Vite SPA
│   └── src/                      Components · pages · store · hooks
│
├── 🟣 aiServices/                 FastAPI microservices
│   ├── aiCodeReviewer/           Multi-agent review (6 specialists)
│   ├── standupReport/            Auto standups from activity logs
│   ├── blocker/                  Bottleneck + dependency stall detection
│   └── progressSummary/          Project health + insights
│
└── 📚 docs/
    └── api/backend_api.md         Full REST + Socket.IO reference
```

---

## 📡 API at a Glance

```http
POST   /api/auth/register                                     Register
POST   /api/auth/login                                        Email/password
POST   /api/auth/google                                       Google OAuth

POST   /api/workspaces                                        Create workspace
POST   /api/workspaces/:wId/projects                          Create project
POST   /api/workspaces/:wId/projects/:pId/tasks               Create task
PATCH  /api/workspaces/:wId/projects/:pId/tasks/:tId          Update task
POST   /api/tasks/:taskId/comments                            Comment + @mentions

POST   /api/ai/review-code                                    AI code review
POST   /api/ai/standup                                        Generate standup
POST   /api/ai/bottleneck                                     Detect bottlenecks

POST   /api/subscriptions/subscribe                           Razorpay order (per-user)
POST   /api/subscriptions/verify                              HMAC verify → user upgraded to PRO
```

> 📖 **Full reference (30+ REST endpoints + 16 Socket.IO events):** [`docs/api/backend_api.md`](docs/api/backend_api.md)

---

## 🌟 What Makes It Different

<table>
<tr>
<td width="50%" valign="top">

#### ⚡ Real-time first
Every kanban move, comment, whiteboard stroke broadcasts instantly via Socket.IO rooms.

#### 🔐 Two-tier RBAC
Workspace roles + project roles, with workspace admins bypassing project checks.

#### 📜 Git-style wiki
Required commit messages (min 10 chars) on every content change. Full version history. Rollback any page.

</td>
<td width="50%" valign="top">

#### 🤖 Multi-agent AI
6 parallel specialists per code review — not a single-prompt pass. Streaming via SSE.

#### 💳 Friction-free billing
Razorpay Orders API means **no KYC for dev**, just test keys.

#### 🛡️ Graceful degradation
Redis is optional. AI services are optional. App keeps running.

</td>
</tr>
</table>

---

## 🗺️ Roadmap

- [x] Core REST API (workspaces, projects, tasks, RBAC)
- [x] Real-time Kanban with Socket.IO
- [x] Versioned wiki with commit messages
- [x] Collaborative whiteboard with Redis cache
- [x] @Mentions + notifications
- [x] AI code reviewer (6-agent pipeline)
- [x] AI standup / bottleneck / progress / task-breaker services
- [x] Razorpay billing — per-user subscription (Orders API, HMAC verify)
- [x] Google OAuth
- [x] Workspace ownership transfer
- [x] React SPA — Kanban, wiki, whiteboard, chat, snippets, AI panel
- [x] AI services integration with backend proxy + quota enforcement
- [x] Live typing indicators + real-time chat
- [x] Multi-theme system (Midnight, Caramel, and more)
- [ ] GitHub integration (commits → activity feed)
- [ ] Email digest summaries
- [ ] Mobile-responsive UI polish

---

## 👥 Team

Built by a 3-person hackathon squad in 10 days for **DevFusion 2.0**:

<table>
<tr>
<td align="center" width="33%">

🟢 **Backend**
<br /><sub>Aditya</sub>
<br /><br />
REST API · Real-time<br />RBAC · Billing · Infra

</td>
<td align="center" width="33%">

🔵 **Frontend**
<br /><sub>Savita</sub>
<br /><br />
React SPA · Kanban UI<br />Whiteboard · Wiki Editor

</td>
<td align="center" width="33%">

🟣 **AI Services**
<br /><sub>Suhani</sub>
<br /><br />
4 FastAPI services<br />Multi-agent · LangChain + Groq

</td>
</tr>
</table>

---

## 📖 Documentation

| Doc | What's inside |
|---|---|
| 🟢 [**Backend Setup**](backend/README.md) | Env vars · scripts · plan limits · verify steps |
| 📡 [**Full API Reference**](docs/api/backend_api.md) | Every REST endpoint · every Socket.IO event |
| 🟣 [**AI Services Overview**](aiServices/ai_services_documentation.md) | Architecture of all 4 microservices |
| 🤖 [**AI Technical Report**](aiServices/ai_services_technical_report.md) | Agent design · model choices · benchmarks |

---

## 🤝 Contributing

This is a hackathon project, but we welcome PRs and issues:

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

Released under the **ISC License** — see [`LICENSE`](LICENSE) for details.

<br />

<div align="center">

---

### **Made with ☕ and panic for DevFusion 2.0**

*If you ship faster with this, that's the whole point.*

<br />

⭐ **Star us on GitHub** if DevCollab saved your team some context-switching

<br />

</div>
