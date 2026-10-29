"""
GlobeX AI — Memory Manager
Persists and retrieves session context: company, product, country, conversation history.
"""
from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Message, Session
from utils.logger import get_logger

log = get_logger(__name__)

MAX_HISTORY_MESSAGES = 20  # Keep last N messages for context window


class MemoryManager:
    """
    Session-scoped memory manager.
    Reads/writes to SQLite via SQLAlchemy async ORM.
    """

    def __init__(self, db: AsyncSession, owner_id: str | None = None) -> None:
        self.db = db
        # Backend-authenticated user this request belongs to. New sessions are
        # stamped with it so only that user can read or delete them later.
        self.owner_id = owner_id

    # ── Session Management ───────────────────────────────────────────────────

    async def get_or_create_session(self, session_id: str) -> Session:
        """Retrieve an existing session or create a new one."""
        result = await self.db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()

        if session is None:
            session = Session(id=session_id, owner_id=self.owner_id)
            self.db.add(session)
            await self.db.commit()
            await self.db.refresh(session)
            log.info("New session created", session_id=session_id)

        return session

    async def update_session_context(
        self,
        session_id: str,
        company_name: str | None = None,
        product_category: str | None = None,
        destination_country: str | None = None,
    ) -> None:
        """Update session-level trade context extracted from conversation."""
        session = await self.get_or_create_session(session_id)
        if company_name:
            session.company_name = company_name
        if product_category:
            session.product_category = product_category
        if destination_country:
            session.destination_country = destination_country
        await self.db.commit()

    # ── Message Management ───────────────────────────────────────────────────

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        tool_calls: dict | None = None,
    ) -> Message:
        """Persist a message to the session history."""
        await self.get_or_create_session(session_id)
        msg = Message(
            session_id=session_id,
            role=role,
            content=content,
            tool_calls=json.dumps(tool_calls) if tool_calls else None,
        )
        self.db.add(msg)
        await self.db.commit()
        await self.db.refresh(msg)
        return msg

    async def get_conversation_history(
        self, session_id: str, limit: int = MAX_HISTORY_MESSAGES
    ) -> list[dict]:
        """Return recent conversation history as list of role/content dicts."""
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()
        messages = list(reversed(messages))

        history = []
        for m in messages:
            entry: dict = {"role": m.role, "content": m.content}
            if m.tool_calls:
                entry["tool_calls"] = json.loads(m.tool_calls)
            history.append(entry)

        return history

    async def get_session_context_string(self, session_id: str) -> str:
        """Return formatted session context for prompt injection."""
        result = await self.db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if session is None:
            return "No session context available."

        lines = []
        if session.company_name:
            lines.append(f"Company: {session.company_name}")
        if session.product_category:
            lines.append(f"Product Category: {session.product_category}")
        if session.destination_country:
            lines.append(f"Destination Country: {session.destination_country}")

        return "\n".join(lines) if lines else "No context stored yet."

    async def build_langchain_history(self, session_id: str) -> list[tuple[str, str]]:
        """Build LangChain-compatible chat history tuples."""
        history = await self.get_conversation_history(session_id)
        lc_history = []
        for msg in history:
            if msg["role"] == "user":
                lc_history.append(("human", msg["content"]))
            elif msg["role"] == "assistant":
                lc_history.append(("ai", msg["content"]))
        return lc_history
