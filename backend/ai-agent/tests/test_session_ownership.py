"""Regression tests for per-user chat session ownership (M4)."""
import asyncio
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# Point the agent at a throwaway SQLite database BEFORE importing the app,
# because the engine binds DATABASE_URL at import time.
_TMPDIR = tempfile.mkdtemp(prefix="globex-ownership-")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMPDIR}/test.db"

from fastapi.testclient import TestClient

AGENT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT_ROOT))

import app as app_module
from database.models import AsyncSessionFactory, Message, Session, init_db
from utils import gemini_status


async def _seed_sessions():
    async with AsyncSessionFactory() as db:
        db.add(Session(id="sess-alice", owner_id="user-alice"))
        db.add(Session(id="sess-delete", owner_id="user-alice"))
        db.add(Session(id="sess-legacy", owner_id=None))
        db.add(
            Message(id="msg-1", session_id="sess-alice", role="user", content="hello")
        )
        await db.commit()


async def _invalid_key():
    gemini_status.gemini_readiness.available = False
    gemini_status.gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
    return False


class SessionOwnershipTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())
        asyncio.run(_seed_sessions())

    def setUp(self):
        patcher = patch.object(app_module, "validate_gemini_key", _invalid_key)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(app_module.app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def test_history_requires_user_identity(self):
        res = self.client.get("/api/v1/sessions/sess-alice/history")
        self.assertEqual(res.status_code, 401)

    def test_owner_can_read_history(self):
        res = self.client.get(
            "/api/v1/sessions/sess-alice/history", headers={"X-User-Id": "user-alice"}
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["session_id"], "sess-alice")
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["messages"][0]["content"], "hello")

    def test_other_user_gets_404_not_content(self):
        res = self.client.get(
            "/api/v1/sessions/sess-alice/history", headers={"X-User-Id": "user-bob"}
        )
        self.assertEqual(res.status_code, 404)

    def test_session_info_enforces_ownership(self):
        res = self.client.get(
            "/api/v1/sessions/sess-alice", headers={"X-User-Id": "user-bob"}
        )
        self.assertEqual(res.status_code, 404)
        res = self.client.get(
            "/api/v1/sessions/sess-alice", headers={"X-User-Id": "user-alice"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["message_count"], 1)

    def test_delete_enforces_ownership(self):
        res = self.client.delete(
            "/api/v1/sessions/sess-delete", headers={"X-User-Id": "user-bob"}
        )
        self.assertEqual(res.status_code, 404)
        # Still there for the real owner
        res = self.client.get(
            "/api/v1/sessions/sess-delete", headers={"X-User-Id": "user-alice"}
        )
        self.assertEqual(res.status_code, 200)
        # Owner delete works
        res = self.client.delete(
            "/api/v1/sessions/sess-delete", headers={"X-User-Id": "user-alice"}
        )
        self.assertEqual(res.status_code, 200)
        res = self.client.get(
            "/api/v1/sessions/sess-delete", headers={"X-User-Id": "user-alice"}
        )
        self.assertEqual(res.status_code, 404)

    def test_legacy_unowned_session_is_inaccessible(self):
        res = self.client.get(
            "/api/v1/sessions/sess-legacy/history", headers={"X-User-Id": "user-alice"}
        )
        self.assertEqual(res.status_code, 404)

    def test_new_session_created_with_owner(self):
        async def scenario():
            async with AsyncSessionFactory() as db:
                from memory.memory_manager import MemoryManager

                memory = MemoryManager(db, owner_id="user-carol")
                await memory.add_message("sess-carol", "user", "hi")
                session = await memory.get_or_create_session("sess-carol")
                return session.owner_id

        self.assertEqual(asyncio.run(scenario()), "user-carol")


if __name__ == "__main__":
    unittest.main()
