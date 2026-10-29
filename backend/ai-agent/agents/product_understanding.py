"""
GlobeX AI — Product Understanding & HS Code Candidate Identification
Normalizes product input, analyzes trade category, identifies candidate HS codes,
preserves classification uncertainty, and flags need for clarification.
"""
from __future__ import annotations

import json
import re
from typing import Any
from pydantic import BaseModel, Field

from utils.config import get_settings
from utils.logger import get_logger
from utils.gemini_status import is_gemini_auth_error

log = get_logger(__name__)
settings = get_settings()


class HSCandidate(BaseModel):
    hs_code: str = Field(..., description="Candidate HS Code (e.g. 1006.30 or 6204.62)")
    description: str = Field(..., description="Official Harmonized System classification heading description")
    confidence: str = Field(..., description="high, medium, or low confidence in candidate match")
    classification_status: str = Field("CANDIDATE", description="Always CANDIDATE unless supported by official binding tariff ruling")
    rationale: str = Field(..., description="Explanation of why this candidate code was selected")


class ProductNormalizationResult(BaseModel):
    raw_input: str = Field(..., description="Original raw user input")
    normalized_product_name: str = Field(..., description="Cleaned, standardized trade product name")
    category: str = Field(..., description="Broad export industry/commodity category")
    materials: list[str] = Field(default_factory=list, description="Known or inferred primary materials/ingredients")
    intended_use: str | None = Field(None, description="Inferred commercial or consumer use")
    candidate_hs_codes: list[HSCandidate] = Field(default_factory=list, description="Ranked candidate HS codes")
    is_definitive: bool = Field(False, description="Always False: AI classification is non-binding")
    needs_clarification: bool = Field(False, description="True if details are insufficient for specific tariff classification")
    clarification_questions: list[str] = Field(default_factory=list, description="Targeted questions to resolve classification ambiguity")
    classification_disclaimer: str = Field(
        "HS codes provided are candidate recommendations based on product descriptions. "
        "They do not constitute legally binding tariff determinations from customs authorities (e.g., CBIC/ICEGATE, US CBP).",
        description="Legal tariff disclaimer"
    )


def _clean_json_str(raw: Any) -> str:
    if isinstance(raw, list):
        raw = raw[0].get("text", "") if (raw and isinstance(raw[0], dict)) else str(raw[0] if raw else "")
    text = str(raw).strip()
    text = re.sub(r"```(?:json)?|```", "", text).strip()
    return text


async def understand_product(
    product_name: str,
    description: str | None = None,
    materials: list[str] | None = None,
) -> ProductNormalizationResult:
    """
    Normalize product information, extract candidate HS codes, and flag uncertainties.
    """
    raw_input = product_name.strip()
    if not raw_input:
        return ProductNormalizationResult(
            raw_input="",
            normalized_product_name="Unknown Product",
            category="Unspecified",
            candidate_hs_codes=[],
            is_definitive=False,
            needs_clarification=True,
            clarification_questions=["Please provide the name or description of your export product."],
        )

    # Heuristic fallback if LLM is unavailable or unconfigured
    if not settings.google_api_key or settings.google_api_key == "your_google_api_key_here":
        return _fallback_normalization(raw_input, description, materials)

    prompt = f"""You are a senior international trade customs classifier and product intelligence expert.
Analyze the following export product submission.

Product Name: {raw_input}
Optional Description: {description or 'N/A'}
Optional Materials: {', '.join(materials) if materials else 'N/A'}

Tasks:
1. Normalize the product name into a standard, clean international trade product title.
2. Identify the trade category (e.g., 'Agricultural Commodities & Spices', 'Textiles & Apparel', 'Engineering & Industrial', 'Chemicals & Pharmaceuticals', 'Ceramics & Minerals').
3. List known or likely primary materials/ingredients and intended commercial use.
4. Identify 1 to 3 CANDIDATE Harmonized System (HS / ITC-HS) codes (6-digit or 8-digit).
   - Label classification_status strictly as "CANDIDATE".
   - State clearly that candidate HS codes are advisory and not legally definitive.
   - Explain the rationale for each candidate.
5. If the product input is too vague or ambiguous (e.g., lacks fiber content, processing state, form, or grade), set needs_clarification to true and generate 1-3 specific clarification questions.

Return ONLY a valid JSON object matching this schema (no markdown, no backticks, no text outside JSON):
{{
  "raw_input": "{raw_input}",
  "normalized_product_name": "<standardized name>",
  "category": "<trade category>",
  "materials": ["<material 1>", "<material 2>"],
  "intended_use": "<commercial or consumer use>",
  "candidate_hs_codes": [
    {{
      "hs_code": "<e.g. 1006.30>",
      "description": "<official HS heading description>",
      "confidence": "<high|medium|low>",
      "classification_status": "CANDIDATE",
      "rationale": "<why this code fits>"
    }}
  ],
  "is_definitive": false,
  "needs_clarification": <true|false>,
  "clarification_questions": ["<question 1>"]
}}"""

    try:
        import asyncio
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.0,
            max_retries=0,
        )
        response = await asyncio.wait_for(llm.ainvoke(prompt), timeout=20.0)
        cleaned = _clean_json_str(response.content)
        parsed = json.loads(cleaned)
        
        # Ensure is_definitive is strictly False as per trade compliance rules
        parsed["is_definitive"] = False
        parsed["raw_input"] = raw_input
        return ProductNormalizationResult.model_validate(parsed)
    except Exception as exc:
        if is_gemini_auth_error(exc):
            log.warning("Gemini rejected GOOGLE_API_KEY during product understanding")
            from fastapi import HTTPException
            from utils.gemini_status import gemini_readiness
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(
                status_code=503,
                detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.",
            ) from exc
        log.warning("Product understanding LLM failed, using structured fallback", error=str(exc))
        return _fallback_normalization(raw_input, description, materials)


def _fallback_normalization(
    raw_input: str,
    description: str | None = None,
    materials: list[str] | None = None,
) -> ProductNormalizationResult:
    """Safe heuristic fallback when LLM is offline or returns invalid JSON."""
    normalized = raw_input.strip().title()
    category = "General Export Merchandise"
    candidates: list[HSCandidate] = []
    needs_clarification = True
    questions = [
        "What are the primary materials or active ingredients of this product?",
        "What is the intended end use or processing stage (raw, semi-finished, finished)?",
    ]

    lower = raw_input.lower()
    if any(w in lower for w in ["rice", "grain", "wheat", "cereal"]):
        category = "Agricultural Commodities & Cereals"
        candidates.append(HSCandidate(
            hs_code="1006.30",
            description="Semi-milled or wholly milled rice, whether or not polished or glazed",
            confidence="medium",
            classification_status="CANDIDATE",
            rationale="Standard chapter 10 heading for milled rice; verification of parboiling/processing required."
        ))
        needs_clarification = False
        questions = []
    elif any(w in lower for w in ["turmeric", "spice", "pepper", "ginger", "cardamom"]):
        category = "Spices & Agro-Food Products"
        candidates.append(HSCandidate(
            hs_code="0910.30",
            description="Turmeric (curcuma)",
            confidence="medium",
            classification_status="CANDIDATE",
            rationale="Chapter 09 classification for turmeric; clarify if whole, crushed, or ground."
        ))
        needs_clarification = False
        questions = []
    elif any(w in lower for w in ["garment", "shirt", "apparel", "textile", "cotton"]):
        category = "Textiles & Apparel"
        candidates.append(HSCandidate(
            hs_code="6204.62",
            description="Women's or girls' trousers, bib and brace overalls, breeches and shorts of cotton",
            confidence="low",
            classification_status="CANDIDATE",
            rationale="Generic apparel candidate; requires fiber composition and weave (knit vs woven)."
        ))
        questions = [
            "Is the garment knitted/crocheted (Chapter 61) or woven (Chapter 62)?",
            "What is the exact fiber composition percentage (e.g. 100% cotton vs synthetic blend)?"
        ]
    elif any(w in lower for w in ["tile", "ceramic", "porcelain"]):
        category = "Ceramics & Mineral Products"
        candidates.append(HSCandidate(
            hs_code="6907.21",
            description="Ceramic flags and paving, hearth or wall tiles, of water absorption coefficient by weight <= 0.5%",
            confidence="medium",
            classification_status="CANDIDATE",
            rationale="Heading 6907 for ceramic tiles; water absorption test certificate determines sub-heading."
        ))
        needs_clarification = False
        questions = []
    else:
        candidates.append(HSCandidate(
            hs_code="9999.99",
            description="Unclassified merchandise - requires customs documentation",
            confidence="low",
            classification_status="CANDIDATE",
            rationale="Insufficient product specification for preliminary candidate mapping."
        ))

    return ProductNormalizationResult(
        raw_input=raw_input,
        normalized_product_name=normalized,
        category=category,
        materials=materials or [],
        intended_use=description or "Commercial Export",
        candidate_hs_codes=candidates,
        is_definitive=False,
        needs_clarification=needs_clarification,
        clarification_questions=questions,
    )
