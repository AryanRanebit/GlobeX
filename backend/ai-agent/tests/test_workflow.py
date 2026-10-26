"""
GlobeX AI — Phase 5 Python Unit & Integration Tests
Tests for Product Understanding and Market Research Hardening
"""

import sys
import os
import unittest
import asyncio

# Ensure ai-agent root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agents.product_understanding import (
    understand_product,
    _fallback_normalization,
    ProductNormalizationResult,
    HSCandidate
)
from routes.api import _build_limited_analysis_fallback, MarketResearchResponse


class TestProductUnderstanding(unittest.TestCase):
    def test_heuristic_fallback_known_product(self):
        """Test heuristic classification for a recognized export product."""
        result = _fallback_normalization("Basmati Rice")
        self.assertIsInstance(result, ProductNormalizationResult)
        self.assertEqual(result.normalized_product_name, "Basmati Rice")
        self.assertGreater(len(result.candidate_hs_codes), 0)
        
        # Verify candidate rules: NEVER legally definitive
        self.assertFalse(result.is_definitive)
        for cand in result.candidate_hs_codes:
            self.assertEqual(cand.classification_status, "CANDIDATE")
        self.assertIn("legally binding", result.classification_disclaimer.lower())

    def test_heuristic_fallback_unknown_product(self):
        """Test fallback preserves uncertainty when product details are unknown or insufficient."""
        result = _fallback_normalization("Quantum Widgets XYZ")
        self.assertIsInstance(result, ProductNormalizationResult)
        self.assertEqual(result.normalized_product_name, "Quantum Widgets Xyz")
        self.assertGreater(len(result.candidate_hs_codes), 0)
        self.assertTrue(result.needs_clarification)
        self.assertFalse(result.is_definitive)
        for cand in result.candidate_hs_codes:
            self.assertEqual(cand.classification_status, "CANDIDATE")

    def test_live_product_understanding_async(self):
        """Test async understand_product returns typed output."""
        async def run_async():
            res = await understand_product(
                "Organic Turmeric",
                description="Fine ground export turmeric powder",
                materials=["Curcuma longa"]
            )
            return res

        result = asyncio.run(run_async())
        self.assertIsInstance(result, ProductNormalizationResult)
        self.assertIn("Turmeric", result.normalized_product_name)
        self.assertGreater(len(result.candidate_hs_codes), 0)
        self.assertFalse(result.is_definitive)
        for cand in result.candidate_hs_codes:
            self.assertEqual(cand.classification_status, "CANDIDATE")


class TestMarketResearchHardening(unittest.TestCase):
    def test_limited_analysis_fallback(self):
        """Test fallback when AI provider or trade data is unavailable."""
        norm = _fallback_normalization("Handicraft Jute Bags")
        res = _build_limited_analysis_fallback(norm, ["United States"])
        
        self.assertIsInstance(res, MarketResearchResponse)
        data = res.model_dump()
        self.assertEqual(data["product"], "Handicraft Jute Bags")
        self.assertEqual(data["dataSourceMode"], "limited_offline_estimate")
        self.assertEqual(data["liveTradeDataProvider"], "none_configured")
        self.assertIn("advisory", data["disclaimer"].lower())
        self.assertGreater(len(data["recommendedCountries"]), 0)

        # Verify fallback includes candidate HS codes and valid competition metrics
        for c in data["recommendedCountries"]:
            self.assertIn("competition", c)
            self.assertIn(c["competition"], ["Low", "Medium", "High"])
            self.assertIn("demandScore", c)
            self.assertIn("growthRate", c)


if __name__ == "__main__":
    unittest.main()
