"""
GlobeX AI — Application Settings
Centralised Pydantic-based config loaded from environment / .env file.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Gemini ──────────────────────────────────────────────────────────────
    google_api_key: str = Field("", alias="GOOGLE_API_KEY")
    gemini_model: str = Field("gemini-3.6-flash", alias="GEMINI_MODEL")

    # ── ChromaDB ────────────────────────────────────────────────────────────
    chroma_persist_dir: Path = Field(Path("./database/chroma_db"), alias="CHROMA_PERSIST_DIR")
    chroma_collection_name: str = Field("globex_trade_knowledge", alias="CHROMA_COLLECTION_NAME")

    # ── FastAPI ─────────────────────────────────────────────────────────────
    app_host: str = Field("0.0.0.0", alias="APP_HOST")
    app_port: int = Field(8000, alias="APP_PORT")
    app_env: str = Field("development", alias="APP_ENV")
    debug: bool = Field(True, alias="DEBUG")
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        alias="CORS_ORIGINS",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [v]
        return v

    # ── Database ────────────────────────────────────────────────────────────
    database_url: str = Field(
        "sqlite+aiosqlite:///./database/globex_memory.db",
        alias="DATABASE_URL",
    )

    # ── RAG ─────────────────────────────────────────────────────────────────
    chunk_size: int = Field(1000, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(200, alias="CHUNK_OVERLAP")
    retriever_k: int = Field(5, alias="RETRIEVER_K")
    # Minimum cosine similarity for a retrieved chunk to be injected as context.
    # Chunks below this cutoff are treated as irrelevant (out-of-scope queries
    # score ~0.50, in-scope queries ~0.70+ on gemini-embedding-001).
    similarity_threshold: float = Field(0.6, alias="SIMILARITY_THRESHOLD")

    # ── Logging ─────────────────────────────────────────────────────────────
    log_level: str = Field("INFO", alias="LOG_LEVEL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
