# Contributing to DevCollab

Thanks for your interest in contributing! DevCollab is built by a small team
(Aditya · Savita · Suhani) and we welcome issues and pull requests.

## Project layout

DevCollab is three independent services — each with its own package manager:

| Path | Stack | Run |
|---|---|---|
| `backend/` | Node.js · Express 5 · Socket.IO · Mongoose | `cd backend && npm run dev` |
| `frontend/` | React 19 · Vite | `cd frontend && npm run dev` |
| `aiServices/` | Python · FastAPI · LangChain · Groq | `cd aiServices/<service> && python api.py` |

See [`backend/README.md`](backend/README.md) for environment setup and the full
env-var reference.

## Getting started

```bash
git clone <repo-url> DevCollab && cd DevCollab

# Backend
cd backend && npm install && cp .env.example .env   # fill in the required vars
npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Minimum env to boot the backend: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`FRONTEND_URL`. Everything else (Redis, Cloudinary, web-push, AI services) is
optional and degrades gracefully.

## Workflow

1. Create a feature branch — don't commit directly to `main`/`production`:
   `git checkout -b feat/short-description`
2. Make your change. Keep it focused — one logical change per PR.
3. **Run the backend tests** before opening a PR:
   ```bash
   cd backend && npm test
   ```
4. For frontend changes, make sure it builds: `cd frontend && npm run build`
5. Commit with a clear, conventional message (see below).
6. Push and open a Pull Request against `main`. Fill in the PR template.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) style:

```
feat: add multi-assignee support to tasks
fix: prevent duplicate socket joins on heartbeat
docs: update API reference for workspace chat
refactor: split main.js into app.js + bootstrap
```

## Code conventions

- **ES Modules** throughout (`"type": "module"`). No TypeScript — plain JS/JSX.
- Controllers export **named functions** (no classes).
- Mongoose models use **singular** names (`Task`, `Workspace`).
- Keep new code consistent with the surrounding file's style.
- Backend: scope every by-id query to its parent (`{ _id, project }`) — never
  trust an id alone (prevents IDOR). Allowlist fields on updates.
- Add a test in `backend/tests/` for new auth/RBAC/access-control behavior.

## Reporting bugs / requesting features

Open an issue with: what you expected, what happened, and steps to reproduce.
For anything security-related, **do not** open a public issue — see
[`SECURITY.md`](SECURITY.md).
