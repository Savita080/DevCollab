# Backend Architecture & Technologies

The DevCollab backend is built with a robust, modern Node.js stack designed for real-time collaboration, horizontal scalability, and seamless integration with multiple AI microservices. This document covers the core technologies, design choices, and architectural specs.

---

## 1. Core Stack

| Technology | Role | Details |
|---|---|---|
| **Node.js & Express** | API Server | Written using ES Modules (`"type": "module"` in `package.json`). Handles all REST HTTP requests and routes them to appropriate controllers. |
| **MongoDB & Mongoose** | Primary Database | Document-based NoSQL storage. Mongoose is used for strict schema validation, relations (via `ObjectId` refs), and lifecycle hooks. |
| **Socket.IO** | Real-time Engine | Powers live updates for chat, task board state (dragging cards), notifications, and collaborative whiteboards. |
| **Redis (`ioredis`)** | Caching & Pub/Sub | Used for high-speed caching and optionally as an adapter for Socket.IO when scaling across multiple Node.js instances. |

---

## 2. Authentication & Security

Security is handled via custom middleware and third-party integrations:

- **JWT (JSON Web Tokens)**: Used for stateless authentication. Upon successful login or registration, the backend issues a signed JWT (`jsonwebtoken`). This token is sent in the `Authorization: Bearer <token>` header for all protected routes.
- **Bcrypt**: All passwords are automatically salted and hashed using `bcrypt` before being stored in MongoDB. Plain text passwords never touch the database.
- **Google OAuth**: Integrated via `google-auth-library`. The frontend receives a Google credential token, passes it to the backend (`/auth/google`), which verifies the signature and either logs the user in or creates a new account automatically.
- **Role-Based Access Control (RBAC)**: Custom authorization logic exists across routes to enforce Workspace-level (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) and Project-level (`CONTRIBUTOR`, `VIEWER`) permissions.

---

## 3. Third-Party Integrations

### Brevo (Transactional Emails)
- **Purpose**: Sending invitations, notifications, and password resets.
- **Implementation**: Instead of relying on heavy SMTP packages, we use a lightweight native `fetch` implementation (`utils/email.js`) calling the `api.brevo.com/v3/smtp/email` endpoint.
- **Configuration**: Requires `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` in the `.env` file.

### Razorpay (Payments & Subscriptions)
- **Purpose**: Handling per-user PRO upgrades (₹499/year, one-time billing for hackathon demo).
- **Implementation**: We use the official `razorpay` npm package. The backend generates an order (`POST /subscriptions/subscribe`) which the frontend fulfills via the Razorpay checkout JS. Once paid, the frontend posts the transaction details to `POST /subscriptions/verify` where the backend validates the HMAC-SHA256 signature (`razorpay_signature`) to prevent fraud before upgrading the **user's** subscription plan. Subscription is scoped to the user account — all workspaces the user owns inherit their plan.

---

## 4. Real-time Communication (Sockets)

The `sockets/` directory manages all WebSocket events. The architecture uses Socket.IO "Rooms" heavily to partition data correctly:

- **Project Rooms**: Users join a specific project room (`join_project`) when they open a project. Events like `task_moved`, `task_comment_added`, and `new_group_message` are broadcast exclusively to that room to save bandwidth.
- **Whiteboard Rooms**: Separate rooms for collaborative drawing (`join_whiteboard`, `whiteboard_update`).
- **User Rooms**: Every connected user joins a private room based on their `userId` to receive private, targeted alerts like `new_notification`.

---

## 5. Interaction with AI Microservices

The Node.js backend acts as an orchestrator for several isolated Python/FastAPI microservices. It does **not** run LLM logic itself. 

- **Data Assembly**: The Node backend fetches the necessary context from MongoDB (e.g., fetching a task's full comment history).
- **Forwarding**: It packages this context into a JSON payload and makes an HTTP POST request to the relevant AI microservice (Code Reviewer, Blocker Identifier, etc.).
- **Quota Tracking**: The backend intercepts these requests to ensure the **user** hasn't exceeded their monthly AI request quota (10 FREE / 200 PRO) before forwarding. The counter resets monthly and lives on `User.subscription.aiRequestsUsed`.

---

## 6. Project Structure

- `/config` — DB connections and environment variables.
- `/controllers` — Business logic handling request/response formatting.
- `/middleware` — Auth guards (`protect`), RBAC checks, and error handlers.
- `/models` — Mongoose schemas (User, Workspace, Project, Task, Chat, etc.).
- `/routes` — Express route definitions.
- `/scripts` — Utility scripts (DB seeding, migrations).
- `/sockets` — Socket.IO event handlers and room management.
- `/utils` — Helpers (Brevo email sender, activity loggers, URL slug generators).
