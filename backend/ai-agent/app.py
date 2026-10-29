"""
GlobeX AI — FastAPI Application Entry Point
Production-ready international trade intelligence agent backend.
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from database.models import init_db
from rag.pipeline import rag_pipeline
from routes.api import router
from utils.config import get_settings
from utils.logger import get_logger, setup_logging

settings = get_settings()
setup_logging(settings.log_level)
log = get_logger("globex.app")


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle hooks."""
    log.info("GlobeX AI starting up", env=settings.app_env)

    # Ensure DB tables exist
    await init_db()
    log.info("[OK] Database initialised")

    # Boot RAG pipeline (seed ChromaDB if empty)
    await rag_pipeline.initialise()
    log.info("[OK] RAG pipeline ready", documents=rag_pipeline.document_count)

    log.info("[INFO] GlobeX AI is live", host=settings.app_host, port=settings.app_port)
    yield

    log.info("[INFO] GlobeX AI shutting down")


# ── Application ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="GlobeX AI",
    description=(
        "Intelligent Export-Import Assistant for Indian Manufacturers and MSMEs. "
        "Powered by Gemini 3.6 Flash, LangChain, and ChromaDB."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 1)
    log.info(
        "HTTP",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        ms=elapsed,
    )
    return response


# ── Exception Handlers ────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.error("Unhandled exception", path=request.url.path, error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred.",
        },
    )


# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(router, prefix="/api/v1", tags=["GlobeX AI"])


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "GlobeX AI",
        "tagline": "Your Intelligent Export-Import Assistant",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


# ── Dev Runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env == "development",
        log_level=settings.log_level.lower(),
    )
