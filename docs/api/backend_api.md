# Backend API Reference

**Base URL:** `http://localhost:3000/api`  
**Auth:** All routes except Register / Login / Google require `Authorization: Bearer <token>`

---

## Authentication

| Method | Endpoint | Body | Response |
|---|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` | `{ user: { id, name, email } }` |
| `POST` | `/auth/login` | `{ email, password }` | `{ token, user }` |
| `POST` | `/auth/google` | `{ credential }` | `{ token, user }` |
| `GET` | `/auth/me` | — | `{ user }` full profile |
| `PATCH` | `/auth/me` | `{ name?, bio?, avatar?, githubUrl?, skills? }` | `{ user }` |

---

## Workspaces

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces` | `{ name }` | Authenticated |
| `GET` | `/workspaces` | — | Authenticated |
| `PATCH` | `/workspaces/:workspaceId` | `{ name }` | OWNER |
| `DELETE` | `/workspaces/:workspaceId` | — | OWNER |
| `PATCH` | `/workspaces/:workspaceId/transfer-ownership` | `{ newOwnerId }` | OWNER |
| `POST` | `/workspaces/:workspaceId/invite` | `{ email, role? }` | ADMIN |
| `POST` | `/workspaces/invite/accept/:token` | — | Authenticated |
| `GET` | `/workspaces/:workspaceId/members` | — | VIEWER |
| `PATCH` | `/workspaces/:workspaceId/members/:userId/role` | `{ role }` | ADMIN |
| `DELETE` | `/workspaces/:workspaceId/members/:userId` | — | ADMIN |

---

## Projects

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects` | `{ name, description? }` | MEMBER |
| `GET` | `/workspaces/:wId/projects` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId` | `{ name?, description? }` | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId` | — | Project creator or ws OWNER/ADMIN |
| `GET` | `/workspaces/:wId/projects/:pId/members` | — | VIEWER |
| `POST` | `/workspaces/:wId/projects/:pId/members` | `{ userId, role? }` | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/members/:userId` | — | CONTRIBUTOR |

---

## Tasks

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/tasks` | `{ title, description?, status?, priority?, assignees?, dueDate?, labels?, attachments? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/tasks` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId/tasks/:taskId` | allowlisted fields (title, description, status, priority, assignees, dueDate, labels, attachments) | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/tasks/:taskId` | — | CONTRIBUTOR |

`status`: `TODO` `IN_PROGRESS` `IN_REVIEW` `DONE`  
`priority`: `P0` `P1` `P2`  
`assignees`: `[userId]` — multiple assignees (legacy single `assignee` still accepted and mirrored). Server sets `createdBy` and returns tasks with `assignees`/`createdBy` populated.  
`attachments`: `[{ url, name?, width?, height? }]` — uploaded via `/uploads/signature`, sent as URLs

---

## Task Comments

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| `POST` | `/tasks/:taskId/comments` | `{ content, projectId, replyTo? }` | Auto-parses `@username` → MENTION notification. Requires project membership. |
| `GET` | `/tasks/:taskId/comments` | — | Sorted oldest-first. Requires project membership. |
| `POST` | `/tasks/:taskId/comments/:commentId/react` | `{ emoji, projectId }` | Toggle reaction |
| `DELETE` | `/tasks/:taskId/comments/:commentId` | `{ projectId }` | Author / project contributor / ws admin |

> Comment routes resolve the task → project and enforce membership in-controller (the path has no workspace/project context for RBAC middleware).

---

## Chat

Project chat and workspace chat have full feature parity. A message needs `content`
OR at least one image `attachment`. Messages broadcast over Socket.IO.

**Project chat** — base `/workspaces/:wId/projects/:pId/chat` (all VIEWER):

| Method | Endpoint | Body |
|---|---|---|
| `POST` | `.../chat` | `{ content?, replyTo?, attachments? }` |
| `GET` | `.../chat` | — → `{ messages, reads }` |
| `GET` | `.../chat/search?q=` | — |
| `POST` | `.../chat/read` | — (marks read, emits seen-by) |
| `POST` | `.../chat/:messageId/react` | `{ emoji }` |
| `PATCH` | `.../chat/:messageId` | `{ content }` (author only) |
| `DELETE` | `.../chat/:messageId` | — (author only, soft-delete) |
| `POST` | `.../chat/:messageId/pin` | — (toggle) |
| `GET` | `/chat/unread` | — → per-project unread counts |

**Workspace chat** — base `/workspaces/:wId/chat`, same shape (send/get/search/read/react/edit/delete/pin), all VIEWER.

`attachments`: `[{ url, width?, height? }]` — uploaded via `/uploads/signature` then sent as URLs.

---

## Code Snippets

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/snippets` | `{ title, language, code, description?, tags? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/snippets` | — | VIEWER |
| `GET` | `/workspaces/:wId/projects/:pId/snippets/:id` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId/snippets/:id` | any fields | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/snippets/:id` | — | CONTRIBUTOR |

---

## Wiki

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/wiki` | `{ title, content? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/wiki` | — | VIEWER |
| `GET` | `/workspaces/:wId/projects/:pId/wiki/:pageId` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId/wiki/:pageId` | `{ title?, content?, commitMessage }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/wiki/:pageId/versions` | — | VIEWER |
| `DELETE` | `/workspaces/:wId/projects/:pId/wiki/:pageId` | — | CONTRIBUTOR |
| `PATCH` | `/workspaces/:wId/projects/:pId/wiki/:pageId/move` | `{ folderId }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/wiki/folders` | — | VIEWER |
| `POST` | `/workspaces/:wId/projects/:pId/wiki/folders` | `{ name, parentId? }` | CONTRIBUTOR |
| `PATCH` | `/workspaces/:wId/projects/:pId/wiki/folders/:folderId` | `{ name }` | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/wiki/folders/:folderId` | — | CONTRIBUTOR |

`commitMessage` is required (min 10 chars) when updating `content`. Folders nest one level deep.

---

## Whiteboards

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/whiteboards` | `{ name? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/whiteboards` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId/whiteboards/:whiteboardId` | `{ name }` | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/whiteboards/:whiteboardId` | — | CONTRIBUTOR |

---

## Notifications

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| `GET` | `/notifications/unread` | — | Returns unseen notifications |
| `PATCH` | `/notifications/mark-read` | — | Marks all as seen |
| `PATCH` | `/notifications/:id/read` | — | Mark one as seen |
| `GET` | `/notifications/vapid-public-key` | — | VAPID public key for web-push subscribe |
| `POST` | `/notifications/push/subscribe` | `{ subscription }` | Save a browser push subscription |
| `POST` | `/notifications/push/unsubscribe` | `{ endpoint }` | Remove a push subscription |

`type`: `MENTION` `PROJECT_ASSIGN` `ROLE_CHANGE`

> Notifications are created server-side (mentions, assignments, role changes); there is no client-callable create endpoint.

---

## Uploads

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/uploads/signature` | Returns `{ signature, timestamp, folder, apiKey, cloudName }` for a signed direct Cloudinary upload. The browser resizes the image and uploads straight to Cloudinary; the resulting URL is stored on the message/task. `503` if Cloudinary env vars are not configured. |

---

## Activity Feed

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/workspaces/:wId/projects/:pId/activity` | Latest 100 entries, populated user; supports filter query params |
| `GET` | `/workspaces/:wId/activity` | Workspace-scoped activity feed |

---

## AI

All endpoints require project CONTRIBUTOR and `projectId` in body (for workspace resolution + quota). Returns `403` when the per-user monthly quota is exceeded (quota is refunded if the downstream AI service errors). `review-code` routes to a different service by language (`python` / `javascript`·`typescript` / `java`·`c++`·`go`).

| Method | Endpoint | Body |
|---|---|---|
| `POST` | `/ai/review-code` | `{ code, language, snippetId?, projectId?, context?, weights? }` |
| `POST` | `/ai/standup` | `{ projectId }` |
| `POST` | `/ai/summarize-project` | `{ projectId }` |
| `POST` | `/ai/generate-tasks` | `{ projectId, featureDescription }` |
| `POST` | `/ai/bottleneck` | `{ projectId }` |

---

## Subscriptions

Subscription is **per-user** — no workspace context needed. The plan governs all workspaces the user owns.

| Method | Endpoint | Body | Auth |
|---|---|---|---|
| `POST` | `/subscriptions/subscribe` | — | Authenticated |
| `POST` | `/subscriptions/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | Authenticated |
| `POST` | `/subscriptions/cancel` | — | Authenticated |
| `GET` | `/subscriptions/status` | — | Authenticated |

`/subscribe` returns `{ orderId, amount, currency, keyId }` — pass directly to Razorpay checkout JS.  
`/verify` validates HMAC-SHA256 signature and upgrades the **user** to PRO (1-year access, ₹499).  
`/status` returns `{ plan, currentPeriodEnd, aiRequestsUsed, aiRequestsResetAt, limits }` where unlimited resources are serialized as `-1`.

---

## WebSocket Events

**Connection:** Socket.IO on `http://localhost:3000`. **Authenticated** — the client passes its JWT in `socket.handshake.auth.token`; the server verifies it and sets `socket.userId`. Connections without a valid token are rejected. Each socket also auto-joins a private `user:<userId>` room for targeted events (`new_notification`).

| Event | Direction | Payload |
|---|---|---|
| `user_online` | Client → Server | `{ name, avatar }` (identity/userId comes from the verified JWT, not this payload) |
| `join_project` | Client → Server | `projectId` |
| `leave_project` | Client → Server | `projectId` |
| `presence:join` / `presence:leave` / `presence:request` | Client → Server | `scopeKey` (e.g. `chat:<id>`, `wb:<id>`, `ws:<id>`) |
| `presence:scope_update` | Server → Room | `{ scopeKey, users }` |
| `presence:update` | Server → Room | `{ projectId, users }` |
| `task_move` | Client → Server | `{ taskId, projectId, newStatus, newPosition }` |
| `task_moved` | Server → Room | `{ taskId, status, position }` |
| `task_move_error` | Server → Client | `{ taskId }` |
| `task_comment_added` | Server → Room | comment object |
| `task_comment_deleted` | Server → Room | `{ commentId, taskId }` |
| `new_group_message` | Server → Room | message object |
| `new_notification` | Server → User | notification object |
| `join_whiteboard` | Client → Server | `whiteboardId` |
| `whiteboard_sync` | Server → Client | elements array |
| `whiteboard_draw` | Client → Server | `{ whiteboardId, elements }` |
| `whiteboard_update` | Server → Room | elements array |
| `save_whiteboard` | Client → Server | `{ whiteboardId, elements }` |
| `leave_whiteboard` | Client → Server | `whiteboardId` |
