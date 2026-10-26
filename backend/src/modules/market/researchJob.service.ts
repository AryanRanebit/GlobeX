import crypto from 'crypto';
import { prisma } from '../../config/database';
import type { AnalyzeMarketDto } from './market.schema';
import type { JobState, ResearchJobResponse } from './researchJob.types';
import { researchJobWorker } from './researchJob.worker';

export class JobAuthorizationError extends Error {
  constructor(message = 'Unauthorized to access this research job') {
    super(message);
    this.name = 'JobAuthorizationError';
  }
}

export function formatJobResponse(job: any): ResearchJobResponse {
  const normalizedStatus = (job.status || 'QUEUED').toLowerCase() as JobState;

  return {
    id: job.id,
    jobId: job.id,
    status: normalizedStatus,
    state: normalizedStatus,
    isCompleted: ['succeeded', 'failed'].includes(normalizedStatus),
    attempts: job.attempts,
    maxRetries: job.maxRetries,
    // Requirement 12: Ensure a failed job cannot be displayed as a successful research result
    result: normalizedStatus === 'succeeded' ? (job.result as any) : null,
    error: normalizedStatus === 'failed' ? (job.error || 'Job failed') : (job.error || null),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

export const researchJobService = {
  /**
   * Creates or deduplicates a research job and enqueues it for background execution.
   */
  async createJob(
    userId: string,
    dto: AnalyzeMarketDto & { idempotencyKey?: string; maxRetries?: number },
    options?: { idempotencyKey?: string; maxRetries?: number }
  ): Promise<ResearchJobResponse> {
    // Extract idempotency key and maxRetries from options or dto
    const explicitKey = options?.idempotencyKey || dto.idempotencyKey;
    const maxRetries = options?.maxRetries ?? dto.maxRetries ?? 3;

    // Generate deterministic idempotency key if not explicitly supplied
    const normalizedProduct = (dto.product || '').trim().toLowerCase();
    const sortedRegions = (dto.targetRegions || []).slice().sort().join(',');
    const idempotencyKey =
      explicitKey ||
      crypto
        .createHash('sha256')
        .update(`${userId}:${normalizedProduct}:${sortedRegions}:${dto.productId || ''}`)
        .digest('hex');

    // Requirement 10: Prevent duplicate processing for active jobs
    const activeDuplicate = await prisma.researchJob.findFirst({
      where: {
        userId,
        idempotencyKey,
        status: { in: ['QUEUED', 'RUNNING'] },
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) }, // within last 10 minutes
      },
    });

    if (activeDuplicate) {
      // Trigger worker just in case it's pending
      researchJobWorker.trigger();
      return formatJobResponse(activeDuplicate);
    }

    // Persist new job in PostgreSQL with initial QUEUED status
    const newJob = await prisma.researchJob.create({
      data: {
        userId,
        productId: dto.productId || null,
        status: 'QUEUED',
        inputPayload: dto as any,
        idempotencyKey,
        maxRetries,
        attempts: 0,
        nextRunAt: new Date(),
      },
    });

    // Prompt background execution
    researchJobWorker.trigger();

    return formatJobResponse(newJob);
  },

  /**
   * Retrieves a job by ID with strict user authorization boundaries.
   * Requirement 6: Ensure that only authorized users can access their jobs and results.
   */
  async getJob(jobId: string, requestingUserId: string): Promise<ResearchJobResponse | null> {
    const job = await prisma.researchJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    if (job.userId !== requestingUserId) {
      throw new JobAuthorizationError();
    }

    return formatJobResponse(job);
  },

  /**
   * Retrieves recent research jobs belonging to the authenticated user.
   */
  async getUserJobs(userId: string, limit = 20, offset = 0): Promise<ResearchJobResponse[]> {
    const jobs = await prisma.researchJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
    });

    return jobs.map(formatJobResponse);
  },
};
