"""Wiring test: the agent chat path consults and fills the semantic cache.

LLM, classifier and embedder are all fakes - ZERO Gemini API calls.
"""
import asyncio
import math
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

# Point the agent at a throwaway SQLite database BEFORE importing any agent
# module, because database.models binds its engine at import time (same
# pattern as test_session_ownership.py). Importing the agent binds the engine
# for the whole test run; a fresh tmp db keeps every suite green.
_TMPDIR = tempfile.mkdtemp(prefix="globex-cache-test-")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMPDIR}/test.db"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agents import globex_agent as agent_module
from agents.globex_agent import GlobeXAgent
from services.semantic_cache import SemanticCache
from tests.test_semantic_cache import FakeCollection, LONG_ANSWER


class FakeMemory:
    def __init__(self):
        self.messages = []

    async def get_session_context_string(self, session_id):
        return ""

    async def build_langchain_history(self, session_id):
        return []

    async def add_message(self, session_id, role, content, tool_calls=None):
        self.messages.append((role, content))

    async def update_session_context(self, session_id, **kwargs):
        pass


class FakeLLMResponse:
    def __init__(self, text):
        self.content = text


class FakeLLM:
    def __init__(self, text):
        self.text = text
        self.calls = 0

    async def ainvoke(self, messages):
        self.calls += 1
        return FakeLLMResponse(self.text)


class ChatCacheWiringTests(unittest.TestCase):
    def _make_agent(self):
        agent = GlobeXAgent()
        agent._llm_instance = FakeLLM(LONG_ANSWER)

        async def fake_classify(user_message, session_context=""):
            return {"intent": "general_trade_query", "needs_rag": False,
                    "needs_tool": False, "entities": {}}

        agent._classify_intent = fake_classify
        return agent

    def _make_cache(self):
        def fake_embed(text):
            # every query embeds to the same direction: paraphrases collide,
            # which is exactly what a hit looks like
            return [1.0, 0.0, 0.0]

        return SemanticCache(
            embed_fn=fake_embed, collection=FakeCollection(),
            threshold=0.90, ttl_seconds=3600,
        )

    def test_first_turn_fills_cache_second_turn_hits(self):
        agent = self._make_agent()
        cache = self._make_cache()
        memory = FakeMemory()

        with patch.object(agent_module, "semantic_cache", cache):
            first = asyncio.run(agent.chat("s1", "top markets for Indian rice?", memory))
            self.assertFalse(first.get("cache_hit", False))
            self.assertEqual(agent._llm_instance.calls, 1)
            self.assertEqual(cache.stats()["entries"], 1)

            second = asyncio.run(agent.chat("s1", "which countries import the most Indian rice", memory))
            self.assertTrue(second.get("cache_hit", False))
            self.assertEqual(second["response"], LONG_ANSWER)
            # no further generation call was spent on the repeat question
            self.assertEqual(agent._llm_instance.calls, 1)
            # the cached turn is still recorded in session memory
            self.assertIn(("assistant", LONG_ANSWER), memory.messages)

    def test_off_topic_turn_is_never_cached(self):
        agent = self._make_agent()

        async def off_topic_classify(user_message, session_context=""):
            return {"intent": "off_topic", "needs_rag": False,
                    "needs_tool": False, "entities": {}}

        agent._classify_intent = off_topic_classify
        cache = self._make_cache()
        memory = FakeMemory()

        with patch.object(agent_module, "semantic_cache", cache):
            asyncio.run(agent.chat("s1", "write me a poem about cats", memory))
            self.assertEqual(cache.stats()["entries"], 0)


if __name__ == "__main__":
    unittest.main()
