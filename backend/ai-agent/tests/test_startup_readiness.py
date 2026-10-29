"""Regression tests for optional Gemini startup and explicit degraded responses."""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

AGENT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT_ROOT))

import app as app_module
from agents.globex_agent import GlobeXAgent
from rag.pipeline import rag_pipeline
from utils import gemini_status


class StartupReadinessTests(unittest.TestCase):
    def setUp(self):
        self.old_ready = gemini_status.gemini_readiness.available
        self.old_reason = gemini_status.gemini_readiness.reason
        self.old_rag_available = rag_pipeline.available
        self.old_rag_reason = rag_pipeline.reason

    def tearDown(self):
        gemini_status.gemini_readiness.available = self.old_ready
        gemini_status.gemini_readiness.reason = self.old_reason
        rag_pipeline.available = self.old_rag_available
        rag_pipeline.reason = self.old_rag_reason

    def test_invalid_key_still_serves_health_and_agent_returns_503(self):
        async def invalid_key():
            gemini_status.gemini_readiness.available = False
            gemini_status.gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            return False

        async def no_db():
            return None

        with patch.object(app_module, "validate_gemini_key", invalid_key), patch.object(app_module, "init_db", no_db):
            with TestClient(app_module.app) as client:
                health = client.get("/api/v1/health")
                self.assertEqual(health.status_code, 200)
                self.assertEqual(health.json()["status"], "degraded")
                self.assertIn("GOOGLE_API_KEY", health.json()["reason"])

                response = client.post(
                    "/api/v1/agents/lead-scoring",
                    json={"buyer": {"companyName": "Example Co"}},
                )
                self.assertEqual(response.status_code, 503)
                self.assertIn("GOOGLE_API_KEY", response.json()["detail"])

    def test_valid_key_startup_stays_operational_and_clients_are_lazy(self):
        async def valid_key():
            gemini_status.gemini_readiness.available = True
            gemini_status.gemini_readiness.reason = ""
            return True

        async def no_db():
            return None

        async def ready_rag():
            rag_pipeline.available = True
            rag_pipeline.reason = None

        with patch.object(app_module, "validate_gemini_key", valid_key), patch.object(app_module, "init_db", no_db), patch.object(rag_pipeline, "initialise", ready_rag):
            with TestClient(app_module.app) as client:
                health = client.get("/api/v1/health")
                self.assertEqual(health.status_code, 200)
                self.assertEqual(health.json()["status"], "ok")

        with patch("agents.globex_agent.ChatGoogleGenerativeAI") as client_factory:
            agent = GlobeXAgent()
            self.assertEqual(client_factory.call_count, 0)
            _ = agent._llm
            _ = agent._classifier_llm
            self.assertEqual(client_factory.call_count, 2)


if __name__ == "__main__":
    unittest.main()
