/**
 * ai/llm.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LLM caller with RAG integration.
 *
 * Uses the Featherless.ai API (OpenAI-compatible endpoint) to generate
 * responses from any open-source LLM model.
 *
 * The full RAG flow is:
 *   User Query → Embed → ChromaDB Search → Build Prompt → LLM → Response
 *
 * Usage:
 *   import { ragChat } from './llm';
 *   const result = await ragChat(sessionId, userMessage);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { retrieveContext, buildRagPrompt, formatChunksForResponse } from './rag';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RagChatResult {
  response: string;
  rag_used: boolean;
  rag_sources: Array<{ source: string; relevance: number; excerpt: string }>;
  model: string;
}

// ─── Featherless / OpenAI-compatible LLM caller ───────────────────────────────

const FEATHERLESS_BASE_URL = 'https://api.featherless.ai/v1';

/**
 * Call the LLM with a grounded RAG prompt.
 *
 * Returns the generated text plus metadata about which knowledge base chunks
 * were used (useful for transparency in the UI).
 */
export async function ragChat(
  userQuery: string,
  options?: { topK?: number; maxTokens?: number },
): Promise<RagChatResult> {
  // Read directly from env (validated Zod object that sources from process.env)
  const apiKey = env.FEATHERLESS_API_KEY;
  const model = env.LLM_MODEL;   // e.g. "Qwen/Qwen3-32B" – never hardcoded

  logger.info(`[LLM] Using model: ${model}`);

  // ── Step 1: Retrieve context from ChromaDB ────────────────────────────────
  const ragResult = await retrieveContext(userQuery, options?.topK ?? 5);

  if (ragResult.contextFound) {
    logger.info(`[LLM] RAG found ${ragResult.chunks.length} relevant chunks for query`);
  } else {
    logger.info('[LLM] No relevant context found – proceeding without RAG context');
  }

  // ── Step 2: Build grounded prompt ────────────────────────────────────────
  const systemPrompt = buildRagPrompt(userQuery, ragResult);

  // ── Step 3: Call LLM (or return a structured fallback if no API key) ──────
  if (!apiKey) {
    logger.warn('[LLM] FEATHERLESS_API_KEY not set – returning RAG-only response');
    return {
      response: ragResult.contextFound
        ? `Based on the GlobeX knowledge base:\n\n${ragResult.chunks.map((c) => c.text).join('\n\n')}`
        : 'The AI model is not configured. Please set FEATHERLESS_API_KEY in your environment.',
      rag_used: ragResult.contextFound,
      rag_sources: formatChunksForResponse(ragResult.chunks),
      model: 'none',
    };
  }

  try {
    const response = await fetch(`${FEATHERLESS_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are GlobeX, an expert AI assistant specialising in Indian export trade, compliance, market analysis, and business development for SMEs.',
          },
          {
            role: 'user',
            content: systemPrompt,
          },
        ],
        max_tokens: options?.maxTokens ?? 2048,  // 2048 gives Qwen3 room to reason
        temperature: 0.3,   // Low temperature for factual, grounded trade responses
        stream: false,
      }),
      // 90s timeout — Qwen3-32B is larger and may take longer than 7B models
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Featherless API ${response.status}: ${errBody}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
    };

    const rawAnswer = data.choices[0]?.message?.content ?? 'No response generated.';

    // Qwen3-32B (and other thinking models) prefix the answer with a
    // <think>...</think> chain-of-thought block.  Strip it so the client
    // receives only the final, clean answer.
    const answer = rawAnswer.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();

    return {
      response: answer,
      rag_used: ragResult.contextFound,
      rag_sources: formatChunksForResponse(ragResult.chunks),
      model: data.model ?? model,
    };
  } catch (err: any) {
    logger.error(`[LLM] Featherless API call failed: ${err?.message}`);

    // Graceful fallback: return the raw retrieved context if LLM is down.
    if (ragResult.contextFound) {
      return {
        response: `The AI model is temporarily unavailable. Here is the relevant information from the knowledge base:\n\n${ragResult.chunks.map((c) => c.text).join('\n\n')}`,
        rag_used: true,
        rag_sources: formatChunksForResponse(ragResult.chunks),
        model: 'fallback',
      };
    }

    throw new Error(`LLM call failed and no RAG context available: ${err?.message}`);
  }
}
