"""
GlobeX AI — RAG Pipeline
Handles document ingestion, embedding, ChromaDB storage, and semantic retrieval.
"""
from __future__ import annotations

import asyncio
from typing import Any

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True
except ImportError:
    chromadb = None
    ChromaSettings = None
    HAS_CHROMADB = False
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from rag.knowledge_base import TRADE_DOCUMENTS
from utils.config import get_settings
from utils.logger import get_logger

log = get_logger(__name__)
settings = get_settings()


class RAGPipeline:
    """
    Manages the full RAG lifecycle:
      1. Document ingestion & chunking
      2. Embedding generation (Gemini)
      3. ChromaDB vector storage
      4. Semantic retrieval for context injection
    """

    def __init__(self) -> None:
        self._client: chromadb.PersistentClient | None = None
        self._collection: chromadb.Collection | None = None
        self._embeddings: GoogleGenerativeAIEmbeddings | None = None
        self.available = False
        self.reason: str | None = "RAG has not been initialized"
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", " "],
        )

    # ── Initialisation ───────────────────────────────────────────────────────

    async def initialise(self) -> None:
        """Set up ChromaDB client, embeddings, and seed knowledge base."""
        log.info("Initialising RAG pipeline")
        settings.chroma_persist_dir.mkdir(parents=True, exist_ok=True)

        self._embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.google_api_key,
        )

        if not HAS_CHROMADB:
            self.available = False
            self.reason = "ChromaDB is not installed"
            log.warning("ChromaDB not installed; RAG is disabled")
            return

        self._client = chromadb.PersistentClient(
            path=str(settings.chroma_persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        self._collection = self._client.get_or_create_collection(
            name=settings.chroma_collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        # Seed knowledge base if empty
        if self._collection.count() == 0:
            log.info("Seeding ChromaDB with trade knowledge base")
            await self._ingest_documents(TRADE_DOCUMENTS)
        else:
            log.info(
                "ChromaDB already populated",
                document_count=self._collection.count(),
            )
        self.available = True
        self.reason = None

    async def _ingest_documents(self, documents: list[dict]) -> None:
        """Chunk, embed, and store documents in ChromaDB."""
        all_ids: list[str] = []
        all_texts: list[str] = []
        all_metadatas: list[dict] = []

        for doc in documents:
            chunks = self._splitter.split_text(doc["content"])
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc['id']}-chunk-{i}"
                all_ids.append(chunk_id)
                all_texts.append(chunk)
                all_metadatas.append(
                    {
                        "doc_id": doc["id"],
                        "title": doc["title"],
                        "category": doc["category"],
                        "chunk_index": i,
                    }
                )

        # Embed in batches to respect rate limits
        batch_size = 20
        all_embeddings: list[list[float]] = []
        for i in range(0, len(all_texts), batch_size):
            batch = all_texts[i : i + batch_size]
            embeddings = await asyncio.get_event_loop().run_in_executor(
                None, self._embeddings.embed_documents, batch
            )
            all_embeddings.extend(embeddings)
            await asyncio.sleep(0.5)  # rate-limit buffer

        self._collection.add(
            ids=all_ids,
            documents=all_texts,
            embeddings=all_embeddings,
            metadatas=all_metadatas,
        )
        log.info("Documents ingested", total_chunks=len(all_ids))

    # ── Retrieval ────────────────────────────────────────────────────────────

    async def retrieve(
        self,
        query: str,
        k: int | None = None,
        category_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Semantic retrieval: embed query → cosine search → return top-k chunks.

        Args:
            query: Natural-language query string.
            k: Number of results (defaults to settings.retriever_k).
            category_filter: Optional metadata filter by document category.

        Returns:
            List of dicts with keys: content, metadata, distance.
        """
        if self._collection is None or not self.available:
            raise RuntimeError(self.reason or "RAG pipeline is unavailable")

        k = k or settings.retriever_k
        query_embedding = await asyncio.get_event_loop().run_in_executor(
            None, self._embeddings.embed_query, query
        )

        where_clause = {"category": category_filter} if category_filter else None

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where=where_clause,
            include=["documents", "metadatas", "distances"],
        )

        retrieved: list[dict] = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            retrieved.append(
                {
                    "content": doc,
                    "metadata": meta,
                    "distance": round(dist, 4),
                }
            )

        log.info("RAG retrieval complete", query=query[:80], hits=len(retrieved))
        return retrieved

    async def format_context(self, query: str, category_filter: str | None = None) -> str:
        """Retrieve and format context for LLM injection."""
        chunks = await self.retrieve(query, category_filter=category_filter)
        if not chunks:
            return "No relevant trade knowledge found for this query."

        sections = []
        for c in chunks:
            title = c["metadata"].get("title", "Trade Knowledge")
            sections.append(f"### {title}\n{c['content']}")

        return "\n\n---\n\n".join(sections)

    async def add_document(self, doc: dict) -> None:
        """Dynamically add a new document to the knowledge base."""
        await self._ingest_documents([doc])

    @property
    def document_count(self) -> int:
        return self._collection.count() if self._collection else 0


# ── Singleton ────────────────────────────────────────────────────────────────
rag_pipeline = RAGPipeline()
