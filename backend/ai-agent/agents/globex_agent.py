"""
GlobeX AI — Core Agent
Orchestrates intent classification → RAG retrieval → tool calling → response generation.
This is the brain of GlobeX AI.
"""
from __future__ import annotations

import json
import re
from typing import Any, AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI

from memory.memory_manager import MemoryManager
from prompts.system_prompts import (
    INTENT_CLASSIFIER_PROMPT,
    MEMORY_EXTRACTION_PROMPT,
    SYSTEM_PROMPT,
)
from rag.pipeline import rag_pipeline
from tools.trade_tools import ALL_TOOLS, TOOL_MAP
from utils.config import get_settings
from utils.logger import get_logger

log = get_logger(__name__)
settings = get_settings()

# Intent → RAG category mapping
INTENT_CATEGORY_MAP: dict[str, str | None] = {
    "regulatory_query": "export_regulations",
    "document_query": "customs_procedures",
    "general_trade_query": "shipping",
    "country_rules": "country_rules",
    "hs_code_lookup": "hs_codes",
    "top_export_markets": "hs_codes",
    "market_share": "hs_codes",
    "duty_calculation": None,
    "invoice_generation": None,
    "packing_list": None,
    "greeting": None,
    "off_topic": None,
}


class GlobeXAgent:
    """
    Production-ready LangChain agent for international trade assistance.

    Pipeline per user turn:
      1. Classify intent (Gemini, structured JSON)
      2. Retrieve RAG context (if needed)
      3. Execute tool calls (if needed)
      4. Generate final response (Gemini with full context)
      5. Extract & persist memory
    """

    def __init__(self) -> None:
        self._llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.3,
        )
        self._classifier_llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.0,
            max_retries=0,
        )
        self._llm_with_tools = self._llm.bind_tools(ALL_TOOLS)

    # ── Public Entry Point ───────────────────────────────────────────────────

    async def chat(
        self,
        session_id: str,
        user_message: str,
        memory: MemoryManager,
    ) -> dict[str, Any]:
        """
        Process a user message and return the agent's response.

        Returns:
            {
                "response": str,
                "intent": str,
                "tools_used": list[str],
                "rag_used": bool,
                "tool_results": dict,
            }
        """
        log.info("Agent processing message", session_id=session_id, message=user_message[:80])

        # 1. Classify intent
        intent_data = await self._classify_intent(user_message)
        intent = intent_data.get("intent", "general_trade_query")
        needs_rag = intent_data.get("needs_rag", True)
        needs_tool = intent_data.get("needs_tool", False)
        tool_name = intent_data.get("tool_name")
        entities = intent_data.get("entities", {})
        log.info("Intent classified", intent=intent, needs_rag=needs_rag, tool=tool_name)

        # 2. Retrieve RAG context (skip for greetings / off-topic to save tokens)
        rag_context = ""
        _skip_rag_intents = {"greeting", "off_topic"}
        if needs_rag and intent not in _skip_rag_intents:
            category = INTENT_CATEGORY_MAP.get(intent)
            try:
                rag_context = await rag_pipeline.format_context(user_message, category_filter=category)
            except Exception as exc:
                log.warning("RAG retrieval failed", error=str(exc))
                rag_context = "Knowledge base temporarily unavailable."

        # 3. Execute tool calls if required
        tool_results: dict[str, Any] = {}
        tools_used: list[str] = []

        if needs_tool and tool_name and tool_name in TOOL_MAP:
            tool_results, tools_used = await self._execute_tool(
                tool_name, user_message, entities, memory, session_id
            )

        # 4. Fetch session context & conversation history
        session_context = await memory.get_session_context_string(session_id)
        history = await memory.build_langchain_history(session_id)

        # 5. Build messages for Gemini
        system_content = SYSTEM_PROMPT.format(
            session_context=session_context,
            rag_context=rag_context or "No additional knowledge retrieved.",
        )

        # Inject tool results into user turn if tools were used
        user_turn = user_message
        if tool_results:
            tool_summary = json.dumps(tool_results, indent=2)
            user_turn = (
                f"{user_message}\n\n"
                f"[System: The following tool results have been retrieved to help answer this query:]\n"
                f"```json\n{tool_summary}\n```\n"
                f"Please use these results in your response."
            )

        messages = [SystemMessage(content=system_content)]
        for role, content in history[-10:]:  # Last 10 turns
            if role == "human":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(AIMessage(content=content))
        messages.append(HumanMessage(content=user_turn))

        # 6. Generate response
        response_msg = await self._llm.ainvoke(messages)
        response_text = response_msg.content

        # 7. Persist messages to memory
        await memory.add_message(session_id, "user", user_message)
        await memory.add_message(
            session_id, "assistant", response_text,
            tool_calls=tool_results if tool_results else None,
        )

        # 8. Extract & update session context
        await self._update_memory(session_id, user_message, response_text, entities, memory)

        return {
            "response": response_text,
            "intent": intent,
            "tools_used": tools_used,
            "rag_used": bool(rag_context),
            "tool_results": tool_results,
        }

    # ── Streaming variant ────────────────────────────────────────────────────

    async def chat_stream(
        self,
        session_id: str,
        user_message: str,
        memory: MemoryManager,
    ) -> AsyncGenerator[str, None]:
        """Stream the agent response token-by-token."""
        intent_data = await self._classify_intent(user_message)
        intent = intent_data.get("intent", "general_trade_query")
        needs_rag = intent_data.get("needs_rag", True)
        needs_tool = intent_data.get("needs_tool", False)
        tool_name = intent_data.get("tool_name")
        entities = intent_data.get("entities", {})

        rag_context = ""
        if needs_rag:
            category = INTENT_CATEGORY_MAP.get(intent)
            try:
                rag_context = await rag_pipeline.format_context(user_message, category_filter=category)
            except Exception:
                rag_context = ""

        tool_results: dict[str, Any] = {}
        if needs_tool and tool_name and tool_name in TOOL_MAP:
            tool_results, _ = await self._execute_tool(tool_name, user_message, entities, memory, session_id)

        session_context = await memory.get_session_context_string(session_id)
        history = await memory.build_langchain_history(session_id)

        system_content = SYSTEM_PROMPT.format(
            session_context=session_context,
            rag_context=rag_context or "No additional knowledge retrieved.",
        )

        user_turn = user_message
        if tool_results:
            user_turn = (
                f"{user_message}\n\n[Tool Results:]\n```json\n{json.dumps(tool_results, indent=2)}\n```"
            )

        messages = [SystemMessage(content=system_content)]
        for role, content in history[-8:]:
            messages.append(HumanMessage(content=content) if role == "human" else AIMessage(content=content))
        messages.append(HumanMessage(content=user_turn))

        full_response = ""
        async for chunk in self._llm.astream(messages):
            token = chunk.content
            full_response += token
            yield token

        await memory.add_message(session_id, "user", user_message)
        await memory.add_message(session_id, "assistant", full_response)
        await self._update_memory(session_id, user_message, full_response, entities, memory)

    # ── Private Helpers ──────────────────────────────────────────────────────

    async def _classify_intent(self, user_message: str) -> dict:
        """Use Gemini to classify user intent into structured JSON."""
        prompt = INTENT_CLASSIFIER_PROMPT.format(user_message=user_message)
        response = await self._classifier_llm.ainvoke(prompt)
        raw = response.content.strip()
        raw = re.sub(r"```(?:json)?|```", "", raw).strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            log.warning("Intent classification JSON parse failed", raw=raw[:200])
            return {"intent": "general_trade_query", "needs_rag": True, "needs_tool": False}

    async def _execute_tool(
        self,
        tool_name: str,
        user_message: str,
        entities: dict,
        memory: MemoryManager,
        session_id: str,
    ) -> tuple[dict, list[str]]:
        """Parse tool arguments from entities and invoke the tool."""
        tool_fn = TOOL_MAP[tool_name]
        tool_results: dict = {}
        tools_used: list[str] = []

        try:
            # Build tool inputs from extracted entities + LLM-parsed args
            args = await self._parse_tool_args(tool_name, user_message, entities, memory, session_id)
            log.info("Invoking tool", tool=tool_name, args=args)
            result = await tool_fn.ainvoke(args)
            tool_results[tool_name] = result
            tools_used.append(tool_name)
        except Exception as exc:
            log.error("Tool execution failed", tool=tool_name, error=str(exc))
            tool_results[tool_name] = {"error": str(exc)}

        return tool_results, tools_used

    async def _parse_tool_args(
        self,
        tool_name: str,
        user_message: str,
        entities: dict,
        memory: MemoryManager,
        session_id: str,
    ) -> dict:
        """
        Use Gemini to extract tool arguments from the user message and session context.
        Falls back to entity extraction.
        """
        session_context = await memory.get_session_context_string(session_id)

        tool_schemas = {
            "hs_code_lookup": '{"product_name": "<product name>"}',
            "duty_calculator": '{"product": "<product>", "destination_country": "<country>", "product_value_usd": <number>, "hs_code": "<optional>"}',
            "country_rules": '{"country": "<country name>", "product_category": "<optional product category>"}',
            "top_export_markets": '{"hs_code": "<2-8 digit HS code, e.g. 62>", "n": <integer, default 5>}',
            "market_share": '{"country": "<country name>", "hs_code": "<2-8 digit HS code, e.g. 62>"}',
            "invoice_generator": (
                '{"seller_name": "<>", "seller_address": "<>", "buyer_name": "<>", '
                '"buyer_address": "<>", "product_description": "<>", "quantity": <number>, '
                '"unit": "<e.g. PCS>", "unit_price_usd": <number>, "incoterm": "<e.g. FOB>", '
                '"payment_terms": "<>", "country_of_origin": "India", "hs_code": "<>", '
                '"freight_usd": <number>, "insurance_usd": <number>}'
            ),
            "packing_list_generator": (
                '{"shipper_name": "<>", "consignee_name": "<>", "product_description": "<>", '
                '"number_of_packages": <integer>, "package_type": "<e.g. Cartons>", '
                '"gross_weight_per_package_kg": <number>, "net_weight_per_package_kg": <number>, '
                '"dimensions_cm": "<LxWxH e.g. 60x40x50>", "marks_and_numbers": "<>"}'
            ),
        }

        schema = tool_schemas.get(tool_name, "{}")
        prompt = f"""Extract the arguments for the '{tool_name}' tool from this message.

User Message: {user_message}
Session Context: {session_context}
Entities already extracted: {json.dumps(entities)}

Return ONLY a JSON object matching this schema (fill in all fields as best you can):
{schema}

For any fields not mentioned, use sensible defaults. Do not include markdown."""

        response = await self._classifier_llm.ainvoke(prompt)
        raw = response.content.strip()
        raw = re.sub(r"```(?:json)?|```", "", raw).strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            log.warning("Tool arg parse failed — falling back to entities", raw=raw[:200])
            return entities  # fall back to whatever the intent classifier already extracted

    async def _update_memory(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        entities: dict,
        memory: MemoryManager,
    ) -> None:
        """Extract entities from the conversation turn and update session context."""
        try:
            # Use entities from intent classification first
            company = entities.get("company")
            country = entities.get("country")
            product = entities.get("product")

            # If still missing, run memory extraction
            if not all([company, country, product]):
                prompt = MEMORY_EXTRACTION_PROMPT.format(
                    user_message=user_message, assistant_response=assistant_response[:500]
                )
                resp = await self._classifier_llm.ainvoke(prompt)
                raw = resp.content.strip()
                raw = re.sub(r"```(?:json)?|```", "", raw).strip()
                try:
                    extracted = json.loads(raw)
                except json.JSONDecodeError:
                    log.warning("Memory extraction JSON parse failed", raw=raw[:200])
                    extracted = {}
                company = company or extracted.get("company_name")
                country = country or extracted.get("destination_country")
                product = product or extracted.get("product_category")

            await memory.update_session_context(
                session_id,
                company_name=company,
                product_category=product,
                destination_country=country,
            )
        except Exception as exc:
            log.warning("Memory extraction failed", error=str(exc))


# ── Singleton ────────────────────────────────────────────────────────────────
globex_agent = GlobeXAgent()
