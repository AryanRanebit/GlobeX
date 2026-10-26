import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { isRetryableError, sanitizeErrorMessage, getInternalErrorDetails } from './researchJob.types';
import { marketService } from './market.service';

export class ResearchJobWorker {
  public readonly workerId: string;
  private pollIntervalMs: number;
  private staleLockThresholdMs: number;
  private baseBackoffMs: number;
  private activeJobsCount = 0;
  private maxConcurrency = 5;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(options?: {
    workerId?: string;
    pollIntervalMs?: number;
    staleLockThresholdMs?: number;
    baseBackoffMs?: number;
    maxConcurrency?: number;
  }) {
    this.workerId = options?.workerId || `worker-${process.pid}-${Math.random().toString(36).substring(2, 8)}`;
    this.pollIntervalMs = options?.pollIntervalMs || 2500;
    this.staleLockThresholdMs = options?.staleLockThresholdMs || 5 * 60 * 1000; // 5 minutes
    this.baseBackoffMs = options?.baseBackoffMs || 1000;
    this.maxConcurrency = options?.maxConcurrency || 5;
  }

  public setBaseBackoffMs(ms: number) {
    this.baseBackoffMs = ms;
  }

  public setStaleLockThresholdMs(ms: number) {
    this.staleLockThresholdMs = ms;
  }

  /**
   * Starts the background worker and runs stale job recovery.
   */
  public start() {
    if (this.pollTimer) return;

    logger.info(`[ResearchJobWorker] Starting worker ${this.workerId}`);

    // Run recovery on start
    this.recoverStaleJobs().catch((err) => {
      logger.error(`[ResearchJobWorker] Initial stale job recovery error:`, err);
    });

    this.pollTimer = setInterval(() => {
      this.processNextJobs().catch((err) => {
        logger.error(`[ResearchJobWorker] Polling error:`, err);
      });
    }, this.pollIntervalMs);

    // Also trigger initial poll immediately
    this.trigger();
  }

  /**
   * Gracefully stops the worker loop.
   */
  public stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      logger.info(`[ResearchJobWorker] Stopped worker ${this.workerId}`);
    }
  }

  /**
   * Triggers an immediate processing cycle without waiting for the next timer tick.
   */
  public trigger() {
    setImmediate(() => {
      this.processNextJobs().catch((err) => {
        logger.error(`[ResearchJobWorker] Triggered run error:`, err);
      });
    });
  }

  /**
   * Recovers jobs that were stuck in RUNNING state due to a worker crash or restart.
   */
  public async recoverStaleJobs(staleThresholdMs?: number): Promise<number> {
    const threshold = staleThresholdMs ?? this.staleLockThresholdMs;
    const cutoff = new Date(Date.now() - threshold);

    try {
      const staleJobs = await prisma.researchJob.findMany({
        where: {
          status: 'RUNNING',
          lockedAt: { lt: cutoff },
        },
      });

      if (staleJobs.length === 0) return 0;

      logger.warn(`[ResearchJobWorker] Found ${staleJobs.length} stale running jobs to recover.`);

      let recoveredCount = 0;
      for (const job of staleJobs) {
        if (job.attempts < job.maxRetries) {
          // Re-queue with incremented opportunity
          await prisma.researchJob.update({
            where: { id: job.id },
            data: {
              status: 'QUEUED',
              lockedAt: null,
              lockedBy: null,
              nextRunAt: new Date(),
              error: 'Worker restarted or process interrupted; job re-queued for execution.',
              internalError: `Recovered from stale lock. Previous worker: ${job.lockedBy || 'unknown'}`,
            },
          });
          recoveredCount++;
        } else {
          // Max retries exceeded
          await prisma.researchJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              lockedAt: null,
              lockedBy: null,
              completedAt: new Date(),
              result: undefined,
              error: 'Market research failed: maximum retry attempts exceeded after interruption.',
              internalError: `Stale lock exceeded max retries (${job.attempts}/${job.maxRetries}). Previous worker: ${job.lockedBy || 'unknown'}`,
            },
          });
        }
      }

      return recoveredCount;
    } catch (err) {
      logger.error(`[ResearchJobWorker] Failed to recover stale jobs:`, err);
      return 0;
    }
  }

  /**
   * Atomically claims a queued job for this worker.
   */
  public async claimJob(jobId: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - this.staleLockThresholdMs);

    const result = await prisma.researchJob.updateMany({
      where: {
        id: jobId,
        status: 'QUEUED',
        nextRunAt: { lte: new Date() },
        OR: [
          { lockedAt: null },
          { lockedAt: { lt: cutoff } },
        ],
      },
      data: {
        status: 'RUNNING',
        lockedAt: new Date(),
        lockedBy: this.workerId,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    return result.count > 0;
  }

  /**
   * Directly claims and processes a specific job (useful for deterministic testing and instant runs).
   */
  public async processJobById(jobId: string): Promise<boolean> {
    const claimed = await this.claimJob(jobId);
    if (claimed) {
      await this.executeJob(jobId);
      return true;
    }
    return false;
  }

  /**
   * Scans for pending queued jobs and executes them.
   */
  public async processNextJobs(batchSize = 5): Promise<number> {
    if (this.activeJobsCount >= this.maxConcurrency) return 0;

    let processed = 0;
    try {
      const availableSlots = this.maxConcurrency - this.activeJobsCount;
      const takeLimit = Math.min(batchSize, availableSlots);

      const candidates = await prisma.researchJob.findMany({
        where: {
          status: 'QUEUED',
          nextRunAt: { lte: new Date() },
        },
        orderBy: { nextRunAt: 'asc' },
        take: takeLimit,
      });

      for (const candidate of candidates) {
        const claimed = await this.claimJob(candidate.id);
        if (claimed) {
          processed++;
          await this.executeJob(candidate.id);
        }
      }
    } catch (err) {
      logger.error(`[ResearchJobWorker] Error querying candidate jobs:`, err);
    }

    return processed;
  }

  /**
   * Executes a claimed job and handles success, retry, backoff, and failure.
   */
  public async executeJob(jobId: string): Promise<void> {
    this.activeJobsCount++;
    try {
      const job = await prisma.researchJob.findUnique({ where: { id: jobId } });
      if (!job) return;

      try {
        logger.info(`[ResearchJobWorker] Executing job ${jobId} (attempt ${job.attempts}/${job.maxRetries})`);

        const payload = job.inputPayload as any;
        const result = await marketService.executeResearch(job.userId, payload);

        // Successfully finished!
        await prisma.researchJob.update({
          where: { id: jobId },
          data: {
            status: 'SUCCEEDED',
            result: result as any,
            error: null,
            internalError: null,
            lockedAt: null,
            lockedBy: null,
            completedAt: new Date(),
          },
        });

        logger.info(`[ResearchJobWorker] Job ${jobId} succeeded successfully.`);
      } catch (error: any) {
        const isRetryable = isRetryableError(error);
        const sanitizedError = sanitizeErrorMessage(error);
        const internalDetails = getInternalErrorDetails(error);

        logger.warn(
          `[ResearchJobWorker] Job ${jobId} failed on attempt ${job.attempts}/${job.maxRetries}. ` +
          `Retryable: ${isRetryable}. Error: ${sanitizedError}`
        );

        if (isRetryable && job.attempts < job.maxRetries) {
          // Calculate exponential backoff with slight jitter
          const exponent = Math.max(0, job.attempts - 1);
          const backoffMs = Math.min(30000, this.baseBackoffMs * Math.pow(2, exponent)) + Math.floor(Math.random() * 200);
          const nextRunAt = new Date(Date.now() + backoffMs);

          await prisma.researchJob.update({
            where: { id: jobId },
            data: {
              status: 'QUEUED',
              nextRunAt,
              lockedAt: null,
              lockedBy: null,
              error: sanitizedError,
              internalError: internalDetails,
            },
          });

          logger.info(`[ResearchJobWorker] Job ${jobId} rescheduled for retry at ${nextRunAt.toISOString()} (backoff ${backoffMs}ms)`);
        } else {
          // Non-retryable or max retries reached: Mark permanently as FAILED
          await prisma.researchJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              result: undefined, // Guaranteed null / not populated
              error: sanitizedError,
              internalError: internalDetails,
            },
          });

          logger.error(`[ResearchJobWorker] Job ${jobId} marked as FAILED permanently: ${sanitizedError}`);
        }
      }
    } finally {
      this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
    }
  }
}

export const researchJobWorker = new ResearchJobWorker();
