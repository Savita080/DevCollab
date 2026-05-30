"""
api.py — FastAPI entry point for the Project Progress Summary service.

Architecture:
    This service is a PURE COMPUTE LAYER.
    The Node.js backend queries MongoDB, assembles the SummaryRequest payload,
    and POSTs it here. This service never touches MongoDB directly.

Endpoints:
    GET  /health          — health check
    POST /api/summarize   — generate full project summary
"""
from __future__ import annotations

import os
import sys
import time
from contextlib import asynccontextmanager

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import SummaryRequest, SummaryResponse
from report_generator import generate_summary


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🧠 Project Summary service starting …")
    print(f"   LLM Provider : {settings.LLM_PROVIDER}  ({settings.LLM_MODEL})")
    print(f"   Port         : {settings.PORT}")
    print(f"   Health weights: completion={settings.WEIGHT_COMPLETION_RATE}, "
          f"overdue={settings.WEIGHT_OVERDUE_PENALTY}, "
          f"velocity={settings.WEIGHT_VELOCITY}, "
          f"priority={settings.WEIGHT_PRIORITY_BALANCE}, "
          f"stale={settings.WEIGHT_STALE_PENALTY}")

    if settings.LLM_PROVIDER == "groq" and not settings.GROQ_API_KEY:
        print("   ⚠️  WARNING: GROQ_API_KEY not set — will use fallback narrative!")

    yield

    print("🛑 Project Summary service shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Project Progress Summary",
    description=(
        "AI-powered project health summary for DevCollab. "
        "Computes an ML health score (0–100) from task data and generates "
        "a structured summary with insights, velocity, deadlines, and member contributions."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
def health():
    """Service health check."""
    return {
        "status": "ok",
        "service": "project-progress-summary",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_configured": bool(settings.GROQ_API_KEY) if settings.LLM_PROVIDER == "groq" else True,
        "health_score_weights": {
            "completion_rate":  settings.WEIGHT_COMPLETION_RATE,
            "overdue_penalty":  settings.WEIGHT_OVERDUE_PENALTY,
            "velocity":         settings.WEIGHT_VELOCITY,
            "priority_balance": settings.WEIGHT_PRIORITY_BALANCE,
            "stale_penalty":    settings.WEIGHT_STALE_PENALTY,
        },
    }


# ── POST /api/summarize ───────────────────────────────────────────────────────

@app.post("/api/summarize", response_model=SummaryResponse, tags=["Summary"])
async def summarize(req: SummaryRequest):
    """
    Generate a full AI project summary.

    Pipeline:
        1. ML health score (5-signal weighted model)
        2. Rule-based insight detection
        3. Stats assembly (breakdown, velocity, deadlines, contributions)
        4. LLM narrative generation (Groq / OpenAI / fallback)
        5. Return structured SummaryResponse

    Raises:
        500: Unexpected error (LLM failures are handled gracefully internally)
    """
    t0 = time.monotonic()

    try:
        response = await generate_summary(req)
    except Exception as e:
        print(f"❌ Unexpected error in summarize endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

    duration_ms = int((time.monotonic() - t0) * 1000)
    response.duration_ms = duration_ms

    print(
        f"✅ Summary for '{req.project_name}' — "
        f"score={response.health_score.score} ({response.health_score.band}), "
        f"{len(req.tasks)} tasks, {duration_ms}ms"
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
