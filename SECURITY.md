# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in DevCollab, **please do not open a
public GitHub issue.** Public disclosure before a fix puts users at risk.

Instead, report it privately to the maintainers (Aditya · Savita · Suhani) via
**GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)**
("Report a vulnerability" under the repository's *Security* tab), or by emailing
the repository owner directly.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (or a proof of concept)
- The affected component (backend / frontend / an AI service) and route/file if known

We'll acknowledge your report as soon as we can and keep you updated on the fix.

## Scope

This is a student/hackathon project, but we take the basics seriously. Security
controls already in place:

- **JWT auth** on every protected REST route and on the Socket.IO handshake —
  socket identity is server-asserted from the verified token, never from client
  payloads.
- **Two-tier RBAC** (workspace + project roles) enforced in middleware.
- **Resource scoping** — by-id queries are scoped to their parent project to
  prevent cross-tenant access (IDOR), and updates use field allowlists.
- **Payment verification** via Razorpay HMAC-SHA256 signature checks.
- **Secrets** live only in `.env` (git-ignored) — never commit credentials.

## Out of scope

- The demo/test account and seeded demo data.
- Rate-limiting gaps and DoS on the free-tier hosting.
- Anything requiring a compromised maintainer account or host.

## Responsible disclosure

We ask that you give us a reasonable window to fix a reported issue before any
public disclosure. We appreciate good-faith research and will credit reporters
who want it.
