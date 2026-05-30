# AI Code Reviewers

> Multi-agent code review orchestration pipelines — v2.0.0

[![Stack](https://img.shields.io/badge/stack-Python%20%2F%20FastAPI-blue)](https://fastapi.tiangolo.com)
[![LLM](https://img.shields.io/badge/LLM-Groq-orange)](https://groq.com)
[![Trigger](https://img.shields.io/badge/trigger-manual%20%28Node%20backend%29-green)]()

---

## Table of Contents

1. [Overview](#1-overview)
2. [Language-Specific Preflight Checks](#2-language-specific-preflight-checks)
3. [The Orchestration Pipeline](#3-the-orchestration-pipeline)
4. [Agent Capabilities](#4-agent-capabilities)
5. [Streaming Support (SSE)](#5-streaming-support-sse)

---

## 1. Overview

DevCollab runs **three distinct code reviewers** as isolated microservices to handle different language ecosystems efficiently:
1. `aiCodeReviewer` (Python)
2. `jsReviewer` (JavaScript / TypeScript)
3. `compiledCodeReviewer` (Java, C++, Go, etc.)

They all share the same REST API interface (`/review`, `/review/stream`), the same LangChain orchestration logic, and the same underlying LLM criteria agents. However, they differ drastically in their **Preflight Static Analysis**.

---

## 2. Language-Specific Preflight Checks

Before any expensive LLM calls are made, the code runs through a language-specific static analysis step called the "Preflight".

### `aiCodeReviewer` (Python)
- Uses `ast.parse` for strict syntax validation.
- Uses `vulture` for detecting dead code (unused imports, variables, functions).
- Employs a custom Tree-sitter integration to strip out large commented-out blocks.

### `jsReviewer` (JS/TS)
- Relies heavily on AST parsing specific to ECMAScript.
- Identifies dangling promises and unused imports.
- Adapts to JSX/TSX syntax gracefully, ensuring UI components are structurally sound before the LLM runs.

### `compiledCodeReviewer` (Compiled Languages)
- Uses Tree-sitter to parse the code into an AST without requiring a full compiler toolchain.
- Validates basic syntactic correctness and strips comments to ensure the LLM focuses on structural integrity.

*(If any preflight check finds a fatal syntax error, the pipeline halts immediately, returning the syntax error and saving LLM tokens).*

---

## 3. The Orchestration Pipeline

If the code passes the preflight check, the orchestrator begins:

1. **Numbered Code Generation**: The valid code is transformed to include `[L<n>]` prefixes on every line. This helps the LLM accurately reference line numbers in its feedback.
2. **Agent Parallelization**: The orchestrator spins up multiple LangChain agents simultaneously via `asyncio.gather()`.
3. **Scoring & Synthesis**: The results from all agents are aggregated. A final `weighted_score` is computed based on the weights provided in the request payload (e.g., placing a higher priority on Security vs Clean Code).

---

## 4. Agent Capabilities

The multi-agent system runs specialized criteria agents:

- **CleanCodeAgent**: Checks for unused variables and dead code (often fed directly from the preflight results).
- **SyntaxAgent**: Looks for logical bugs or bad practices that static analysis missed.
- **SecurityAgent**: Scans for vulnerabilities (e.g., SQL injection, XSS, hardcoded secrets).
- **ReadabilityAgent**: Evaluates naming conventions, complexity, and documentation.
- **PerformanceAgent**: Suggests optimizations (e.g., N+1 queries, memory leaks).
- **RobustnessAgent**: Checks error handling and edge cases.

---

## 5. Streaming Support (SSE)

Because running 6 LLM agents can take several seconds, the reviewers expose a `POST /review/stream` endpoint.

Using Server-Sent Events (SSE), the Node backend can stream individual agent results to the frontend UI as soon as they finish, providing a real-time, responsive experience to the user rather than waiting for the entire block to resolve.
