"""
api.py — FastAPI service for the Daily Standup Report generator.

This service is a PURE COMPUTE LAYER — it never touches MongoDB directly.
The Node.js backend is responsible for:
  1. Querying MongoDB for all relevant data (tasks, messages, wiki, etc.)
  2. Assembling the data into a StandupRequest payload
  3. POSTing the payload to POST /api/standup

This service then:
  1. Determines report type based on user's workspace role
  2. Runs the Activity Pulse calculator (pure math)
  3. Runs AI summarisation for chat and wiki changes
  4. Generates the final personalised standup report
  5. Returns the structured StandupResponse JSON

Architecture follows the same pattern as the blocker service:
  Node backend (data layer) → Python service (compute/AI layer)
"""
from __future__ import annotations

import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

# Ensure the current directory is in the Python path
# (needed when running with uvicorn from a different directory)
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import StandupRequest, StandupResponse
from report_generator import generate_report


# ── Lifespan (startup/shutdown hooks) ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.

    Startup: Log service info and verify LLM configuration.
    Shutdown: Clean up resources (none currently, but hook is ready).
    """
    print("📊 Standup Report service starting …")
    print(f"   LLM Provider: {settings.LLM_PROVIDER}")
    print(f"   Port: {settings.PORT}")
    print(f"   Activity Pulse weights: chat={settings.WEIGHT_CHAT}, "
          f"tasks={settings.WEIGHT_TASKS}, wiki={settings.WEIGHT_WIKI}")

    if not settings.GROQ_API_KEY and settings.LLM_PROVIDER == "groq":
        print("   ⚠️  WARNING: GROQ_API_KEY not set — LLM features will fail!")

    yield  # App is running

    print("🛑 Standup Report service shutting down.")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Standup Report Generator",
    description=(
        "AI-powered daily standup report service for DevCollab. "
        "Generates personalised reports based on the user's workspace role: "
        "admin (bird's-eye view) or contributor (detailed per-project view). "
        "Uses LLMs for chat summarisation and project highlights."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Node backend and frontend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
def health():
    """
    Health check endpoint for monitoring and load balancers.

    Returns:
        Service status, LLM configuration state, and Activity Pulse weights.
    """
    return {
        "status": "ok",
        "service": "standup-report-generator",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_configured": bool(settings.GROQ_API_KEY) if settings.LLM_PROVIDER == "groq" else True,
        "activity_pulse_weights": {
            "chat": settings.WEIGHT_CHAT,
            "tasks": settings.WEIGHT_TASKS,
            "wiki": settings.WEIGHT_WIKI,
        },
    }


# ── POST /api/standup — Main endpoint ────────────────────────────────────────

@app.post("/api/standup", response_model=StandupResponse, tags=["Standup"])
async def standup(req: StandupRequest):
    """
    Generate a personalised daily standup report.

    This endpoint receives pre-assembled data from the Node backend and
    produces a standup report tailored to the user's workspace role.

    Request body (StandupRequest):
        - user_workspace_role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
        - user_name: Display name for the greeting
        - workspace_name: For the admin-level summary
        - projects: List of ProjectPayload (one per project)
        - workspace_data: Optional workspace-level data (for admins)

    Response (StandupResponse):
        - For OWNER/ADMIN: workspace summary + per-project admin cards
        - For MEMBER/VIEWER: per-project detailed contributor reports

    Pipeline:
        1. Validate the request has at least one project.
        2. Route to admin or contributor generator based on role.
        3. Calculate Activity Pulse per project (pure math).
        4. Run chat + wiki summarisation in parallel (LLM calls).
        5. Assemble the final response with timing metadata.

    Raises:
        422: If no projects are provided.
        500: If an unexpected error occurs (LLM failures are handled gracefully).
    """
    # ── Validation ────────────────────────────────────────────────────────────
    if not req.projects:
        raise HTTPException(
            status_code=422,
            detail="No projects provided. The user must be a member of at least one project.",
        )

    # ── Timing ────────────────────────────────────────────────────────────────
    t0 = time.monotonic()

    # ── Generate the report ───────────────────────────────────────────────────
    response = await generate_report(req)

    # ── Attach timing metadata ────────────────────────────────────────────────
    duration_ms = int((time.monotonic() - t0) * 1000)
    response.duration_ms = duration_ms

    print(
        f"✅ Generated {response.report_type} report for {req.user_name} "
        f"({len(req.projects)} projects) in {duration_ms}ms"
    )

    return response


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
    )
