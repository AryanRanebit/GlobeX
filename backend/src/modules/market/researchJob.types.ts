import type { MarketAnalysisResult } from './market.service';

export type JobState = 'queued' | 'running' | 'succeeded' | 'failed';

export interface CreateResearchJobDto {
  product: string;
  targetRegions?: string[];
  productId?: string;
  description?: string;
  idempotencyKey?: string;
  maxRetries?: number;
}

export interface ResearchJobResponse {
  id: string;
  jobId: string;
  status: JobState;
  state: JobState;
  isCompleted: boolean;
  attempts: number;
  maxRetries: number;
  result: MarketAnalysisResult | null;
  error: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

/**
 * Classifies whether an error is transient/retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const err = error as Record<string, any>;

  // Explicit flag override
  if (typeof err.isRetryable === 'boolean') {
    return err.isRetryable;
  }

  // Non-retryable HTTP status codes
  const status = Number(err.status || err.statusCode || (err.response && err.response.status));
  if (status && [400, 401, 403, 404, 422].includes(status)) {
    return false;
  }

  const message = String(err.message || error || '').toLowerCase();
  const name = String(err.name || '').toLowerCase();
  const code = String(err.code || '').toUpperCase();

  // Non-retryable validation or client errors
  if (
    message.includes('validation') ||
    message.includes('invalid input') ||
    message.includes('required') ||
    message.includes('bad request') ||
    message.includes('malformed input')
  ) {
    return false;
  }

  // Retryable transient conditions:
  // 1. Timeouts & aborts
  if (
    name.includes('abort') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    code === 'ETIMEDOUT'
  ) {
    return true;
  }

  // 2. Network failures
  if (
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('connection refused') ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN'
  ) {
    return true;
  }

  // 3. Upstream HTTP server errors and rate limits
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }

  if (
    message.includes('status 500') ||
    message.includes('status 502') ||
    message.includes('status 503') ||
    message.includes('status 504') ||
    message.includes('status 429') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return true;
  }

  // 4. Upstream malformed JSON response or parser glitch (can be transient upstream chunk drop)
  if (
    message.includes('failed to parse response') ||
    message.includes('unexpected token') ||
    message.includes('malformed data')
  ) {
    return true;
  }

  // 5. Database temporary locks or deadlocks
  if (code === 'P1001' || code === 'P2034' || message.includes('deadlock')) {
    return true;
  }

  return false;
}

/**
 * Sanitizes errors for safe external client consumption without leaking
 * database credentials, internal IPs, API keys, or stack traces.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred during market research.';

  let msg = typeof error === 'string' ? error : (error as any).message || String(error);

  // Redact database connection strings
  msg = msg.replace(/postgres(ql)?:\/\/[^@\s]+@[^\s\/]+/gi, 'postgresql://[REDACTED]');
  msg = msg.replace(/postgres(ql)?:\/\/[^\s]+/gi, 'postgresql://[REDACTED]');

  // Redact potential API keys and tokens
  msg = msg.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  msg = msg.replace(/(?:api[-_]?key|secret|password|token)[=:]\s*["']?[A-Za-z0-9_\-\.]+["']?/gi, '$1=[REDACTED]');
  msg = msg.replace(/\b(AQ\.[A-Za-z0-9_\-]{15,}|sk-[A-Za-z0-9_\-]{15,})\b/g, '[REDACTED_KEY]');

  // Strip stack trace paths (only lines starting with "at ")
  msg = msg
    .split('\n')
    .filter((line: string) => !line.trim().startsWith('at '))
    .join(' ')
    .trim();

  // Normalize common upstream errors into clean user messages
  const lower = msg.toLowerCase();
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'Market research agent request timed out after 30 seconds.';
  }
  if (lower.includes('fetch failed') || lower.includes('econnrefused')) {
    return 'Market research provider is temporarily unreachable.';
  }
  if (lower.includes('status 500') || lower.includes('internal server error')) {
    return 'Market research upstream service encountered an internal error.';
  }
  if (lower.includes('malformed data') || lower.includes('failed to parse')) {
    return 'Market research upstream service returned an invalid response format.';
  }

  return msg || 'Market research job failed.';
}

/**
 * Extracts comprehensive internal diagnostics for persistent storage in internalError.
 */
export function getInternalErrorDetails(error: unknown): string {
  if (!error) return 'Unknown internal error';

  const err = error as any;
  const parts: string[] = [];

  if (err.name) parts.push(`Name: ${err.name}`);
  if (err.message) parts.push(`Message: ${err.message}`);
  if (err.code) parts.push(`Code: ${err.code}`);
  if (err.status || err.statusCode) parts.push(`Status: ${err.status || err.statusCode}`);
  if (err.stack) parts.push(`Stack: ${err.stack}`);

  return parts.length > 0 ? parts.join('\n') : String(error);
}
