/**
 * ai/embeddings.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Embedding generation using @xenova/transformers (runs locally, no API key).
 *
 * Model: Xenova/all-MiniLM-L6-v2 – 384-dimensional sentence embeddings,
 * ~22 MB, excellent quality for semantic search, works fully offline.
 *
 * The pipeline is lazily loaded and cached so it's only downloaded once.
 *
 * Usage:
 *   import { generateEmbedding, generateEmbeddings } from './embeddings';
 *   const vec = await generateEmbedding('Indian spice exports');
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { logger } from '../utils/logger';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Cached pipeline instance – loaded on first use.
let embedder: FeatureExtractionPipeline | null = null;

/**
 * Returns the feature-extraction pipeline, downloading the model on first call.
 */
async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    logger.info(`[Embeddings] Loading model "${MODEL_NAME}" (first-run download may take a moment)`);
    // 'feature-extraction' produces sentence-level embeddings via mean pooling.
    embedder = (await pipeline('feature-extraction', MODEL_NAME, {
      revision: 'default',
    })) as FeatureExtractionPipeline;
    logger.info('[Embeddings] Model ready');
  }
  return embedder!;
}

/**
 * Generate a single embedding vector for a text string.
 * Returns a plain number[] (float32 values).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embed = await getEmbedder();

  // mean_pooling=true averages token embeddings → single sentence vector.
  const output = await embed(text, { pooling: 'mean', normalize: true });

  // output.data is a Float32Array – convert to plain Array for ChromaDB.
  return Array.from(output.data as Float32Array);
}

/**
 * Batch-generate embeddings for multiple texts.
 * More efficient than calling generateEmbedding() in a loop because the
 * transformer model can process multiple sequences in one forward pass.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embed = await getEmbedder();
  const results: number[][] = [];

  // Process in batches of 32 to avoid memory issues with large corpora.
  const BATCH_SIZE = 32;
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const outputs = await Promise.all(
      batch.map((t) => embed(t, { pooling: 'mean', normalize: true })),
    );
    results.push(...outputs.map((o) => Array.from(o.data as Float32Array)));
  }

  return results;
}
