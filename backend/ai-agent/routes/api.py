"""
GlobeX AI — FastAPI Routes
REST API endpoints for chat, sessions, tools, and RAG management.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from agents.globex_agent import globex_agent
from agents.product_understanding import understand_product, ProductNormalizationResult
from database.models import Session, get_db
from memory.memory_manager import MemoryManager
from rag.pipeline import rag_pipeline
from services.buyer_discovery import BuyerDiscoveryError, discover_buyers
from tools.trade_tools import (
    country_rules,
    duty_calculator,
    hs_code_lookup,
    invoice_generator,
    packing_list_generator,
)
from utils.config import get_settings
from utils.logger import get_logger
from utils.gemini_status import gemini_readiness, is_gemini_auth_error, require_gemini

log = get_logger(__name__)
settings = get_settings()
router = APIRouter()


# ── Session ownership ────────────────────────────────────────────────────────
# The Express backend verifies the user's JWT and forwards the authenticated
# user id as X-User-Id. The header is only ever set server-side after auth;
# client-supplied identity is never trusted (the backend overwrites it).

async def get_owner_id(x_user_id: str | None = Header(default=None)) -> str | None:
    """Authenticated user id forwarded by the Express backend, if present."""
    return x_user_id


async def require_owner_id(x_user_id: str | None = Header(default=None)) -> str:
    """Require the backend-forwarded authenticated user id."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing authenticated user identity.")
    return x_user_id


def _ensure_session_access(session: "Session | None", owner_id: str) -> Session:
    """404 unless the session exists and belongs to this user.

    Returns 404 (not 403) so session ids of other users cannot be probed.
    Legacy sessions with no owner predate ownership and are inaccessible.
    """
    if session is None or session.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ── Request / Response Schemas ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str | None = Field(None, description="Existing session ID; omit to start new session")
    message: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    session_id: str
    response: str
    intent: str
    tools_used: list[str]
    rag_used: bool
    tool_results: dict[str, Any]


class SessionInfo(BaseModel):
    session_id: str
    company_name: str | None
    product_category: str | None
    destination_country: str | None
    message_count: int


class HSCodeRequest(BaseModel):
    product_name: str


class DutyRequest(BaseModel):
    product: str
    destination_country: str
    product_value_usd: float
    hs_code: str = ""


class CountryRulesRequest(BaseModel):
    country: str
    product_category: str = ""


class InvoiceRequest(BaseModel):
    seller_name: str
    seller_address: str
    buyer_name: str
    buyer_address: str
    product_description: str
    quantity: float
    unit: str
    unit_price_usd: float
    incoterm: str = "FOB"
    payment_terms: str = "T/T 30 days"
    country_of_origin: str = "India"
    hs_code: str = ""
    freight_usd: float = 0.0
    insurance_usd: float = 0.0


class PackingListRequest(BaseModel):
    shipper_name: str
    consignee_name: str
    product_description: str
    number_of_packages: int
    package_type: str
    gross_weight_per_package_kg: float
    net_weight_per_package_kg: float
    dimensions_cm: str
    marks_and_numbers: str = "As per Commercial Invoice"


class RAGQueryRequest(BaseModel):
    query: str
    category: str | None = None
    k: int = 5


# ── Agent Specific Request Schemas ───────────────────────────────────────────

class BuyerDiscoveryAgentRequest(BaseModel):
    product: str
    target_countries: list[str] | None = None
    category: str | None = None
    hs_code: str | None = None

class ProductUnderstandingRequest(BaseModel):
    product_name: str
    description: str | None = None
    materials: list[str] | None = None

class MarketResearchRequest(BaseModel):
    product: str
    target_regions: list[str] | None = None
    user_industry: str | None = None
    description: str | None = None
    materials: list[str] | None = None

class MarketResearchCountry(BaseModel):
    country: str
    countryCode: str
    demandScore: int = Field(..., ge=0, le=100)
    growthRate: str
    competition: str
    marketSize: str | None = None
    trend: str | None = None
    insights: str
    dataReliability: str = "estimate"

class MarketResearchResponse(BaseModel):
    product: str
    category: str
    candidateHsCodes: list[dict[str, Any]] = Field(default_factory=list)
    analyzedAt: str
    summary: str
    dataSourceMode: str = "ai_qualitative_estimate"
    liveTradeDataProvider: str = "none_configured"
    recommendedCountries: list[MarketResearchCountry]
    disclaimer: str


class LeadScoringAgentRequest(BaseModel):
    buyer: dict[str, Any]
    product: dict[str, Any] | None = None


class OutreachAgentRequest(BaseModel):
    buyer: dict[str, Any]
    sender: dict[str, Any]
    tone: str
    language: str
    custom_context: str | None = None


class ComplianceAgentRequest(BaseModel):
    product: str
    destination_country: str = "Germany"
    hs_code: str | None = None
    origin_country: str = "India"


# ── Chat Endpoints ───────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse, summary="Main agent chat endpoint")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    owner_id: str | None = Depends(get_owner_id),
) -> ChatResponse:
    """
    Send a message to GlobeX AI and receive a complete response.
    The agent will:
    - Classify intent
    - Retrieve relevant RAG context
    - Call tools if needed
    - Return a structured, personalised response
    """
    require_gemini()
    if request.session_id:
        existing = (
            await db.execute(select(Session).where(Session.id == request.session_id))
        ).scalar_one_or_none()
        if existing is not None:
            _ensure_session_access(existing, owner_id or "")
    session_id = request.session_id or str(uuid.uuid4())
    memory = MemoryManager(db, owner_id=owner_id)

    try:
        result = await globex_agent.chat(
            session_id=session_id,
            user_message=request.message,
            memory=memory,
        )
        return ChatResponse(session_id=session_id, **result)
    except Exception as exc:
        log.error("Chat error", error=str(exc), session_id=session_id)
        message = str(exc).lower()
        if is_gemini_auth_error(exc) or any(marker in message for marker in ("api key not valid", "invalid api key", "permission_denied", "unauthenticated", "api_key_invalid")):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Agent request failed. Please try again.",
        )


@router.post("/chat/stream", summary="Streaming chat endpoint (Server-Sent Events)")
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    owner_id: str | None = Depends(get_owner_id),
) -> StreamingResponse:
    """Stream the agent response token-by-token using SSE."""
    require_gemini()
    if request.session_id:
        existing = (
            await db.execute(select(Session).where(Session.id == request.session_id))
        ).scalar_one_or_none()
        if existing is not None:
            _ensure_session_access(existing, owner_id or "")
    session_id = request.session_id or str(uuid.uuid4())
    memory = MemoryManager(db, owner_id=owner_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        yield f'data: {{"session_id": "{session_id}"}}\n\n'
        try:
            async for token in globex_agent.chat_stream(session_id, request.message, memory):
                yield f"data: {{\"token\": {json.dumps(token)}}}\n\n"
        except Exception as exc:
            yield f'data: {{"error": {json.dumps(str(exc))}}}\n\n'
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Session-Id": session_id},
    )


# ── Session Endpoints ────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}", response_model=SessionInfo)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    owner_id: str = Depends(require_owner_id),
) -> SessionInfo:
    """Retrieve session information and context (owner only)."""
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == session_id)
    )
    session = _ensure_session_access(result.scalar_one_or_none(), owner_id)

    msg_count = len(session.messages)

    return SessionInfo(
        session_id=session.id,
        company_name=session.company_name,
        product_category=session.product_category,
        destination_country=session.destination_country,
        message_count=msg_count,
    )


@router.get("/sessions/{session_id}/history")
async def get_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    owner_id: str = Depends(require_owner_id),
) -> dict:
    """Get conversation history for a session (owner only)."""
    existing = (
        await db.execute(select(Session).where(Session.id == session_id))
    ).scalar_one_or_none()
    _ensure_session_access(existing, owner_id)
    memory = MemoryManager(db, owner_id=owner_id)
    history = await memory.get_conversation_history(session_id)
    return {"session_id": session_id, "messages": history, "count": len(history)}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    owner_id: str = Depends(require_owner_id),
) -> dict:
    """Delete a session and all its messages (owner only)."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = _ensure_session_access(result.scalar_one_or_none(), owner_id)
    await db.delete(session)
    await db.commit()
    return {"message": f"Session {session_id} deleted"}


# ── Direct Tool Endpoints ────────────────────────────────────────────────────

@router.post("/tools/hs-code", summary="Direct HS Code Lookup")
async def lookup_hs_code(request: HSCodeRequest) -> dict:
    """Look up HS code for a product directly."""
    require_gemini()
    try:
        return await hs_code_lookup.ainvoke({"product_name": request.product_name})
    except Exception as exc:
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(status_code=500, detail="The request could not be completed.")


@router.post("/tools/duty-calculator", summary="Import Duty Calculator")
async def calculate_duty(request: DutyRequest) -> dict:
    """Calculate import duty for a product and country."""
    require_gemini()
    try:
        return await duty_calculator.ainvoke(request.model_dump())
    except Exception as exc:
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(status_code=500, detail="The request could not be completed.")


@router.post("/tools/country-rules", summary="Country Trade Rules")
async def get_country_rules(request: CountryRulesRequest) -> dict:
    """Get trade rules for a specific country."""
    require_gemini()
    try:
        return await country_rules.ainvoke(request.model_dump())
    except Exception as exc:
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(status_code=500, detail="The request could not be completed.")


@router.post("/tools/invoice", summary="Generate Commercial Invoice")
async def generate_invoice(request: InvoiceRequest) -> dict:
    """Generate a commercial invoice for an export shipment."""
    try:
        return await invoice_generator.ainvoke(request.model_dump())
    except Exception as exc:
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(status_code=500, detail="The request could not be completed.")


@router.post("/tools/packing-list", summary="Generate Packing List")
async def generate_packing_list(request: PackingListRequest) -> dict:
    """Generate a packing list for an export shipment."""
    try:
        return await packing_list_generator.ainvoke(request.model_dump())
    except Exception as exc:
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(status_code=500, detail="The request could not be completed.")


# ── RAG Endpoints ────────────────────────────────────────────────────────────

@router.post("/rag/query", summary="Direct RAG Knowledge Query")
async def query_knowledge_base(request: RAGQueryRequest) -> dict:
    """Query the trade knowledge base directly."""
    require_gemini()
    if not rag_pipeline.available:
        raise HTTPException(status_code=503, detail=rag_pipeline.reason or "RAG is unavailable.")
    try:
        chunks = await rag_pipeline.retrieve(request.query, k=request.k, category_filter=request.category)
        return {
            "query": request.query,
            "results": chunks,
            "count": len(chunks),
            "total_documents": rag_pipeline.document_count,
        }
    except Exception as exc:
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(status_code=500, detail="The request could not be completed.")


@router.get("/rag/status", summary="RAG System Status")
async def rag_status() -> dict:
    """Check the status of the RAG knowledge base."""
    if rag_pipeline.available:
        return {
            "status": "operational",
            "document_count": rag_pipeline.document_count,
            "collection": "globex_trade_knowledge",
        }
    return {
        "status": "degraded",
        "reason": rag_pipeline.reason or "RAG is unavailable",
        "document_count": rag_pipeline.document_count,
        "collection": "globex_trade_knowledge",
    }


# ── Agent Specific Endpoints ──────────────────────────────────────────────────

ISO3_TO_ISO2: dict[str, str] = {
    "ABW": "AW", "AFG": "AF", "AGO": "AO", "AIA": "AI", "ALA": "AX",
    "ALB": "AL", "AND": "AD", "ARE": "AE", "ARG": "AR", "ARM": "AM",
    "ATF": "TF", "ATG": "AG", "AUS": "AU", "AUT": "AT", "AZE": "AZ",
    "BDI": "BI", "BEL": "BE", "BEN": "BJ", "BES": "BQ", "BFA": "BF",
    "BGD": "BD", "BGR": "BG", "BHR": "BH", "BHS": "BS", "BIH": "BA",
    "BLM": "BL", "BLR": "BY", "BLZ": "BZ", "BMU": "BM", "BOL": "BO",
    "BRA": "BR", "BRB": "BB", "BRN": "BN", "BTN": "BT", "BWA": "BW",
    "CAF": "CF", "CAN": "CA", "CHE": "CH", "CHL": "CL", "CHN": "CN",
    "CIV": "CI", "CMR": "CM", "COD": "CD", "COG": "CG", "COL": "CO",
    "COM": "KM", "CPV": "CV", "CRI": "CR", "CUB": "CU", "CUW": "CW",
    "CYM": "KY", "CYP": "CY", "CZE": "CZ", "DEU": "DE", "DJI": "DJ",
    "DMA": "DM", "DNK": "DK", "DOM": "DO", "DZA": "DZ", "ECU": "EC",
    "EGY": "EG", "ERI": "ER", "ESH": "EH", "ESP": "ES", "EST": "EE",
    "ETH": "ET", "FIN": "FI", "FJI": "FJ", "FRA": "FR", "FRO": "FO",
    "FSM": "FM", "GAB": "GA", "GBR": "GB", "GEO": "GE", "GHA": "GH",
    "GIB": "GI", "GIN": "GN", "GMB": "GM", "GNB": "GW", "GNQ": "GQ",
    "GRC": "GR", "GRD": "GD", "GRL": "GL", "GTM": "GT", "GUM": "GU",
    "GUY": "GY", "HKG": "HK", "HND": "HN", "HRV": "HR", "HTI": "HT",
    "HUN": "HU", "IDN": "ID", "IND": "IN", "IOT": "IO", "IRL": "IE",
    "IRN": "IR", "IRQ": "IQ", "ISL": "IS", "ISR": "IL", "ITA": "IT",
    "JAM": "JM", "JOR": "JO", "JPN": "JP", "KAZ": "KZ", "KEN": "KE",
    "KGZ": "KG", "KHM": "KH", "KIR": "KI", "KNA": "KN", "KOR": "KR",
    "KWT": "KW", "LAO": "LA", "LBN": "LB", "LBR": "LR", "LBY": "LY",
    "LCA": "LC", "LIE": "LI", "LKA": "LK", "LSO": "LS", "LTU": "LT",
    "LUX": "LU", "LVA": "LV", "MAC": "MO", "MAF": "MF", "MAR": "MA",
    "MCO": "MC", "MDA": "MD", "MDG": "MG", "MDV": "MV", "MEX": "MX",
    "MHL": "MH", "MKD": "MK", "MLI": "ML", "MLT": "MT", "MMR": "MM",
    "MNE": "ME", "MNG": "MN", "MOZ": "MZ", "MRT": "MR", "MSR": "MS",
    "MTQ": "MQ", "MUS": "MU", "MWI": "MW", "MYS": "MY", "MYT": "YT",
    "NAM": "NA", "NCL": "NC", "NER": "NE", "NGA": "NG", "NIC": "NI",
    "NLD": "NL", "NOR": "NO", "NPL": "NP", "NRU": "NR", "NZL": "NZ",
    "OMN": "OM", "PAK": "PK", "PAN": "PA", "PER": "PE", "PHL": "PH",
    "PLW": "PW", "PNG": "PG", "POL": "PL", "PRI": "PR", "PRK": "KP",
    "PRT": "PT", "PRY": "PY", "PSE": "PS", "PYF": "PF", "QAT": "QA",
    "REU": "RE", "ROU": "RO", "RUS": "RU", "RWA": "RW", "SAU": "SA",
    "SDN": "SD", "SEN": "SN", "SGP": "SG", "SHN": "SH", "SJM": "SJ",
    "SLB": "SB", "SLE": "SL", "SLV": "SV", "SMR": "SM", "SOM": "SO",
    "SPM": "PM", "SRB": "RS", "SSD": "SS", "STP": "ST", "SUR": "SR",
    "SVK": "SK", "SVN": "SI", "SWE": "SE", "SWZ": "SZ", "SXN": "SX",
    "SYC": "SC", "SYR": "SY", "TCA": "TC", "TCD": "TD", "TGO": "TG",
    "THA": "TH", "TJK": "TJ", "TKM": "TM", "TLS": "TL", "TON": "TO",
    "TTO": "TT", "TUN": "TN", "TUR": "TR", "TUV": "TV", "TWN": "TW",
    "TZA": "TZ", "UGA": "UG", "UKR": "UA", "UNK": "XK", "URY": "UY",
    "USA": "US", "UZB": "UZ", "VCT": "VC", "VEN": "VE", "VGB": "VG",
    "VIR": "VI", "VNM": "VN", "VUT": "VU", "WLF": "WF", "WSM": "WS",
    "XKX": "XK", "YEM": "YE", "ZAF": "ZA", "ZMB": "ZM", "ZWE": "ZW",
}


async def _fetch_trade_market_data(hs_code: str = "62", year: str = "2025") -> dict | None:
    """Fetch live or seeded UN Comtrade market data from the Node backend."""
    backend_url = os.getenv("NODE_BACKEND_URL", "http://localhost:3000").rstrip("/")
    url = f"{backend_url}/api/v1/trade/markets?hs={hs_code}&year={year}&limit=10"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                payload = resp.json()
                rows = payload.get("data") or payload.get("markets") or []
                if rows and len(rows) > 0:
                    return {
                        "markets": rows,
                        "meta": payload.get("meta", {}),
                    }
    except Exception as exc:
        log.warning("Could not fetch trade market data from Node backend", error=str(exc), url=url)
    return None


@router.post("/agents/product-understanding", summary="Product Understanding & Candidate HS Lookup")
async def agent_product_understanding(request: ProductUnderstandingRequest) -> dict:
    """Normalize product description and identify candidate HS codes."""
    require_gemini()
    try:
        res = await understand_product(request.product_name, request.description, request.materials)
        return res.model_dump()
    except HTTPException:
        raise
    except Exception as exc:
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(status_code=503, detail="Product understanding is temporarily unavailable.")


@router.post("/agents/market-research", summary="Agent Market Research")
async def agent_market_research(request: MarketResearchRequest) -> dict:
    """Analyze export markets for a product, grounded on verified UN Comtrade trade data."""
    require_gemini()
    try:
        # Step 1: Understand and normalize product
        norm = await understand_product(
            product_name=request.product,
            description=request.description,
            materials=request.materials,
        )

        # Step 2: Determine appropriate HS code from candidate codes or product description
        target_hs = "TOTAL"
        matched_candidate = None
        for cand in norm.candidate_hs_codes:
            clean_code = cand.hs_code.replace(".", "").strip()
            if clean_code.startswith("62") or "apparel" in norm.category.lower() or "garment" in request.product.lower():
                target_hs = "62"
                matched_candidate = cand
                break

        lower_query = (request.product + " " + (request.description or "")).lower()
        if any(w in lower_query for w in ["apparel", "garment", "shirt", "clothing", "trouser", "dress", "jacket", "cotton"]):
            target_hs = "62"

        # Non-apparel products: use the top candidate HS code from product
        # understanding (dots stripped, e.g. "0910.30" -> "091030") so the
        # analysis is scoped to the product's commodity instead of HS TOTAL.
        if target_hs == "TOTAL" and norm.candidate_hs_codes:
            top_clean = norm.candidate_hs_codes[0].hs_code.replace(".", "").strip()
            if top_clean:
                target_hs = top_clean
                matched_candidate = norm.candidate_hs_codes[0]

        trade_info = await _fetch_trade_market_data(target_hs)
        if not trade_info and target_hs != "TOTAL":
            trade_info = await _fetch_trade_market_data("TOTAL")

        # Step 3: Handle trade data unavailable (strict fallback without inventing figures)
        if not trade_info:
            return MarketResearchResponse(
                product=norm.normalized_product_name,
                category=norm.category,
                candidateHsCodes=[c.model_dump() for c in norm.candidate_hs_codes],
                analyzedAt=datetime.now().isoformat(),
                summary=f"Trade market flow data for {norm.normalized_product_name} is currently unavailable. The official UN Comtrade trade data feed is offline or unseeded for this commodity.",
                dataSourceMode="unavailable",
                liveTradeDataProvider="unavailable",
                recommendedCountries=[
                    MarketResearchCountry(
                        country="Destination Data Unavailable",
                        countryCode="XX",
                        demandScore=0,
                        growthRate="N/A",
                        competition="Medium",
                        marketSize="Not available from free data",
                        trend="N/A",
                        insights="Official customs trade data could not be retrieved from the database or Comtrade API. Artificial trade statistics are strictly disabled.",
                        dataReliability="unavailable",
                    )
                ],
                disclaimer="Trade statistics unavailable. GlobeX does not generate or simulate artificial trade numbers."
            ).model_dump()

        # Step 4: Ground recommendations on verified UN Comtrade data
        markets = trade_info["markets"]
        meta = trade_info.get("meta", {})
        world_total_usd = meta.get("worldTotalUsd")
        if world_total_usd and world_total_usd >= 1e9:
            world_total_str = f"${world_total_usd / 1e9:.2f}B USD"
        elif world_total_usd:
            world_total_str = f"${world_total_usd / 1e6:.1f}M USD"
        else:
            world_total_str = "N/A"

        cmd_code = meta.get("cmdCode", target_hs)
        cmd_desc = meta.get("cmdDescription", "Commodity")

        # Prior-year lookup so growth is only reported when real data exists for both years
        prior_year = str(int(meta.get("period", "2025")) - 1)
        prior_info = await _fetch_trade_market_data(cmd_code, prior_year)
        prior_by_partner: dict[str, float] = {}
        if prior_info:
            for pm in prior_info["markets"]:
                prior_by_partner[pm.get("partnerName", "")] = float(pm.get("indiaExportValueUsd") or pm.get("tradeValueUsd") or 0.0)

        top_markets = markets[:5]
        max_fob = max((float(m.get("indiaExportValueUsd") or m.get("tradeValueUsd") or 0.0) for m in top_markets), default=0.0)
        period_label = meta.get("period", "2025")
        scope_note = (
            f"HS {cmd_code} ({cmd_desc})" if cmd_code != "TOTAL"
            else "all goods (no product-specific HS data is seeded for this product, so this is India's overall export picture, not this product's)"
        )

        recommended_countries: list[MarketResearchCountry] = []
        for idx, m in enumerate(top_markets):
            partner = m.get("partnerName", "Unknown")
            iso3 = m.get("partnerIso3", "XX") or "XX"
            iso2 = ISO3_TO_ISO2.get(iso3, "XX")
            fob_val = float(m.get("indiaExportValueUsd") or m.get("tradeValueUsd") or 0.0)
            fob_str = f"${fob_val / 1e9:.2f}B" if fob_val >= 1e9 else f"${fob_val / 1e6:.1f}M"
            share_pct = float(m.get("shareOfIndiaExportsPct") or m.get("shareOfTotal") or 0.0)

            # Computed score: this market's India-reported export value as a % of the largest
            # market in the list. It measures existing trade-lane size only, not future demand.
            score = round(100 * fob_val / max_fob) if max_fob > 0 else 0

            prior_val = prior_by_partner.get(partner)
            if prior_val and prior_val > 0:
                growth = f"{(fob_val / prior_val - 1) * 100:+.1f}% vs {prior_year}"
            else:
                growth = f"Not available (no {prior_year} data seeded)"

            recommended_countries.append(MarketResearchCountry(
                country=partner,
                countryCode=iso2,
                demandScore=score,
                growthRate=growth,
                competition="N/A",
                marketSize="Not available from free data",
                trend=f"#{idx + 1} destination by {period_label} export value",
                insights=(
                    f"India-reported exports (FOB): {fob_str} ({share_pct:.1f}% of India's exports in scope). "
                    f"UN Comtrade {period_label} rank #{idx + 1}. "
                    f"Competition and destination market size: not available from this data."
                ),
                dataReliability=f"official_un_comtrade_{period_label}",
            ))

        # Step 5: Optionally enrich with qualitative LLM strategic context (without modifying trade numbers)
        if settings.google_api_key and settings.google_api_key != "your_google_api_key_here":
            try:
                summary_countries_str = "\n".join([
                    f"- {c.country} ({c.countryCode}): India FOB Exports = {c.insights.split('.')[0]}, Rank #{i+1}"
                    for i, c in enumerate(recommended_countries)
                ])
                enrich_prompt = f"""You are a senior trade economist. Provide brief qualitative export intelligence for an Indian exporter selling:
Product: {norm.normalized_product_name} (HS {cmd_code}: {cmd_desc})

Official UN Comtrade 2025 Export Destinations for India:
{summary_countries_str}

Task:
For each of these exact countries, provide 1 concise sentence of qualitative market intelligence (e.g. key trade agreements like CEPA/ECTA, major retail/distributor channels, or buyer quality requirements).
Strict constraints:
1. Do NOT invent, change, or estimate trade volume numbers.
2. Return ONLY a valid JSON object mapping country name to qualitative insight string:
{{"<Country Name>": "<1 sentence qualitative insight>"}}"""
                resp = await asyncio.wait_for(globex_agent._classifier_llm.ainvoke(enrich_prompt), timeout=6.0)
                raw_text = resp.content
                if isinstance(raw_text, list):
                    raw_text = raw_text[0].get("text", "") if (raw_text and isinstance(raw_text[0], dict)) else str(raw_text[0] if raw_text else "")
                raw_text = re.sub(r"```(?:json)?|```", "", str(raw_text)).strip()
                ai_insights = json.loads(raw_text)
                for c in recommended_countries:
                    if c.country in ai_insights:
                        c.insights += f" Strategic context: {ai_insights[c.country]}"
            except Exception as e:
                log.info("Qualitative LLM enrichment skipped or timed out, keeping verified Comtrade insights", error=str(e))

        summary = (
            f"Official UN Comtrade 2025 trade intelligence for {norm.normalized_product_name} under HS {cmd_code} "
            f"({cmd_desc}). Total India-reported exports (FOB) reached {world_total_str} across {meta.get('totalMarkets', len(markets))} "
            f"destinations worldwide."
        )

        response_obj = MarketResearchResponse(
            product=norm.normalized_product_name,
            category=norm.category,
            candidateHsCodes=[c.model_dump() for c in norm.candidate_hs_codes],
            analyzedAt=datetime.now().isoformat(),
            summary=summary,
            dataSourceMode="official_un_comtrade_2025",
            liveTradeDataProvider="UN_Comtrade_API_v1_seeded",
            recommendedCountries=recommended_countries,
            disclaimer=f"Scope: {scope_note}. Score = market's India-reported export value (FOB, UN Comtrade {period_label}) as a % of the largest listed market; it reflects existing trade volume only, not forecast demand. Growth is shown only when two years of data are seeded. Competition and destination market size are not available from free single-reporter data.",
        )
        return response_obj.model_dump()

    except Exception as exc:
        log.error("Market research agent failed", error=str(exc))
        raise HTTPException(status_code=503, detail="Gemini or trade-data service is unavailable. Please try again.")


def _compute_heuristic_lead_score(buyer: dict, product: dict | None = None) -> dict:
    score = 50
    factors = []
    
    buyer_ind = str(buyer.get("industry") or "").lower()
    prod_name = str((product or {}).get("productName") or "").lower()
    if buyer_ind and (buyer_ind in prod_name or prod_name in buyer_ind or any(k in buyer_ind for k in ["food", "apparel", "textile", "retail", "import", "trade", "distribut"])):
        score += 20
        factors.append({"factor": "Target trade category alignment", "impact": "positive", "weight": 20})
    else:
        factors.append({"factor": "Commercial trade fit assessment", "impact": "neutral", "weight": 0})
        
    if buyer.get("isVerified"):
        score += 15
        factors.append({"factor": "Verified importer entity registry", "impact": "positive", "weight": 15})
    else:
        score -= 5
        factors.append({"factor": "Pending third-party verification", "impact": "negative", "weight": -5})
        
    vol = str(buyer.get("importVolume") or "").lower()
    if "high" in vol or "large" in vol:
        score += 15
        factors.append({"factor": "High estimated import volume", "impact": "positive", "weight": 15})
    elif "medium" in vol:
        score += 10
        factors.append({"factor": "Moderate commercial import volume", "impact": "positive", "weight": 10})
    else:
        factors.append({"factor": "Unconfirmed or low volume profile", "impact": "neutral", "weight": 0})
        
    if buyer.get("email"):
        score += 10
        factors.append({"factor": "Direct verified contact channel available", "impact": "positive", "weight": 10})
    else:
        score -= 10
        factors.append({"factor": "Direct email pending (inquiry channel needed)", "impact": "negative", "weight": -10})

    if buyer.get("website"):
        score += 5
        factors.append({"factor": "Active commercial web presence", "impact": "positive", "weight": 5})

    score = max(20, min(95, score))
    company = buyer.get("companyName") or "Target Importer"
    return {
        "score": score,
        "confidence": 0.8,
        "factors": factors,
        "reasoning": f"Rule-based trade heuristic analysis for {company}: Evaluated verification status, category alignment, and contact accessibility (indicative estimate)."
    }


@router.post("/agents/lead-scoring", summary="Agent Lead Scoring")
async def agent_lead_scoring(request: LeadScoringAgentRequest) -> dict:
    """Score a lead based on buyer and product details using Gemini."""
    require_gemini()
    try:
        buyer = request.buyer
        product = request.product
        
        prompt = f"""You are an AI lead scoring agent. Evaluate the fit of this global buyer for importing our product.
        
        Buyer Details:
        - Company Name: {buyer.get('companyName')}
        - Country: {buyer.get('country')}
        - Industry: {buyer.get('industry')}
        - Import Volume: {buyer.get('importVolume')}
        - Verified Status: {buyer.get('isVerified')}
        - Annual Revenue: {buyer.get('annualRevenue')}
        - Employee Count: {buyer.get('employeeCount')}
        - Email Available: {bool(buyer.get('email'))}
        - Website Available: {bool(buyer.get('website'))}
        
        Product Details:
        {json.dumps(product) if product else 'General Indian export goods'}
        
        Analyze factors such as:
        1. Industry alignment
        2. Importer import volume (Higher volume = positive)
        3. Verification and contact status
        4. Target market compatibility
        
        Calculate a final leadScore between 0 and 100.
        Provide a list of key positive/negative factors with impact and weight.
        Provide a concise reasoning.
        
        Return ONLY a JSON object (no markdown):
        {{
          "score": <integer 0-100>,
          "confidence": <float 0.0-1.0>,
          "factors": [
            {{
              "factor": "<factor name>",
              "impact": "<positive | negative | neutral>",
              "weight": <integer weight contribution>
            }}
          ],
          "reasoning": "<concise summary of score reasoning>"
        }}"""
        
        response = await globex_agent._classifier_llm.ainvoke(prompt)
        raw = response.content
        if isinstance(raw, list):
            raw = raw[0].get("text", "") if isinstance(raw[0], dict) else str(raw)
        raw = str(raw).strip()
        raw = re.sub(r"```(?:json)?|```", "", raw).strip()
        return json.loads(raw)
    except Exception as exc:
        log.error("Lead scoring LLM inference failed", error=str(exc))
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
        raise HTTPException(status_code=503, detail="Gemini is unavailable. Check GOOGLE_API_KEY and try again.")


@router.post("/agents/outreach", summary="Agent Outreach Email Generator")
async def agent_outreach(request: OutreachAgentRequest) -> dict:
    """Generate a highly personalized outreach email to a global buyer using Gemini."""
    require_gemini()
    try:
        buyer = request.buyer
        sender = request.sender
        
        prompt = f"""You are an expert international trade and B2B outreach consultant.
        Write a {request.tone} B2B outreach email in {request.language} from the Indian exporter to the global buyer.
        
        Exporter Details (Sender):
        - Name: {sender.get('name')}
        - Company: {sender.get('companyName')}
        - Industry: {sender.get('industry')}
        
        Buyer Details (Recipient):
        - Company: {buyer.get('companyName')}
        - Country: {buyer.get('country')}
        - Industry: {buyer.get('industry')}
        - Import Volume: {buyer.get('importVolume')}
        
        {f'Additional Custom Context: {request.custom_context}' if request.custom_context else ''}
        
        The email should:
        1. Be written with a polite, professional {request.tone} tone.
        2. Introduce the exporter using ONLY the details given above. Do NOT invent or
           assume claims about the exporter's size, years in business, reputation, quality,
           certifications, capacity, shelf life, delivery performance or existing customers.
           If such details are not provided, either omit them or use conditional phrasing
           (e.g. "we would be glad to share our product specifications and certifications").
        3. Explain why a conversation could make sense for the buyer, based only on the buyer details above.
        4. End with a clear call-to-action (e.g., brief Zoom call, product catalogue).
        5. Be concise (under 200 words).
        
        Return ONLY a JSON object (no markdown):
        {{
          "subject": "<Compelling, high-open-rate subject line>",
          "content": "<Full email body with placeholders like [Phone] or [Email] for contact info>",
          "model": "{settings.gemini_model}",
          "prompt": "<concise description of prompt configuration>"
        }}"""
        
        response = await globex_agent._classifier_llm.ainvoke(prompt)
        raw = response.content
        if isinstance(raw, list):
            raw = raw[0].get("text", "") if isinstance(raw[0], dict) else str(raw)
        raw = str(raw).strip()
        raw = re.sub(r"```(?:json)?|```", "", raw).strip()
        return json.loads(raw)
    except Exception as exc:
        log.error("Outreach agent failed", error=str(exc))
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
        raise HTTPException(status_code=503, detail="Gemini is unavailable. Check GOOGLE_API_KEY and try again.")


@router.post("/agents/buyer-discovery", summary="Agent Buyer Discovery")
async def agent_buyer_discovery(request: BuyerDiscoveryAgentRequest) -> dict:
    """Discover real buyers for a product using Gemini with Google Search grounding.

    Every returned company carries a grounding citation. When grounded search
    finds nothing credible, an honest empty result is returned instead of
    fabricated companies.
    """
    require_gemini()
    try:
        return await discover_buyers(
            product=request.product,
            target_countries=request.target_countries,
            category=request.category,
            hs_code=request.hs_code,
        )
    except BuyerDiscoveryError as exc:
        log.warning("Buyer discovery unavailable", error=str(exc), retryable=exc.retryable)
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
            raise HTTPException(status_code=503, detail="Gemini is unavailable because GOOGLE_API_KEY is invalid. Configure a valid key and try again.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE if exc.retryable else status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )


@router.post("/agents/compliance", summary="Agent Trade Compliance & Customs Assessment")
async def agent_compliance(request: ComplianceAgentRequest) -> dict:
    """Analyze regulatory, customs, labeling, and duty compliance for exporting a product from India to a destination country."""
    require_gemini()
    try:
        hs_clause = f" with suspected HS Code {request.hs_code}" if request.hs_code else ""
        prompt = f"""You are GlobeX AI's expert Trade Compliance and Customs Agent for Indian Exporters.
Analyze international export requirements for:
- Product: {request.product}{hs_clause}
- Origin Country: {request.origin_country}
- Destination Country: {request.destination_country}

Evaluate:
1. Exact 6-to-8 digit Harmonized System (HS / ITC-HS) code, official description, and chapter.
2. Customs Duty, MFN tariff rate, destination VAT/import tax, and any preferential rate under bilateral trade agreements (e.g. India-UAE CEPA, India-Australia ECTA, EU GSP, etc.).
3. Indian export incentives applicable (e.g. RoDTEP rate, Duty Drawback).
4. Mandatory Certifications & Lab Reports needed prior to dispatch (e.g., Phytosanitary Certificate, NABL Accredited MRL Testing, FSSAI / Spices Board RCMC, APEDA, CE, FDA).
5. Product Labeling and Packaging standards (languages, nutritional declaration, batch codes, country of origin marks).
6. ICEGATE and customs port clearance documentation checklist.

Respond ONLY with a valid JSON object (no markdown, no backticks, no explanatory preamble):
{{
  "product": "{request.product}",
  "destinationCountry": "{request.destination_country}",
  "originCountry": "{request.origin_country}",
  "hsCode": "<e.g. 0910.91.00>",
  "hsDescription": "<official HS heading description>",
  "dutyCalculation": {{
    "basicCustomsDutyPct": <number e.g. 0.0 or 5.0>,
    "vatOrGstPct": <number e.g. 7.0 or 19.0>,
    "totalTariffPct": <total effective percentage>,
    "tradeAgreementBenefit": "<description of bilateral trade agreement benefit if applicable, or MFN standard>",
    "exportIncentives": "<e.g. RoDTEP: 2.5%, Duty Drawback: 1.5%>"
  }},
  "mandatoryCertifications": [
    {{
      "certificate": "<Name of certificate>",
      "issuingAuthority": "<e.g. Spices Board of India / Ministry of Agriculture>",
      "requirement": "<Mandatory | Conditional | Recommended>",
      "leadTime": "<e.g. 5–7 days before shipping>",
      "purpose": "<brief explanation>"
    }}
  ],
  "labelingAndPackaging": [
    "<Rule 1: e.g. Dual language labeling required (German/English)>",
    "<Rule 2: e.g. Batch number, harvest date, and net weight in metric units>"
  ],
  "customsClearance": {{
    "portProcedures": "<summary of destination port customs procedures>",
    "avgClearanceDays": "<e.g. 2–3 days>",
    "documentsRequired": [
      "Commercial Invoice (signed)",
      "Packing List with package marks",
      "Bill of Lading / Airway Bill",
      "Certificate of Origin (Preferential / Non-preferential)",
      "Shipping Bill (ICEGATE)",
      "Test Analysis Report"
    ]
  }},
  "checklist": [
    {{
      "check": "<Short title of requirement e.g. Phytosanitary Certificate>",
      "authority": "<Issuing body>",
      "status": "Required",
      "action": "<Actionable instruction for exporter>"
    }},
    {{
      "check": "<Pesticide MRL Test Report>",
      "authority": "NABL Accredited Laboratory",
      "status": "Required",
      "action": "<Batch sample testing mandatory before bill of lading>"
    }},
    {{
      "check": "<Certificate of Origin>",
      "authority": "Export Inspection Council (EIC)",
      "status": "Required",
      "action": "<Generate COO under trade agreement for preferential tariff>"
    }},
    {{
      "check": "<Bilingual Compliant Labeling>",
      "authority": "Destination Customs Standards",
      "status": "Required",
      "action": "<Affix compliant bilingual labels with metric declarations>"
    }}
  ]
}}"""

        response = await globex_agent._classifier_llm.ainvoke(prompt)
        raw = response.content
        if isinstance(raw, list):
            raw = raw[0].get("text", "") if isinstance(raw[0], dict) else str(raw)
        raw = str(raw).strip()
        raw = re.sub(r"```(?:json)?|```", "", raw).strip()
        return json.loads(raw)
    except Exception as exc:
        log.error("Compliance agent failed", error=str(exc))
        if is_gemini_auth_error(exc):
            gemini_readiness.available = False
            gemini_readiness.reason = "invalid or missing GOOGLE_API_KEY"
        raise HTTPException(status_code=503, detail="Gemini is unavailable. Check GOOGLE_API_KEY and try again.")

# ── Health ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def health() -> dict:
    if gemini_readiness.available and rag_pipeline.available:
        return {"status": "ok", "service": "GlobeX AI", "version": "1.0.0", "capabilities": {"gemini": "operational", "rag": "operational"}}
    reasons = []
    if not gemini_readiness.available:
        reasons.append(gemini_readiness.reason or "invalid or missing GOOGLE_API_KEY")
    if not rag_pipeline.available:
        rag_reason = rag_pipeline.reason or "RAG is unavailable"
        if rag_reason not in reasons:
            reasons.append(rag_reason)
    return {
        "status": "degraded",
        "service": "GlobeX AI",
        "version": "1.0.0",
        "reason": "; ".join(reasons),
        "capabilities": {
            "gemini": "operational" if gemini_readiness.available else "unavailable",
            "rag": "operational" if rag_pipeline.available else "unavailable",
        },
    }
