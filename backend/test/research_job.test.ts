import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database';
import { researchJobWorker } from '../src/modules/market/researchJob.worker';
import { marketResearchAgent } from '../src/modules/agents/MarketResearchAgent';

const app = createApp();

const DEFAULT_MOCK_OUTPUT = {
  product: 'Default Product',
  analyzedAt: new Date().toISOString(),
  summary: 'Default mock analysis.',
  recommendedCountries: [
    {
      country: 'Germany',
      countryCode: 'DE',
      demandScore: 80,
      growthRate: '10%',
      competition: 'Low' as const,
    },
  ],
};

describe('GlobeX — Phase 6: Resilient Research Job Execution Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    await connectDatabase();
    researchJobWorker.setBaseBackoffMs(20); // Fast backoff for tests
    researchJobWorker.setStaleLockThresholdMs(100); // Fast stale threshold for tests

    // Clean up test data
    await prisma.researchJob.deleteMany({
      where: { user: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } } },
    });
    await prisma.opportunity.deleteMany({
      where: { user: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } } },
    });
    await prisma.product.deleteMany({
      where: { user: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } },
    });

    // Create User A
    const resA = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Exporter A',
        email: 'usera_phase6@globex.in',
        password: 'Password123!',
        companyName: 'A Exports Ltd',
        companyType: 'Manufacturer',
        industry: 'Agriculture',
      });
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // Create User B
    const resB = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Exporter B',
        email: 'userb_phase6@globex.in',
        password: 'Password123!',
        companyName: 'B Spices Ltd',
        companyType: 'Trader',
        industry: 'Spices',
      });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.researchJob.deleteMany({
      where: { user: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } } },
    });
    await prisma.opportunity.deleteMany({
      where: { user: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } } },
    });
    await prisma.product.deleteMany({
      where: { user: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['usera_phase6@globex.in', 'userb_phase6@globex.in'] } },
    });
    await disconnectDatabase();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(marketResearchAgent, 'analyze').mockResolvedValue(DEFAULT_MOCK_OUTPUT);
  });

  describe('1. Prompt Job Creation and Persistence (Requirements 1, 2, 4)', () => {
    it('should create research job promptly and persist in database with queued status', async () => {
      const startTime = Date.now();
      const res = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Organic Cardamom',
          targetRegions: ['United States', 'United Kingdom'],
        });
      const responseTime = Date.now() - startTime;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobId).toBeDefined();
      expect(res.body.data.status).toBe('queued');
      // Prompt response (< 2000ms)
      expect(responseTime).toBeLessThan(2000);

      // Verify persistence in PostgreSQL
      const persistedJob = await prisma.researchJob.findUnique({
        where: { id: res.body.data.jobId },
      });
      expect(persistedJob).not.toBeNull();
      expect(persistedJob?.userId).toBe(userAId);
      expect(['QUEUED', 'RUNNING', 'SUCCEEDED']).toContain(persistedJob?.status);
      expect((persistedJob?.inputPayload as any).product).toBe('Organic Cardamom');
    });

    it('should support explicit POST /api/v1/market/jobs endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/market/jobs')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Darjeeling Tea',
          targetRegions: ['Germany', 'Japan'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobId).toBeDefined();
      expect(res.body.data.status).toBe('queued');
    });
  });

  describe('2. Status Transitions and Successful Execution (Requirements 3, 5)', () => {
    it('should transition from queued -> running -> succeeded and retrieve results', async () => {
      vi.spyOn(marketResearchAgent, 'analyze').mockImplementation(async (input) => {
        if (input.product === 'Kashmiri Saffron') {
          return {
            product: 'Kashmiri Saffron',
            category: 'Spices & Condiments',
            candidateHsCodes: [{ hs_code: '0910.20.00', description: 'Saffron', classification_status: 'CANDIDATE' }],
            analyzedAt: new Date().toISOString(),
            summary: 'Exceptional global export demand for premium Kashmiri Saffron.',
            dataSourceMode: 'ai_qualitative_estimate',
            disclaimer: 'Candidate HS codes are non-binding estimates.',
            recommendedCountries: [
              {
                country: 'United States',
                countryCode: 'US',
                demandScore: 95,
                growthRate: '25%',
                competition: 'Medium',
                marketSize: '$300M',
                trend: 'Growing',
                insights: 'Premium gourmet retail interest',
              },
              {
                country: 'United Arab Emirates',
                countryCode: 'AE',
                demandScore: 92,
                growthRate: '20%',
                competition: 'High',
                marketSize: '$180M',
                trend: 'Accelerating',
                insights: 'Hub for Gulf spice trade',
              },
            ],
          };
        }
        return {
          product: input.product,
          analyzedAt: new Date().toISOString(),
          summary: `Analysis for ${input.product}`,
          recommendedCountries: [],
        };
      });

      const createRes = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Kashmiri Saffron',
          targetRegions: ['United States', 'United Arab Emirates'],
        });

      const jobId = createRes.body.data.jobId;
      expect(jobId).toBeDefined();

      // Poll status until succeeded
      let statusData: any = null;
      for (let i = 0; i < 30; i++) {
        const statusRes = await request(app)
          .get(`/api/v1/market/analyze/status/${jobId}`)
          .set('Authorization', `Bearer ${userAToken}`);
        statusData = statusRes.body.data;
        if (statusData && (statusData.status === 'succeeded' || statusData.status === 'failed')) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(statusData.status).toBe('succeeded');
      expect(statusData.isCompleted).toBe(true);
      expect(statusData.result).not.toBeNull();
      expect(statusData.result.product).toBe('Kashmiri Saffron');
      expect(statusData.result.recommendedCountries.length).toBe(2);
      expect(statusData.error).toBeNull();

      // Verify opportunities persisted in DB
      const opportunities = await prisma.opportunity.findMany({
        where: { userId: userAId, product: { productName: 'Kashmiri Saffron' } },
      });
      expect(opportunities.length).toBe(2);
    });
  });

  describe('3. Failure Handling and Result Integrity (Requirements 11, 12)', () => {
    it('should transition to failed on non-retryable error and ensure result is null', async () => {
      // Simulate non-retryable validation error
      vi.spyOn(marketResearchAgent, 'analyze').mockRejectedValueOnce(
        Object.assign(new Error('Validation error: invalid input characters in product'), {
          isRetryable: false,
        })
      );

      const createRes = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Invalid Product Name Format',
        });

      const jobId = createRes.body.data.jobId;

      // Poll until failure completes
      let statusData: any = null;
      for (let i = 0; i < 30; i++) {
        const statusRes = await request(app)
          .get(`/api/v1/market/analyze/status/${jobId}`)
          .set('Authorization', `Bearer ${userAToken}`);
        statusData = statusRes.body.data;
        if (statusData && statusData.status === 'failed') break;
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(statusData.status).toBe('failed');
      expect(statusData.isCompleted).toBe(true);
      // Requirement 12: Ensure failed job cannot be displayed as successful
      expect(statusData.result).toBeNull();
      expect(statusData.error).toContain('Validation error');

      // Verify DB record
      const dbJob = await prisma.researchJob.findUnique({ where: { id: jobId } });
      expect(dbJob?.status).toBe('FAILED');
      expect(dbJob?.result).toBeNull();
    });

    it('should sanitize errors and not leak database credentials or internal secrets (Requirement 11)', async () => {
      // Simulate error leaking database credentials and secret key
      const leakedSecretError = new Error(
        'Database connection failed at postgresql://postgres:super_secret_password_123@10.0.0.5:5432/globex_ai with key sk-abcdef1234567890abcdef123456'
      );
      (leakedSecretError as any).isRetryable = false;

      vi.spyOn(marketResearchAgent, 'analyze').mockRejectedValueOnce(leakedSecretError);

      const createRes = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'LeakTest Product',
        });

      const jobId = createRes.body.data.jobId;

      let statusData: any = null;
      for (let i = 0; i < 30; i++) {
        const statusRes = await request(app)
          .get(`/api/v1/market/analyze/status/${jobId}`)
          .set('Authorization', `Bearer ${userAToken}`);
        statusData = statusRes.body.data;
        if (statusData && statusData.status === 'failed') break;
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(statusData.status).toBe('failed');
      // Public error must NOT leak password, IP, or secret key
      expect(statusData.error).not.toContain('super_secret_password_123');
      expect(statusData.error).not.toContain('sk-abcdef1234567890abcdef123456');
      expect(statusData.error).toContain('[REDACTED]');

      // Internal error in DB stores full details for debugging
      const dbJob = await prisma.researchJob.findUnique({ where: { id: jobId } });
      expect(dbJob?.internalError).toContain('super_secret_password_123');
    });
  });

  describe('4. Provider Timeout and Transient Retries with Backoff (Requirements 7, 8, 9)', () => {
    it('should retry transient timeout errors with backoff and succeed on subsequent attempt', async () => {
      // 1st attempt: times out
      // 2nd attempt: succeeds
      const analyzeSpy = vi
        .spyOn(marketResearchAgent, 'analyze')
        .mockRejectedValueOnce(new Error('MarketResearchAgent request timed out after 30 seconds'))
        .mockResolvedValueOnce({
          product: 'Ginger Oleoresin',
          category: 'Extracts',
          analyzedAt: new Date().toISOString(),
          summary: 'Recovered after transient timeout.',
          recommendedCountries: [
            {
              country: 'Germany',
              countryCode: 'DE',
              demandScore: 85,
              growthRate: '12%',
              competition: 'Low',
              marketSize: '$120M',
              trend: 'Stable',
              insights: 'Pharmaceutical and flavor demand',
            },
          ],
        });

      const createRes = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Ginger Oleoresin',
          targetRegions: ['Germany'],
        });

      const jobId = createRes.body.data.jobId;

      // Poll until 1st attempt completes and schedules retry
      let jobInDb: any = null;
      for (let i = 0; i < 30; i++) {
        jobInDb = await prisma.researchJob.findUnique({ where: { id: jobId } });
        if (jobInDb?.attempts && jobInDb.attempts >= 1 && jobInDb.status === 'QUEUED') break;
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(jobInDb?.status).toBe('QUEUED');
      expect(jobInDb?.attempts).toBe(1);

      // Advance nextRunAt to past so backoff is ready, then trigger worker
      await prisma.researchJob.update({
        where: { id: jobId },
        data: { nextRunAt: new Date(Date.now() - 1000) },
      });
      await researchJobWorker.processJobById(jobId);

      jobInDb = await prisma.researchJob.findUnique({ where: { id: jobId } });
      expect(jobInDb?.status).toBe('SUCCEEDED');
      expect(jobInDb?.attempts).toBe(2);
      expect(jobInDb?.result).not.toBeNull();
      expect(analyzeSpy).toHaveBeenCalledTimes(2);
    });

    it('should enforce bounded retries and fail once maxRetries limit is reached', async () => {
      // Always fails with retryable 500 error
      const analyzeSpy = vi
        .spyOn(marketResearchAgent, 'analyze')
        .mockRejectedValue(new Error('Agent service responded with status 500'));

      const createRes = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Pepper Oil Bounded Retry Test',
          maxRetries: 3,
        });

      const jobId = createRes.body.data.jobId;

      // Wait for attempt 1
      let job: any = null;
      for (let i = 0; i < 30; i++) {
        job = await prisma.researchJob.findUnique({ where: { id: jobId } });
        if (job?.attempts && job.attempts >= 1 && job.status === 'QUEUED') break;
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(job?.attempts).toBe(1);
      expect(job?.status).toBe('QUEUED');

      // Attempt 2
      await prisma.researchJob.update({ where: { id: jobId }, data: { nextRunAt: new Date() } });
      await researchJobWorker.processJobById(jobId);
      job = await prisma.researchJob.findUnique({ where: { id: jobId } });
      expect(job?.attempts).toBe(2);
      expect(job?.status).toBe('QUEUED');

      // Attempt 3 (Max reached)
      await prisma.researchJob.update({ where: { id: jobId }, data: { nextRunAt: new Date() } });
      await researchJobWorker.processJobById(jobId);
      job = await prisma.researchJob.findUnique({ where: { id: jobId } });
      expect(job?.attempts).toBe(3);
      // Bounded retries: must transition to FAILED
      expect(job?.status).toBe('FAILED');
      expect(job?.result).toBeNull();
      expect(job?.error).toContain('upstream service');

      // Attempt 4: Worker should NOT process it again
      await researchJobWorker.processJobById(jobId);
      expect(analyzeSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('5. Duplicate Processing and Idempotency (Requirement 10)', () => {
    it('should deduplicate identical concurrent requests using idempotency key', async () => {
      const idempotencyKey = 'unique-key-phase6-test-123';

      const res1 = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          product: 'Organic Cumin',
        });

      const res2 = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({
          product: 'Organic Cumin',
        });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      // Both must return the same job ID
      expect(res1.body.data.jobId).toBe(res2.body.data.jobId);

      // Verify only 1 record created in database
      const count = await prisma.researchJob.count({
        where: { userId: userAId, idempotencyKey },
      });
      expect(count).toBe(1);
    });
  });

  describe('6. Authorization and Data Boundaries (Requirement 6)', () => {
    it('should prevent User B from accessing User A research job (403 Forbidden)', async () => {
      const createRes = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Private User A Secret Commodity',
        });

      const jobId = createRes.body.data.jobId;

      // User B tries to view User A's job
      const unauthorizedRes = await request(app)
        .get(`/api/v1/market/analyze/status/${jobId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.success).toBe(false);
      expect(unauthorizedRes.body.message).toContain('Unauthorized');
    });

    it('should return 404 for non-existent job ID', async () => {
      const res = await request(app)
        .get('/api/v1/market/analyze/status/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/market/analyze/status/any-id');
      expect(res.status).toBe(401);
    });
  });

  describe('7. Worker Restarts and Stale Job Recovery (Requirement 7)', () => {
    it('should recover interrupted running jobs when worker restarts or scans', async () => {
      // Simulate an interrupted job stuck in RUNNING from a previous worker/crash
      const staleJob = await prisma.researchJob.create({
        data: {
          userId: userAId,
          status: 'RUNNING',
          inputPayload: { product: 'Recoverable Tea' },
          lockedAt: new Date(Date.now() - 1000), // older than 100ms threshold
          lockedBy: 'crashed-worker-pid-9999',
          attempts: 1,
          maxRetries: 3,
        },
      });

      // Run recovery
      const recoveredCount = await researchJobWorker.recoverStaleJobs(100);
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const refreshed = await prisma.researchJob.findUnique({ where: { id: staleJob.id } });
      expect(refreshed?.status).toBe('QUEUED');
      expect(refreshed?.lockedAt).toBeNull();
      expect(refreshed?.error).toContain('Worker restarted');
    });
  });
});
