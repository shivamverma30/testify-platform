"""Runtime configuration for TESTIFY AI service."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

# Load env from ai_service/.env first, then fallback to ambient environment.
load_dotenv(dotenv_path=ENV_PATH)
load_dotenv()


def get_gemini_api_key() -> Optional[str]:
    """Return Gemini API key from GEMINI_API_KEY or GOOGLE_API_KEY."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None

    normalized = api_key.strip()
    return normalized or None


GEMINI_API_KEY = get_gemini_api_key()


def require_gemini_api_key() -> str:
    """Return configured Gemini key or raise a clear startup error."""
    api_key = get_gemini_api_key()
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Set GEMINI_API_KEY (or GOOGLE_API_KEY) "
            "in ai_service/.env before starting the AI service.",
        )
    return api_key
