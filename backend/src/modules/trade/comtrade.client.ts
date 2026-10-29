/**
 * UN Comtrade API Client
 *
 * Rate-limit-aware fetcher with:
 *  - Cache-first reads (DB-backed, 24h TTL)
 *  - Daily call counter (respects free-tier ~500/day)
 *  - Exponential backoff with jitter on 429/5xx
 *  - Sequential request queue to avoid burst-tripping
 *
 * Source attribution: UN Comtrade, United Nations Statistics Division (UNSD)
 * https://comtradeplus.un.org/
 */

import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = 'https://comtradeapi.un.org/data/v1/get/C/A/HS';
const PREVIEW_BASE = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS';
const MAX_DAILY_CALLS = 450; // conservative buffer under 500
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ─── In-memory daily counter (resets at midnight UTC) ────────────────────────

let dailyCallCount = 0;
let dailyResetDate = new Date().toISOString().slice(0, 10);

function checkAndResetDailyCounter(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyResetDate) {
    dailyCallCount = 0;
    dailyResetDate = today;
  }
}

// ─── Sequential request queue ────────────────────────────────────────────────

type QueueItem = { execute: () => Promise<void> };
const queue: QueueItem[] = [];
let processing = false;

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const item = queue.shift()!;
    await item.execute();
    // Small inter-request delay to be courteous
    await sleep(200);
  }
  processing = false;
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      execute: async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      },
    });
    processQueue();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs * 0.5;
}

export interface ComtradeQueryParams {
  reporterCode?: string;
  period?: string;
  cmdCode?: string;
  flowCode?: string;
  partner2Code?: string;
  customsCode?: string;
  motCode?: string;
  maxRecords?: string;
  includeDesc?: string;
}

function canonicalHash(params: ComtradeQueryParams): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${(params as any)[k]}`)
    .join('&');
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

// ─── Core fetch with retry ──────────────────────────────────────────────────

async function fetchWithRetry(
  params: ComtradeQueryParams,
  attempt = 0,
): Promise<any> {
  checkAndResetDailyCounter();

  if (dailyCallCount >= MAX_DAILY_CALLS) {
    throw new Error(
      `Comtrade daily call limit reached (${MAX_DAILY_CALLS}). ` +
        'Try again after midnight UTC or use cached data.',
    );
  }

  const apiKey = env.COMTRADE_API_KEY;
  const base = apiKey ? API_BASE : PREVIEW_BASE;
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, v);
  });

  const headers: Record<string, string> = {
    'User-Agent': 'GlobeX-Comtrade-Client/1.0',
  };
  if (apiKey) {
    headers['Ocp-Apim-Subscription-Key'] = apiKey;
  }

  try {
    dailyCallCount++;
    logger.info(
      `[Comtrade] Fetching (attempt ${attempt + 1}/${MAX_RETRIES + 1}, daily ${dailyCallCount}/${MAX_DAILY_CALLS}): ${url.pathname}?cmdCode=${params.cmdCode}`,
    );

    const response = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(30_000) });

    if (response.status === 429 || response.status >= 500) {
      if (attempt < MAX_RETRIES) {
        const delay = jitter(BASE_DELAY_MS * Math.pow(2, attempt));
        logger.warn(
          `[Comtrade] ${response.status} — retrying in ${Math.round(delay)}ms`,
        );
        await sleep(delay);
        return fetchWithRetry(params, attempt + 1);
      }
      throw new Error(`Comtrade API error ${response.status} after ${MAX_RETRIES + 1} attempts`);
    }

    if (!response.ok) {
      throw new Error(`Comtrade API responded ${response.status}: ${await response.text()}`);
    }

    return response.json();
  } catch (err: any) {
    if (attempt < MAX_RETRIES && (err.name === 'TimeoutError' || err.code === 'ECONNRESET')) {
      const delay = jitter(BASE_DELAY_MS * Math.pow(2, attempt));
      logger.warn(`[Comtrade] Network error — retrying in ${Math.round(delay)}ms: ${err.message}`);
      await sleep(delay);
      return fetchWithRetry(params, attempt + 1);
    }
    throw err;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ComtradeRecord {
  reporterCode: number;
  reporterDesc: string;
  partnerCode: number;
  partnerDesc: string;
  partnerISO: string;
  partnerISO3?: string; // not present in API payloads; partnerISO is the real field
  period: number;
  flowCode: string;
  flowDesc: string;
  cmdCode: string;
  cmdDesc: string;
  primaryValue: number;
  netWgt: number | null;
  qty: number | null;
  qtyUnitCode: string | number | null; // API returns an int (e.g. 8); coerced to String before Prisma writes
  [key: string]: any;
}

export const comtradeClient = {
  /**
   * Fetch Comtrade data with cache-first strategy.
   * Returns cached data if fresh; otherwise fetches from API and caches.
   */
  async query(params: ComtradeQueryParams): Promise<ComtradeRecord[]> {
    const defaults: ComtradeQueryParams = {
      reporterCode: '699', // India
      period: '2025',
      flowCode: 'X', // Exports
      partner2Code: '0',
      customsCode: 'C00',
      motCode: '0',
      maxRecords: '500',
      includeDesc: 'true',
      ...params,
    };

    const hash = canonicalHash(defaults);

    // 1. Check cache
    const cached = await prisma.comtradeCache.findUnique({
      where: { queryHash: hash },
    });

    if (cached && cached.expiresAt > new Date()) {
      logger.debug(`[Comtrade] Cache HIT for hash ${hash.slice(0, 8)}…`);
      const body = cached.responseBody as any;
      return body.data || [];
    }

    // 2. Fetch from API (queued)
    logger.debug(`[Comtrade] Cache MISS for hash ${hash.slice(0, 8)}… — fetching from API`);
    const responseBody = await enqueue(() => fetchWithRetry(defaults));
    const records: ComtradeRecord[] = responseBody?.data || [];

    // 3. Upsert cache
    const now = new Date();
    await prisma.comtradeCache.upsert({
      where: { queryHash: hash },
      update: {
        responseBody: responseBody,
        recordCount: records.length,
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
      },
      create: {
        queryHash: hash,
        queryParams: defaults as any,
        responseBody: responseBody,
        recordCount: records.length,
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
      },
    });

    return records;
  },

  /**
   * Get the current daily call count (for monitoring / health-checks).
   */
  getDailyUsage() {
    checkAndResetDailyCounter();
    return { used: dailyCallCount, limit: MAX_DAILY_CALLS, date: dailyResetDate };
  },
};
