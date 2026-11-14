/**
 * ai/indexDocuments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Document indexing pipeline.
 *
 * Run with:  npm run index-docs
 *
 * What it does:
 *   1. Reads all .txt and .md files from the /data directory.
 *   2. Splits each file into overlapping chunks (512 chars, 64-char overlap).
 *   3. Generates embeddings for each chunk.
 *   4. Upserts chunks into ChromaDB (safe to re-run – duplicate IDs are updated).
 *
 * Add new documents to /data/ and re-run this script whenever the knowledge
 * base changes. The server does NOT need to restart.
 *
 * Architecture note: This script imports from src/ directly so it shares the
 * same env config and ChromaDB client used by the running server.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';               // Load .env before anything else
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { getChromaCollection } from './chroma';
import { generateEmbeddings } from './embeddings';
import { logger } from '../utils/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Directory containing source documents. */
const DATA_DIR = path.resolve(process.cwd(), 'data');

/** Target chunk size in characters. */
const CHUNK_SIZE = 512;

/** Overlap between consecutive chunks to preserve context at boundaries. */
const CHUNK_OVERLAP = 64;

/** Supported file extensions. */
const SUPPORTED_EXTENSIONS = ['.txt', '.md'];

// ─── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Split a document into overlapping text chunks.
 *
 * Overlap ensures that sentences/paragraphs split across boundaries are still
 * retrievable – a common RAG best-practice.
 */
function chunkText(text: string, size: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    start += size - overlap;            // slide window with overlap
  }

  return chunks;
}

/**
 * Generate a stable, deterministic ID for a chunk based on its content.
 * Using content-hash means re-indexing the same document won't create
 * duplicates (ChromaDB upsert is idempotent on the same ID).
 */
function chunkId(filename: string, chunkIndex: number, chunkText: string): string {
  const hash = createHash('sha256')
    .update(`${filename}::${chunkIndex}::${chunkText}`)
    .digest('hex')
    .slice(0, 16);
  return `${path.basename(filename, path.extname(filename))}_${hash}`;
}

// ─── File discovery ───────────────────────────────────────────────────────────

function discoverDocuments(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    logger.warn(`[IndexDocuments] Data directory not found: ${dir}`);
    return [];
  }

  return fs.readdirSync(dir)
    .filter((f) => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f));
}

// ─── Main indexing pipeline ───────────────────────────────────────────────────

async function indexDocuments(): Promise<void> {
  logger.info('════════════════════════════════════════════════');
  logger.info(' GlobeX AI – Document Indexing Pipeline');
  logger.info('════════════════════════════════════════════════');
  logger.info(`Data directory: ${DATA_DIR}`);

  // 1. Discover documents.
  const files = discoverDocuments(DATA_DIR);
  if (files.length === 0) {
    logger.warn('[IndexDocuments] No supported documents found. Place .txt or .md files in /data/');
    return;
  }
  logger.info(`[IndexDocuments] Found ${files.length} document(s): ${files.map(f => path.basename(f)).join(', ')}`);

  // 2. Get (or create) the ChromaDB collection.
  const collection = await getChromaCollection();

  let totalChunks = 0;
  let totalIndexed = 0;

  // 3. Process each file.
  for (const filePath of files) {
    const filename = path.basename(filePath);
    logger.info(`\n[IndexDocuments] Processing: ${filename}`);

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err: any) {
      logger.error(`[IndexDocuments] Failed to read "${filename}": ${err?.message}`);
      continue;
    }

    // 4. Chunk the document.
    const chunks = chunkText(content);
    totalChunks += chunks.length;
    logger.info(`[IndexDocuments]   → ${chunks.length} chunks`);

    if (chunks.length === 0) continue;

    // 5. Generate embeddings in batch.
    logger.info(`[IndexDocuments]   → Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks);

    // 6. Build ChromaDB upsert payload.
    const ids = chunks.map((chunk, i) => chunkId(filePath, i, chunk));
    const metadatas = chunks.map((_, i) => ({
      source: filename,
      filepath: filePath,
      chunkIndex: String(i),
      totalChunks: String(chunks.length),
      indexedAt: new Date().toISOString(),
    }));

    // 7. Upsert into ChromaDB (idempotent – safe to re-run).
    await collection.upsert({
      ids,
      embeddings,
      documents: chunks,
      metadatas,
    });

    totalIndexed += chunks.length;
    logger.info(`[IndexDocuments]   ✓ Upserted ${chunks.length} chunks from "${filename}"`);
  }

  logger.info('\n════════════════════════════════════════════════');
  logger.info(`[IndexDocuments] Done! ${totalIndexed}/${totalChunks} chunks indexed.`);
  logger.info('════════════════════════════════════════════════\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

indexDocuments().catch((err) => {
  logger.error(`[IndexDocuments] Fatal error: ${err?.message ?? err}`);
  process.exit(1);
});
