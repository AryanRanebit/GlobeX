"""Runtime readiness checks for the optional Gemini provider."""
from __future__ import annotations

from dataclasses import dataclass

import httpx

from utils.config import get_settings
from utils.logger import get_logger

log = get_logger(__name__)

INVALID_KEY_REASON = "invalid or missing GOOGLE_API_KEY"
GEMINI_UNAVAILABLE_DETAIL = (
    "Gemini is unavailable because GOOGLE_API_KEY is missing or invalid. "
    "Configure a valid key and restart the service."
)


@dataclass
class GeminiReadiness:
    available: bool = False
    reason: str = INVALID_KEY_REASON


gemini_readiness = GeminiReadiness()


def configured_key() -> str:
    return (get_settings().google_api_key or "").strip()


async def validate_gemini_key() -> bool:
    """Probe the models endpoint without allowing provider errors to stop boot."""
    key = configured_key()
    if not key or key == "your_google_api_key_here":
        gemini_readiness.available = False
        gemini_readiness.reason = INVALID_KEY_REASON
        log.warning("Gemini is not configured; AI endpoints will return 503")
        return False

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                params={"key": key},
            )
        if response.is_success:
            gemini_readiness.available = True
            gemini_readiness.reason = ""
            return True
        if response.status_code in (400, 401, 403):
            gemini_readiness.available = False
            gemini_readiness.reason = INVALID_KEY_REASON
            log.warning("Gemini rejected GOOGLE_API_KEY", status=response.status_code)
            return False
        gemini_readiness.available = False
        gemini_readiness.reason = "Gemini provider is temporarily unavailable"
        log.warning("Gemini readiness probe failed", status=response.status_code)
        return False
    except Exception as exc:
        gemini_readiness.available = False
        gemini_readiness.reason = "Gemini provider could not be reached"
        log.warning("Gemini readiness probe could not reach provider", error=str(exc))
        return False


def is_gemini_auth_error(exc: Exception) -> bool:
    """Identify common provider responses for rejected or expired API keys."""
    message = str(exc).lower()
    return any(
        marker in message
        for marker in (
            "api key not valid",
            "invalid api key",
            "api_key_invalid",
            "api key expired",
            "permission_denied",
            "unauthenticated",
            "invalid_argument",
        )
    ) and ("key" in message or "unauthenticated" in message or "permission_denied" in message)


def require_gemini() -> None:
    """Raise an API 503 unless startup has confirmed Gemini is ready."""
    from fastapi import HTTPException, status

    if not gemini_readiness.available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=GEMINI_UNAVAILABLE_DETAIL,
        )
