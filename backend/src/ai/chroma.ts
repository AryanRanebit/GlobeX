/**
 * ai/chroma.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ChromaDB client singleton.
 *
 * Reads CHROMA_HOST and CHROMA_COLLECTION from environment variables (set in
 * .env or docker-compose). Creates or reuses the named collection on first
 * access and exposes it as a lazily-initialised singleton so the connection
 * is established once and shared across all requests.
 *
 * Usage:
 *   import { getChromaCollection } from './chroma';
 *   const collection = await getChromaCollection();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ChromaClient, Collection } from 'chromadb';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── Singleton state ─────────────────────────────────────────────────────────
let chromaClient: ChromaClient | null = null;
let cachedCollection: Collection | null = null;

/**
 * Returns the ChromaDB client, creating it on the first call.
 * Parses CHROMA_HOST (e.g. "http://localhost:8001") into separate host/port
 * to avoid the deprecated `path` warning in chromadb ≥ 1.9.
 */
function getClient(): ChromaClient {
  if (!chromaClient) {
    const url = new URL(env.CHROMA_HOST);
    const host = url.hostname;
    const port = parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80);
    const ssl = url.protocol === 'https:';

    logger.info(`[ChromaDB] Connecting to ${host}:${port} (ssl=${ssl})`);
    chromaClient = new ChromaClient({ host, port, ssl });
  }
  return chromaClient;
}

/**
 * Returns the shared ChromaDB collection, creating it (or reusing it) on
 * the first call.  Throws a descriptive error if the connection fails so the
 * caller can decide whether to fall back gracefully.
 */
export async function getChromaCollection(): Promise<Collection> {
  if (cachedCollection) return cachedCollection;

  const client = getClient();
  const collectionName = env.CHROMA_COLLECTION;

  try {
    // getOrCreateCollection is idempotent – safe to call on every startup.
    // We do NOT pass an embeddingFunction here because we supply our own
    // embeddings directly in every upsert/query call.
    cachedCollection = await client.getOrCreateCollection({
      name: collectionName,
      metadata: {
        description: 'GlobeX AI trade knowledge base',
        'hnsw:space': 'cosine',   // cosine similarity is better for text
      },
    });

    logger.info(`[ChromaDB] Collection "${collectionName}" ready`);
    return cachedCollection;
  } catch (err: any) {
    logger.error(`[ChromaDB] Failed to get/create collection "${collectionName}": ${err?.message}`);
    throw new Error(
      `ChromaDB connection failed. Is ChromaDB running at ${env.CHROMA_HOST}? ` +
        `Original error: ${err?.message ?? String(err)}`,
    );
  }
}

/**
 * Resets the cached collection reference (useful in tests or after a
 * reconnect scenario).
 */
export function resetChromaCache(): void {
  chromaClient = null;
  cachedCollection = null;
}
