"""
GlobeX AI — Semantic Response Cache

Caches full agent answers keyed by query MEANING (embedding similarity), not
exact text. A repeat question phrased differently ("top markets for Indian
rice exports" vs "which countries import the most Indian rice") hits the
cache and skips Gemini generation entirely - only a cheap embedding call is
spent.

Design notes:
  - Entries live in a dedicated ChromaDB collection (cosine space), separate
    from the RAG knowledge base.
  - A hit requires similarity >= settings.semantic_cache_threshold (default
    0.90, deliberately stricter than the 0.6 RAG retrieval cutoff) AND a
    fresh timestamp (settings.semantic_cache_ttl_seconds, default 24h).
  - ChromaDB on Render is ephemeral: the cache simply re-warms after a
    restart. No persistence layer is built on purpose.
"""
from __future__ import annotations

import asyncio
import re
import time
import uuid
from typing import Any, Callable

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True
except ImportError:  # pragma: no cover - mirrors rag/pipeline.py
    chromadb = None
    ChromaSettings = None
    HAS_CHROMADB = False

from utils.config import get_settings
from utils.logger import get_logger

log = get_logger(__name__)
settings = get_settings()

# Exact prefix of the agent's guard text for an empty Gemini answer. Kept here
# (not in agents/) so both the agent and the cache import it without a cycle.
EMPTY_RESPONSE_FALLBACK_PREFIX = "I wasn't able to generate an answer"

# Intents whose answers are social filler or refusals - never worth caching.
_SKIP_INTENTS = {"greeting", "off_topic"}

# Queries asking for fresh/changing data are never cached; the TTL handles
# everything else. Deliberately simple - a false positive only costs one
# generation call, a false negative is caught by the TTL.
_TIME_SENSITIVE_RE = re.compile(
    r"\b(latest|today|tonight|right now|current|currently|recent|recently|"
    r"this week|this month|this year|news|live|as of|updated)\b",
    re.IGNORECASE,
)

# Embedder protocol: any sync callable text -> vector (e.g.
# GoogleGenerativeAIEmbeddings.embed_query). Injectable for tests.
EmbedFn = Callable[[str], list[float]]


def is_time_sensitive_query(query: str) -> bool:
    """Heuristic: does the query ask for data that changes often?"""
    return bool(_TIME_SENSITIVE_RE.search(query))


class SemanticCache:
    """Embedding-similarity cache for whole agent responses."""

    def __init__(
        self,
        *,
        embed_fn: EmbedFn | None = None,
        collection: Any | None = None,
        threshold: float | None = None,
        ttl_seconds: int | None = None,
        time_fn: Callable[[], float] | None = None,
    ) -> None:
        self._embed_fn = embed_fn
        self._collection = collection
        self.threshold = (
            threshold if threshold is not None else settings.semantic_cache_threshold
        )
        self.ttl_seconds = (
            ttl_seconds if ttl_seconds is not None else settings.semantic_cache_ttl_seconds
        )
        self._time_fn = time_fn or time.time
        self.available = collection is not None and embed_fn is not None
        self.reason: str | None = (
            None if self.available else "Semantic cache not initialised"
        )
        self.hits = 0
        self.misses = 0

    # ── Initialisation ───────────────────────────────────────────────────

    async def initialise(self, *, client: Any | None = None, embeddings: Any | None = None) -> None:
        """Set up the cache collection.

        Reuses the RAG pipeline's ChromaDB client / Gemini embedder when given
        (one process, one client per persist dir); otherwise creates its own.
        """
        if not HAS_CHROMADB:
            self.available = False
            self.reason = "ChromaDB is not installed"
            log.warning("ChromaDB not installed; semantic cache is disabled")
            return

        if client is None:
            settings.chroma_persist_dir.mkdir(parents=True, exist_ok=True)
            client = chromadb.PersistentClient(
                path=str(settings.chroma_persist_dir),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        if embeddings is None:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings

            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-001",
                google_api_key=settings.google_api_key,
            )

        self._embed_fn = embeddings.embed_query
        self._collection = client.get_or_create_collection(
            name=settings.semantic_cache_collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        self.available = True
        self.reason = None
        log.info("Semantic cache ready", entries=self._collection.count())

    # ── Cacheability ─────────────────────────────────────────────────────

    @staticmethod
    def is_cacheable(
        query: str,
        response_text: str,
        *,
        intent: str,
        tools_used: list[str] | None = None,
    ) -> bool:
        """Only stable, self-contained trade answers are cached.

        Skipped: greetings/off-topic refusals, tool-backed answers (computed
        from live inputs), the empty-answer guard, time-sensitive queries and
        degenerate responses.
        """
        if intent in _SKIP_INTENTS:
            return False
        if tools_used:
            return False
        if is_time_sensitive_query(query):
            return False
        text = (response_text or "").strip()
        if len(text) < 40:
            return False
        if text.startswith(EMPTY_RESPONSE_FALLBACK_PREFIX):
            return False
        return True

    # ── Lookup / store ───────────────────────────────────────────────────

    async def _embed(self, text: str) -> list[float]:
        assert self._embed_fn is not None
        return await asyncio.get_event_loop().run_in_executor(None, self._embed_fn, text)

    async def lookup(self, query: str) -> dict[str, Any] | None:
        """Return the cached entry for a semantically matching fresh query.

        A hit costs exactly one embedding API call and zero generation calls.
        Returns None (and counts a miss) on any failure so the agent falls
        through to the normal pipeline.
        """
        if not self.available or self._collection is None:
            return None
        if is_time_sensitive_query(query):
            return None  # bypass: not a miss, the query is uncacheable
        try:
            if self._collection.count() == 0:
                self.misses += 1
                return None
            embedding = await self._embed(query)
            results = self._collection.query(
                query_embeddings=[embedding],
                n_results=1,
                include=["metadatas", "distances"],
            )
            ids = results.get("ids", [[]])[0]
            if not ids:
                self.misses += 1
                return None
            distance = results["distances"][0][0]
            metadata = results["metadatas"][0][0] or {}
            # ChromaDB cosine space: distance = 1 - cosine similarity.
            similarity = 1.0 - distance
            if similarity < self.threshold:
                self.misses += 1
                log.info(
                    "Semantic cache miss (below threshold)",
                    similarity=round(similarity, 4),
                    threshold=self.threshold,
                    query=query[:80],
                )
                return None
            cached_at = float(metadata.get("cached_at", 0))
            age_seconds = self._time_fn() - cached_at
            if age_seconds > self.ttl_seconds:
                self.misses += 1
                try:
                    self._collection.delete(ids=[ids[0]])
                except Exception:
                    pass
                log.info(
                    "Semantic cache miss (entry expired)",
                    age_seconds=int(age_seconds),
                    ttl_seconds=self.ttl_seconds,
                    query=query[:80],
                )
                return None
            self.hits += 1
            log.info(
                "Semantic cache HIT",
                similarity=round(similarity, 4),
                age_seconds=int(age_seconds),
                query=query[:80],
            )
            return {
                "response": metadata.get("response", ""),
                "intent": metadata.get("intent", "general_trade_query"),
                "similarity": round(similarity, 4),
            }
        except Exception as exc:
            # A cache failure must never break the chat path.
            self.misses += 1
            log.warning("Semantic cache lookup failed", error=str(exc))
            return None

    async def store(
        self,
        query: str,
        response_text: str,
        *,
        intent: str,
        tools_used: list[str] | None = None,
    ) -> bool:
        """Cache a query + answer pair. Returns True when stored."""
        if not self.available or self._collection is None:
            return False
        if not self.is_cacheable(query, response_text, intent=intent, tools_used=tools_used):
            return False
        try:
            embedding = await self._embed(query)
            self._collection.upsert(
                ids=[f"cache-{uuid.uuid4()}"],
                documents=[query],
                embeddings=[embedding],
                metadatas=[
                    {
                        "response": response_text,
                        "intent": intent,
                        "cached_at": float(self._time_fn()),
                    }
                ],
            )
            log.info("Semantic cache stored", intent=intent, query=query[:80])
            return True
        except Exception as exc:
            log.warning("Semantic cache store failed", error=str(exc))
            return False

    # ── Observability ────────────────────────────────────────────────────

    def stats(self) -> dict[str, Any]:
        entries = 0
        if self.available and self._collection is not None:
            try:
                entries = self._collection.count()
            except Exception:
                entries = -1
        return {
            "enabled": self.available,
            "hits": self.hits,
            "misses": self.misses,
            "entries": entries,
            "threshold": self.threshold,
            "ttl_seconds": self.ttl_seconds,
        }


# ── Singleton ────────────────────────────────────────────────────────────────
semantic_cache = SemanticCache()
