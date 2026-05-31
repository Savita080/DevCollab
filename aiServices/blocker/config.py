"""
config.py — Centralised settings loaded from .env
"""
from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── MongoDB ────────────────────────────────────────────────────────────────
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "devcollab")

    # ── Grok
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    GROK_MODEL: str = os.getenv("GROK_MODEL", "grok-3-mini")
    # ── Stall-detection thresholds ─────────────────────────────────────────────
    # Z-score threshold corresponding to the 95th percentile (1.645)
    STALL_Z_THRESHOLD: float = float(os.getenv("STALL_Z_THRESHOLD", "1.645"))

    # Minimum historical samples required before the log-normal model is trusted
    MIN_HISTORICAL_SAMPLES: int = int(os.getenv("MIN_HISTORICAL_SAMPLES", "5"))

    # Fallback static stall threshold in hours (used when not enough history)
    STATIC_STALL_HOURS: float = float(os.getenv("STATIC_STALL_HOURS", "72"))

    # ── Priority decay constants (λ) ───────────────────────────────────────────
    # Higher λ → faster urgency build-up for higher-priority tasks.
    LAMBDA_P0: float = float(os.getenv("LAMBDA_P0", "0.05"))   # P0 ≈ critical
    LAMBDA_P1: float = float(os.getenv("LAMBDA_P1", "0.02"))   # P1 ≈ high
    LAMBDA_P2: float = float(os.getenv("LAMBDA_P2", "0.008"))  # P2 ≈ normal

    # ── NLP thresholds ─────────────────────────────────────────────────────────
    # Cosine-similarity cut-off for classifying a task as "semantically blocked"
    COSINE_THRESHOLD: float = float(os.getenv("COSINE_THRESHOLD", "0.65"))

    # VADER compound score below which a comment is deemed negative
    SENTIMENT_NEGATIVE_THRESHOLD: float = float(
        os.getenv("SENTIMENT_NEGATIVE_THRESHOLD", "-0.3")
    )

    # ── Server ─────────────────────────────────────────────────────────────────
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))
    RELOAD: bool = os.getenv("RELOAD", "true").lower() == "true"
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")


settings = Settings()
