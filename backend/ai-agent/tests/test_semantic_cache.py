"""Unit tests for the semantic response cache.

Everything runs on a fake embedder + in-memory fake ChromaDB collection, so
these tests make ZERO Gemini API calls.
"""
import asyncio
import math
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.semantic_cache import (
    EMPTY_RESPONSE_FALLBACK_PREFIX,
    SemanticCache,
    is_time_sensitive_query,
)


def _norm(v):
    mag = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / mag for x in v]


class FakeCollection:
    """Minimal stand-in for a ChromaDB collection (cosine space)."""

    def __init__(self):
        self.entries = {}  # id -> (document, embedding, metadata)

    def count(self):
        return len(self.entries)

    def upsert(self, ids, documents, embeddings, metadatas):
        for i, doc, emb, meta in zip(ids, documents, embeddings, metadatas):
            self.entries[i] = (doc, _norm(emb), dict(meta))

    def delete(self, ids):
        for i in ids:
            self.entries.pop(i, None)

    def query(self, query_embeddings, n_results, include=None):
        q = _norm(query_embeddings[0])
        scored = []
        for i, (doc, emb, meta) in self.entries.items():
            sim = sum(a * b for a, b in zip(q, emb))
            scored.append((1.0 - sim, i, meta))  # distance = 1 - similarity
        scored.sort(key=lambda t: t[0])
        top = scored[:n_results]
        return {
            "ids": [[i for _, i, _ in top]],
            "distances": [[d for d, _, _ in top]],
            "metadatas": [[m for _, _, m in top]],
        }


def make_cache(*, threshold=0.90, ttl_seconds=3600, now=1_000.0):
    """Cache with scripted embeddings and a controllable clock."""
    vectors = {}
    state = {"now": now}

    def fake_embed(text):
        # Tests register exact vectors per text; unknown text gets a
        # deterministic junk vector far from everything registered.
        if text in vectors:
            return vectors[text]
        return [0.0, 0.0, 1.0]

    cache = SemanticCache(
        embed_fn=fake_embed,
        collection=FakeCollection(),
        threshold=threshold,
        ttl_seconds=ttl_seconds,
        time_fn=lambda: state["now"],
    )
    return cache, vectors, state


LONG_ANSWER = "India exported rice worth about 10 billion USD in 2025, led by basmati."


class TestSemanticCacheLookup(unittest.TestCase):
    def test_miss_on_empty_cache(self):
        cache, _, _ = make_cache()
        result = asyncio.run(cache.lookup("top rice markets"))
        self.assertIsNone(result)
        self.assertEqual(cache.misses, 1)
        self.assertEqual(cache.hits, 0)

    def test_hit_after_store(self):
        cache, vectors, _ = make_cache()
        vectors["top rice markets"] = [1.0, 0.0, 0.0]
        # near-paraphrase: cosine similarity ~0.995 with the stored vector
        vectors["which countries buy the most Indian rice"] = [1.0, 0.1, 0.0]

        stored = asyncio.run(
            cache.store("top rice markets", LONG_ANSWER, intent="top_export_markets")
        )
        self.assertTrue(stored)

        result = asyncio.run(cache.lookup("which countries buy the most Indian rice"))
        self.assertIsNotNone(result)
        self.assertEqual(result["response"], LONG_ANSWER)
        self.assertEqual(result["intent"], "top_export_markets")
        self.assertGreaterEqual(result["similarity"], 0.90)
        self.assertEqual(cache.hits, 1)

    def test_below_threshold_is_a_miss(self):
        cache, vectors, _ = make_cache()
        vectors["top rice markets"] = [1.0, 0.0, 0.0]
        # cosine similarity 0.6 with the stored entry: below the 0.90 bar
        vectors["how do I file a shipping bill"] = [0.6, 0.8, 0.0]

        asyncio.run(cache.store("top rice markets", LONG_ANSWER, intent="top_export_markets"))
        result = asyncio.run(cache.lookup("how do I file a shipping bill"))
        self.assertIsNone(result)
        self.assertEqual(cache.misses, 1)
        self.assertEqual(cache.hits, 0)

    def test_expired_entry_is_a_miss_and_gets_deleted(self):
        cache, vectors, state = make_cache(ttl_seconds=3600, now=1_000.0)
        vectors["top rice markets"] = [1.0, 0.0, 0.0]

        asyncio.run(cache.store("top rice markets", LONG_ANSWER, intent="top_export_markets"))

        state["now"] = 1_000.0 + 3601  # one second past the TTL
        result = asyncio.run(cache.lookup("top rice markets"))
        self.assertIsNone(result)
        self.assertEqual(cache._collection.count(), 0)  # stale entry evicted
        self.assertEqual(cache.misses, 1)

    def test_fresh_entry_within_ttl_still_hits(self):
        cache, vectors, state = make_cache(ttl_seconds=3600, now=1_000.0)
        vectors["top rice markets"] = [1.0, 0.0, 0.0]
        asyncio.run(cache.store("top rice markets", LONG_ANSWER, intent="top_export_markets"))

        state["now"] = 1_000.0 + 1800  # 30 min later, well within TTL
        result = asyncio.run(cache.lookup("top rice markets"))
        self.assertIsNotNone(result)
        self.assertEqual(cache.hits, 1)

    def test_lookup_on_unavailable_cache_is_safe(self):
        cache = SemanticCache()  # not initialised
        self.assertIsNone(asyncio.run(cache.lookup("anything")))
        self.assertFalse(asyncio.run(cache.store("q", LONG_ANSWER, intent="general_trade_query")))

    def test_stats_reflect_counters(self):
        cache, vectors, _ = make_cache()
        vectors["q"] = [1.0, 0.0, 0.0]
        asyncio.run(cache.store("q", LONG_ANSWER, intent="general_trade_query"))
        asyncio.run(cache.lookup("q"))
        asyncio.run(cache.lookup("unrelated question"))
        stats = cache.stats()
        self.assertEqual(stats["hits"], 1)
        self.assertEqual(stats["misses"], 1)
        self.assertEqual(stats["entries"], 1)
        self.assertTrue(stats["enabled"])
        self.assertEqual(stats["threshold"], 0.90)
        self.assertEqual(stats["ttl_seconds"], 3600)


class TestCacheabilityRules(unittest.TestCase):
    """What must never enter the cache."""

    def _stored(self, **kwargs):
        cache, _, _ = make_cache()
        return asyncio.run(cache.store("some trade question", LONG_ANSWER, **kwargs))

    def test_greeting_not_cached(self):
        self.assertFalse(self._stored(intent="greeting"))

    def test_off_topic_fallback_not_cached(self):
        # Off-topic refusals are the RAG guardrail's negative answers; caching
        # them would poison future lookups with refusals.
        self.assertFalse(self._stored(intent="off_topic"))

    def test_tool_backed_answer_not_cached(self):
        self.assertFalse(
            self._stored(intent="duty_calculation", tools_used=["duty_calculator"])
        )

    def test_empty_answer_guard_not_cached(self):
        cache, _, _ = make_cache()
        stored = asyncio.run(
            cache.store(
                "some trade question",
                EMPTY_RESPONSE_FALLBACK_PREFIX + " for that just now. Please try again.",
                intent="general_trade_query",
            )
        )
        self.assertFalse(stored)

    def test_time_sensitive_query_not_cached(self):
        cache, _, _ = make_cache()
        stored = asyncio.run(
            cache.store(
                "what is the latest US tariff on Indian steel",
                LONG_ANSWER,
                intent="general_trade_query",
            )
        )
        self.assertFalse(stored)

    def test_time_sensitive_lookup_bypasses_without_counting_miss(self):
        cache, _, _ = make_cache()
        result = asyncio.run(cache.lookup("latest export news today"))
        self.assertIsNone(result)
        self.assertEqual(cache.misses, 0)  # bypass, not a miss

    def test_trivially_short_answer_not_cached(self):
        cache, _, _ = make_cache()
        stored = asyncio.run(cache.store("q", "yes", intent="general_trade_query"))
        self.assertFalse(stored)

    def test_time_sensitive_detection(self):
        self.assertTrue(is_time_sensitive_query("latest tariff rates"))
        self.assertTrue(is_time_sensitive_query("What are the current US duties?"))
        self.assertTrue(is_time_sensitive_query("news about India EU FTA"))
        self.assertFalse(is_time_sensitive_query("what documents do I need to export rice"))
        self.assertFalse(is_time_sensitive_query("top export markets for turmeric"))


if __name__ == "__main__":
    unittest.main()
