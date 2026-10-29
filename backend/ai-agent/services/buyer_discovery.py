"""
GlobeX AI — Grounded Buyer Discovery

Finds real buyer/importer candidates with Gemini's Google Search grounding
(the `google_search` tool) instead of letting the model invent companies.

Honesty rules enforced here:
  - Every returned company must be attributable to at least one Google Search
    grounding citation (via `groundingSupports` -> `groundingChunks`), or its
    website domain must appear in the grounding chunks. Companies without a
    citation are dropped and counted in `droppedForLackOfEvidence`.
  - The model is told to leave contact/volume fields null unless they were
    actually seen in search results; no revenue/headcount estimates.
  - If grounding yields nothing credible, the endpoint returns an honest
    empty result with a `note` — never fabricated companies.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from utils.config import get_settings
from utils.logger import get_logger

log = get_logger(__name__)
settings = get_settings()

PROVIDER_NAME = "gemini_google_search_grounding"
REQUEST_TIMEOUT_MS = 40_000  # stay under the TS provider's 45s timeout


class BuyerDiscoveryError(Exception):
    """Raised when grounded buyer discovery cannot run at all."""

    def __init__(self, message: str, retryable: bool = False):
        super().__init__(message)
        self.retryable = retryable


_HS_TOKEN_RE = re.compile(r"\bHS\s*(?:code\s*)?[:#]?\s*[\d.]{4,10}\b", re.IGNORECASE)
_PAREN_RE = re.compile(r"[\(\[][^\)\]]*[\)\]]")
_LONG_DIGIT_RE = re.compile(r"\b\d{4,10}\b")
_WS_RE = re.compile(r"\s+")


def _clean_product_for_search(product: str) -> str:
    """Reduce a free-form product string to search-friendly keywords.

    Users type things like "Premium basmati rice (HS 100630)". Quoting that
    verbatim in a web search reliably returns nothing, so strip parenthetical
    notes, explicit HS-code mentions and bare code numbers before searching.
    """
    cleaned = _PAREN_RE.sub(" ", product)
    cleaned = _HS_TOKEN_RE.sub(" ", cleaned)
    cleaned = _LONG_DIGIT_RE.sub(" ", cleaned)
    cleaned = _WS_RE.sub(" ", cleaned).strip(" -–—,")
    return cleaned or product.strip()


def _build_prompt(
    product: str,
    target_countries: list[str],
    category: str | None,
    hs_code: str | None,
) -> str:
    countries = ", ".join(target_countries) if target_countries else "any country"
    hs_clause = f" (HS code {hs_code})" if hs_code else ""
    category_clause = f" in the {category} category" if category else ""
    search_product = _clean_product_for_search(product)
    return f"""You are a B2B buyer discovery agent with Google Search access.

Task: use Google Search to find REAL companies that import, distribute, or wholesale-buy '{search_product}'{hs_clause}{category_clause} in: {countries}.

Search strategy (required):
- Run at least 2-3 DIFFERENT Google searches with varied phrasings for each target country, for example:
  - "{search_product} importers in <country>"
  - "{search_product} distributors <country>"
  - "wholesale {search_product} suppliers <country>"
- Do not stop after a single search. If one phrasing returns nothing useful, try the next one before concluding there are no results.

Strict rules:
- Every company you return MUST come from your search results. Never invent, guess, or recall a company from memory.
- For each company, sourceUrl MUST be the URL of the web page where you found evidence that it imports or distributes this kind of product.
- Only include website, email, phone or address if you actually saw them in the search results. Otherwise use null.
- Do NOT estimate or guess annual revenue, employee counts, or import volumes.
- Prefer companies that describe themselves as importers, distributors, wholesalers, or retailers of this product.
- Return at most 5 companies. If you cannot find real companies backed by a source, return an empty buyers array.

How to answer:
1. First, run your Google searches and briefly list the companies you found, each with the source URL where you saw it.
2. Then finish your reply with a single fenced JSON code block (```json ... ```) containing exactly this structure and nothing after it:
```json
{{
  "buyers": [
    {{
      "companyName": "<real company name>",
      "country": "<country>",
      "countryCode": "<2-letter ISO code>",
      "industry": "<industry>",
      "website": "<company website url or null>",
      "email": "<email seen in sources or null>",
      "phone": "<phone seen in sources or null>",
      "address": "<address seen in sources or null>",
      "sourceUrl": "<url of the page evidencing this company>"
    }}
  ]
}}
```"""


def _extract_grounding(response: Any) -> tuple[list[dict], list[dict], list[str]]:
    """Pull grounding chunks, supports and issued web queries out of a response."""
    chunks: list[dict] = []
    supports: list[dict] = []
    queries: list[str] = []

    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return chunks, supports, queries

    metadata = getattr(candidates[0], "grounding_metadata", None)
    if metadata is None:
        return chunks, supports, queries

    for chunk in getattr(metadata, "grounding_chunks", None) or []:
        web = getattr(chunk, "web", None)
        uri = getattr(web, "uri", None) if web else None
        if uri:
            chunks.append({"uri": uri, "title": getattr(web, "title", None)})

    for support in getattr(metadata, "grounding_supports", None) or []:
        segment = getattr(support, "segment", None)
        if segment is None:
            continue
        supports.append(
            {
                "start": getattr(segment, "start_index", None) or 0,
                "end": getattr(segment, "end_index", None) or 0,
                "indices": list(getattr(support, "grounding_chunk_indices", None) or []),
            }
        )

    queries = list(getattr(metadata, "web_search_queries", None) or [])
    return chunks, supports, queries


def _citations_for_span(
    name: str, text: str, chunks: list[dict], supports: list[dict]
) -> list[str]:
    """Grounding citation URIs whose supported text span covers the company name."""
    idx = text.lower().find(name.lower())
    if idx == -1:
        return []
    span = (idx, idx + len(name))
    uris: list[str] = []
    for support in supports:
        # overlap between the name occurrence and the supported segment
        if support["start"] < span[1] and span[0] < support["end"]:
            for i in support["indices"]:
                if i < len(chunks) and chunks[i]["uri"] not in uris:
                    uris.append(chunks[i]["uri"])
    return uris


def _host(url: str) -> str:
    match = re.search(r"://(?:www\.)?([^/?#]+)", url)
    return match.group(1).lower() if match else ""


def _parse_buyers_json(raw: str) -> dict | None:
    """Extract the fenced JSON block the prompt asks the model to finish with.

    The response is expected to be: search commentary with source URLs,
    then a ```json ... ``` block. Prefer that block; fall back to the
    widest {...} span so a plain-JSON response still parses.
    """
    text = raw.strip()
    fenced = re.findall(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL)
    candidates = [c.strip() for c in fenced if "{" in c]
    if not candidates:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            candidates.append(text[start : end + 1])
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(parsed, dict) and "buyers" in parsed:
            return parsed
    return None


def _clean_str(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


async def discover_buyers(
    product: str,
    target_countries: list[str] | None = None,
    category: str | None = None,
    hs_code: str | None = None,
) -> dict:
    """Grounded live buyer discovery. Never returns fabricated companies."""
    if not settings.google_api_key or settings.google_api_key == "your_google_api_key_here":
        raise BuyerDiscoveryError("LLM provider not configured (GOOGLE_API_KEY missing)", retryable=False)

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise BuyerDiscoveryError(f"google-genai SDK not installed: {exc}", retryable=False)

    countries = [c.strip() for c in (target_countries or []) if c and c.strip()]
    prompt = _build_prompt(product, countries, category, hs_code)

    client = genai.Client(
        api_key=settings.google_api_key,
        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
    )

    # gemini-3.6-flash intermittently skips the Google Search tool (the response
    # then contains no grounding metadata at all). One retry, only when the first
    # attempt was fast enough to stay under the TS provider's 45s timeout.
    import time

    deadline = time.monotonic() + (REQUEST_TIMEOUT_MS / 1000)
    response = None
    chunks: list[dict] = []
    supports: list[dict] = []
    queries: list[str] = []
    for attempt in (1, 2):
        try:
            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.0,
                ),
            )
        except Exception as exc:
            message = str(exc)
            retryable = any(
                token in message
                for token in ("429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE", "timeout", "Deadline")
            )
            log.warning("Grounded buyer discovery call failed", error=message, retryable=retryable)
            raise BuyerDiscoveryError(f"Grounded search failed: {message}", retryable=retryable)

        chunks, supports, queries = _extract_grounding(response)
        if chunks or time.monotonic() > deadline - 22:
            break
        log.warning("Grounded search returned no citations; retrying once", product=product, attempt=attempt)

    text = getattr(response, "text", None) or ""

    searched_at = datetime.now(timezone.utc).isoformat()
    base: dict[str, Any] = {
        "searchedAt": searched_at,
        "provider": PROVIDER_NAME,
        "groundingUsed": bool(chunks),
        "webSearchQueries": queries,
        "buyers": [],
        "droppedForLackOfEvidence": 0,
    }

    if not chunks:
        base["note"] = (
            "Live web search grounding was not available for this query, so no "
            "buyers could be returned. No companies are shown rather than invented ones."
        )
        log.warning("Buyer discovery returned no grounding chunks", product=product)
        return base

    parsed = _parse_buyers_json(text)
    if parsed is None or not isinstance(parsed.get("buyers"), list):
        base["note"] = (
            "The grounded search did not produce a usable company list for this query. "
            "No companies are shown rather than invented ones."
        )
        log.warning("Buyer discovery response was not parseable JSON", product=product)
        return base

    kept: list[dict] = []
    dropped = 0
    for raw_buyer in parsed["buyers"]:
        if not isinstance(raw_buyer, dict):
            continue
        name = _clean_str(raw_buyer.get("companyName"))
        if not name or len(name) < 3:
            continue

        website = _clean_str(raw_buyer.get("website"))
        model_source = _clean_str(raw_buyer.get("sourceUrl"))

        # Evidence: grounding citations covering the company name in the answer,
        # plus any citation on the same domain as the reported website/source.
        evidence = _citations_for_span(name, text, chunks, supports)
        for url in (website, model_source):
            host = _host(url) if url else ""
            if host:
                for chunk in chunks:
                    if host in _host(chunk["uri"]) and chunk["uri"] not in evidence:
                        evidence.append(chunk["uri"])

        if not evidence:
            dropped += 1
            continue

        email = _clean_str(raw_buyer.get("email"))
        kept.append(
            {
                "companyName": name,
                "country": _clean_str(raw_buyer.get("country")) or (countries[0] if countries else None),
                "countryCode": (_clean_str(raw_buyer.get("countryCode")) or "").upper() or None,
                "industry": _clean_str(raw_buyer.get("industry")),
                "website": website,
                "email": email if email and "@" in email else None,
                "phone": _clean_str(raw_buyer.get("phone")),
                "address": _clean_str(raw_buyer.get("address")),
                "importVolume": None,  # never estimated
                "isVerified": False,   # verification happens in the evidence pipeline
                "source": PROVIDER_NAME,
                "sourceUrl": evidence[0],
                "evidenceUrls": evidence,
            }
        )

    base["buyers"] = kept[:5]
    base["droppedForLackOfEvidence"] = dropped
    if not kept:
        base["note"] = (
            "Live web search did not surface any companies that could be tied to a "
            "citable source for this query. No companies are shown rather than invented ones."
        )
    return base
