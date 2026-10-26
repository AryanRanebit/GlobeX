import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database';

const app = createApp();

describe('GlobeX — Market Intelligence End-to-End Workflow & Authorization', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    await connectDatabase();

    // Mock global fetch for upstream AI agent service
    global.fetch = vi.fn(async (url: any, options: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/agents/market-research')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            product: 'Organic Basmati Rice',
            category: 'Agricultural Produce',
            candidateHsCodes: [
              {
                hs_code: '1006.30.20',
                description: 'Semi-milled or wholly milled Basmati rice',
                classification_status: 'CANDIDATE',
              },
            ],
            analyzedAt: new Date().toISOString(),
            summary: 'High export demand in United States and United Arab Emirates.',
            dataSourceMode: 'ai_qualitative_estimate',
            disclaimer: 'Candidate HS codes are non-binding estimates.',
            recommendedCountries: [
              {
                country: 'United States',
                countryCode: 'US',
                demandScore: 92,
                growthRate: '15%',
                competition: 'Medium',
                marketSize: '$1.2B',
                trend: 'Growing',
                insights: 'Strong diaspora demand and organic health trends.',
              },
              {
                country: 'United Arab Emirates',
                countryCode: 'AE',
                demandScore: 88,
                growthRate: '12%',
                competition: 'Low',
                marketSize: '$450M',
                trend: 'Stable',
                insights: 'Gateway to GCC and Middle East markets.',
              },
            ],
          }),
        } as any;
      }
      return originalFetch(url, options);
    });

    // Clean up test users if existing
    await prisma.researchJob.deleteMany({
      where: { user: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } } },
    });
    await prisma.opportunity.deleteMany({
      where: { user: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } } },
    });
    await prisma.product.deleteMany({
      where: { user: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } },
    });

    // Create User A
    const resA = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Exporter A',
        email: 'usera_phase5@globex.in',
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
        email: 'userb_phase5@globex.in',
        password: 'Password123!',
        companyName: 'B Textiles Ltd',
        companyType: 'Exporter',
        industry: 'Textiles',
      });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;
  });

  afterAll(async () => {
    global.fetch = originalFetch;

    await prisma.researchJob.deleteMany({
      where: { user: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } } },
    });
    await prisma.opportunity.deleteMany({
      where: { user: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } } },
    });
    await prisma.product.deleteMany({
      where: { user: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['usera_phase5@globex.in', 'userb_phase5@globex.in'] } },
    });
    await disconnectDatabase();
  });

  describe('1. Authentication and Input Validation', () => {
    it('should reject unauthenticated market analysis requests (401)', async () => {
      const res = await request(app)
        .post('/api/v1/market/analyze')
        .send({ product: 'Basmati Rice' });
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated opportunities retrieval (401)', async () => {
      const res = await request(app).get('/api/v1/market/opportunities');
      expect(res.status).toBe(401);
    });

    it('should reject invalid/incomplete product input (400 or 422 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ product: '' }); // empty string fails validation
      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. End-to-End Analysis, Normalization & Persistence', () => {
    it('should submit product, normalize candidate HS codes, persist, and poll job completion', async () => {
      const analyzeRes = await request(app)
        .post('/api/v1/market/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          product: 'Organic Basmati Rice',
          targetRegions: ['United States', 'United Arab Emirates'],
        });

      expect(analyzeRes.status).toBe(200);
      expect(analyzeRes.body.success).toBe(true);
      const jobId = analyzeRes.body.data?.jobId || analyzeRes.body.jobId;
      expect(jobId).toBeDefined();

      // Poll job until completed (timeout at 35s)
      let completed = false;
      let finalResult: any = null;
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const statusRes = await request(app)
          .get(`/api/v1/market/analyze/status/${jobId}`)
          .set('Authorization', `Bearer ${userAToken}`);

        const jobData = statusRes.body.data || statusRes.body;
        if (jobData.status === 'succeeded' || jobData.status === 'completed') {
          completed = true;
          finalResult = jobData.result;
          break;
        } else if (jobData.status === 'failed') {
          throw new Error(`Analysis job failed: ${jobData.error}`);
        }
      }

      expect(completed).toBe(true);
      expect(finalResult).toBeDefined();
      expect(finalResult.product).toContain('Basmati Rice');
      expect(finalResult.candidateHsCode).toBeDefined();
      expect(Array.isArray(finalResult.recommendedCountries)).toBe(true);
      expect(finalResult.recommendedCountries.length).toBeGreaterThan(0);
      expect(finalResult.savedOpportunitiesCount).toBeGreaterThan(0);

      // Verify that candidate HS codes are labeled as candidates and non-binding
      if (finalResult.candidateHsCodes && finalResult.candidateHsCodes.length > 0) {
        expect(finalResult.candidateHsCodes[0].classification_status).toBe('CANDIDATE');
      }
    }, 45000);
  });

  describe('3. Database Persistence and User Authorization Boundaries', () => {
    it('should retrieve persisted opportunities for User A with relational product data', async () => {
      const res = await request(app)
        .get('/api/v1/market/opportunities')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const firstOpp = res.body.data[0];
      expect(firstOpp.userId).toBe(userAId);
      expect(firstOpp.product).toBeDefined();
      expect(firstOpp.product.productName).toContain('Basmati Rice');
      expect(firstOpp.country).toBeDefined();
      expect(firstOpp.demandScore).toBeGreaterThanOrEqual(0);
      expect(firstOpp.source).toBe('ai_analysis');
    });

    it('should strictly isolate data: User B must NOT see User A opportunities', async () => {
      const resB = await request(app)
        .get('/api/v1/market/opportunities')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.success).toBe(true);
      expect(Array.isArray(resB.body.data)).toBe(true);
      // User B has not run any analysis yet, so their saved opportunities must be empty
      expect(resB.body.data.length).toBe(0);

      // Verify at the database level that no User A records match User B id
      const leakedRecords = resB.body.data.filter((opp: any) => opp.userId === userAId);
      expect(leakedRecords.length).toBe(0);
    });
  });
});
