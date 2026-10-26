"""
GlobeX AI — Database Layer (SQLAlchemy async + SQLite)
Stores conversation sessions & memory context.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from utils.config import get_settings

settings = get_settings()


# ── Engine & Session Factory ────────────────────────────────────────────────
engine = create_async_engine(
    str(settings.database_url),
    echo=settings.debug,
    future=True,
)
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()


# ── Models ──────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    __allow_unmapped__ = True
    pass


class Session(Base):
    __tablename__ = "sessions"

    id: str = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name: str | None = Column(String(255), nullable=True)
    product_category: str | None = Column(String(255), nullable=True)
    destination_country: str | None = Column(String(100), nullable=True)
    created_at: datetime = Column(DateTime, server_default=func.now())
    updated_at: datetime = Column(DateTime, server_default=func.now(), onupdate=func.now())

    messages: list[Message] = relationship(
        "Message", back_populates="session", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"

    id: str = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: str = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    role: str = Column(String(20), nullable=False)   # "user" | "assistant" | "tool"
    content: str = Column(Text, nullable=False)
    tool_calls: str | None = Column(Text, nullable=True)  # JSON-serialised
    created_at: datetime = Column(DateTime, server_default=func.now())

    session: Session = relationship("Session", back_populates="messages")


# ── Initialiser ─────────────────────────────────────────────────────────────
async def init_db() -> None:
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
