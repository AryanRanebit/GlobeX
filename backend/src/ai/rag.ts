/**
 * ai/rag.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * RAG (Retrieval-Augmented Generation) retrieval layer.
 *
 * Flow:
 *   1. Accept a user query string.
 *   2. Generate a query embedding (same model as indexing – critical for match).
 *   3. Search ChromaDB for the top-N most semantically similar document chunks.
 *   4. Return ranked chunks with text and metadata.
 *
 * The retrieved chunks are then used by the LLM caller (rag.buildPrompt) to
 * construct a grounded prompt that reduces hallucinations.
 *
 * Usage:
 *   import { retrieveContext, buildRagPrompt } from './rag';
 *   const chunks = await retrieveContext('What documents do I need to export spices?');
 *   const prompt = buildRagPrompt(userQuery, chunks);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getChromaCollection } from './chroma';
import { generateEmbedding } from './embeddings';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetrievedChunk {
  id: string;
  text: string;
  source: string;
  /** Cosine distance [0, 1]; lower = more similar */
  distance: number;
}

export interface RagResult {
  chunks: RetrievedChunk[];
  /** True when at least one relevant chunk was found */
  contextFound: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum distance to consider a chunk "relevant" (cosine distance, 0=identical). */
const MAX_DISTANCE = 0.7;

/** Number of chunks to retrieve from ChromaDB. */
const TOP_K = 5;

// ─── Core retrieval ──────────────────────────────────────────────────────────

/**
 * Retrieve the top-K most relevant document chunks from ChromaDB for a query.
 *
 * Gracefully returns an empty result if ChromaDB is unavailable so that the
 * server never crashes on a vector-DB outage.
 */
export async function retrieveContext(query: string, topK: number = TOP_K): Promise<RagResult> {
  try {
    // 1. Embed the user query using the same model used during indexing.
    const queryEmbedding = await generateEmbedding(query);

    // 2. Query ChromaDB.
    const collection = await getChromaCollection();
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      include: ['documents', 'metadatas', 'distances'] as any,
    });

    // 3. Unpack results (ChromaDB returns nested arrays indexed by query).
    const ids = results.ids[0] ?? [];
    const documents = results.documents[0] ?? [];
    const metadatas = (results.metadatas?.[0] ?? []) as Array<Record<string, string>>;
    const distances = (results.distances?.[0] ?? []) as number[];

    // 4. Filter by relevance threshold and map to typed objects.
    const chunks: RetrievedChunk[] = ids
      .map((id, i) => ({
        id,
        text: documents[i] ?? '',
        source: metadatas[i]?.source ?? 'unknown',
        distance: distances[i] ?? 1,
      }))
      .filter((c) => c.distance <= MAX_DISTANCE && c.text.length > 0);

    logger.debug(`[RAG] Query: "${query.slice(0, 60)}…" → ${chunks.length}/${ids.length} chunks (≤${MAX_DISTANCE} distance)`);

    return { chunks, contextFound: chunks.length > 0 };
  } catch (err: any) {
    // ChromaDB unavailable – log and return empty so callers can fall back.
    logger.warn(`[RAG] Retrieval failed (ChromaDB unavailable?): ${err?.message}`);
    return { chunks: [], contextFound: false };
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Build a grounded RAG prompt for the LLM.
 *
 * Injects retrieved context blocks above the user's question so the model
 * can answer with specific, factual information from the knowledge base.
 */
export function buildRagPrompt(userQuery: string, ragResult: RagResult): string {
  if (!ragResult.contextFound) {
    // No relevant context – let the model answer from its own knowledge.
    return `You are GlobeX, an expert AI assistant for Indian exporters.\n\nUser Question: ${userQuery}`;
  }

  const contextBlock = ragResult.chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: ${c.source}]\n${c.text}`,
    )
    .join('\n\n---\n\n');

  return `You are GlobeX, an expert AI assistant for Indian exporters. Use the following verified trade knowledge to answer the user's question accurately. If the knowledge base does not cover the topic, say so clearly.

## Relevant Knowledge Base Context

${contextBlock}

---

## User Question

${userQuery}

## Instructions

- Answer using the context above where applicable.
- Be specific and cite the source (e.g., "According to [Source 1]...").
- If unsure, recommend official resources (DGFT, APEDA, ECGC).`;
}

// ─── Utility: format retrieved chunks for API responses ───────────────────────

/**
 * Returns a sanitised summary of retrieved chunks suitable for including in
 * an API response (e.g., the "rag_sources" field in /api/v1/chat).
 */
export function formatChunksForResponse(chunks: RetrievedChunk[]): Array<{
  source: string;
  relevance: number;
  excerpt: string;
}> {
  return chunks.map((c) => ({
    source: c.source,
    relevance: Math.round((1 - c.distance) * 100) / 100, // [0,1] similarity score
    excerpt: c.text.slice(0, 200) + (c.text.length > 200 ? '…' : ''),
  }));
}
