// ─────────────────────────────────────────────────────────────────────────────
// GlobeX AI — Phase 7: Evidence-Based Buyer Discovery Test Suite
//
// All tests use mocked provider adapters — no live external API access is made.
// Tests that reference the mock_provider are explicitly labelled as such.
// Tests that use GeminiAgentBuyerProvider mock the global fetch, never the real API.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database';

import {
  MockBuyerDataProvider,
  GeminiAgentBuyerProvider,
  ProviderError,
  normalizeCompanyName,
  extractDomain,
  deduplicationKey,
  deduplicateCandidates,
  generateBuyerSearchQuery,
} from '../src/modules/buyers/buyerDiscovery.providers';

import { verifyCandidateEvidence } from '../src/modules/buyers/buyerDiscovery.verification';
import { scoreCandidate } from '../src/modules/buyers/buyerDiscovery.scorer';
import { runBuyerDiscovery } from '../src/modules/buyers/buyerDiscovery.engine';
import type { DiscoveredCandidate, VerificationEvidence } from '../src/modules/buyers/buyerDiscovery.types';

// ─── App & Auth ───────────────────────────────────────────────────────────────

const app = createApp();
const TEST_EMAIL = 'phase7_buyer_test@globex.in';
const TEST_EMAIL_B = 'phase7_buyer_test_b@globex.in';
let accessToken = '';
let userBToken = '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<DiscoveredCandidate> = {}): DiscoveredCandidate {
  return {
    companyName: 'Acme Importers Ltd',
    normalizedName: 'acme importers',
    country: 'Germany',
    countryCode: 'DE',
    industry: 'Food Import & Distribution',
    domain: 'acme-importers.de',
    website: 'https://acme-importers.de',
    email: 'contact@acme-importers.de',
    phone: undefined,
    address: undefined,
    annualRevenue: undefined,
    employeeCount: undefined,
    importVolume: undefined,
    sourceProvider: 'mock_provider',
    sourceUrl: 'mock://provider/search?q=rice',
    providerReference: 'mock-001',
    retrievedAt: new Date().toISOString(),
    hasCustomsImportEvidence: false,
    corporateRegistryActive: false,
    rawAttributes: { _isMockData: true },
    ...overrides,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectDatabase();

  // Clean up test users
  for (const email of [TEST_EMAIL, TEST_EMAIL_B]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) {
      await prisma.buyer.deleteMany({ where: {} }); // allow cascade-free cleanup
      await prisma.user.delete({ where: { email } });
    }
  }

  // Register User A
  const resA = await request(app)
    .post('/api/v1/auth/signup')
    .send({
      name: 'Phase7 Tester',
      email: TEST_EMAIL,
      password: 'Password123!',
      companyName: 'Test Exports Ltd',
      companyType: 'Manufacturer',
      industry: 'Agriculture',
    });
  accessToken = resA.body.data.tokens.accessToken;

  // Register User B (unauthorized access check)
  const resB = await request(app)
    .post('/api/v1/auth/signup')
    .send({
      name: 'Phase7 Tester B',
      email: TEST_EMAIL_B,
      password: 'Password123!',
      companyName: 'B Exports Ltd',
      companyType: 'Trader',
      industry: 'Agriculture',
    });
  userBToken = resB.body.data.tokens.accessToken;
});

afterAll(async () => {
  await prisma.buyer.deleteMany({ where: {} });
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL_B] } } });
  await disconnectDatabase();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Unit Tests — Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Utility: normalizeCompanyName', () => {
  it('strips common suffixes (Ltd, LLC, Inc, Corp)', () => {
    expect(normalizeCompanyName('Acme Corp')).toBe('acme');
    expect(normalizeCompanyName('Sunrise Imports Ltd.')).toBe('sunrise imports');
    expect(normalizeCompanyName('Global Foods LLC')).toBe('global foods');
    expect(normalizeCompanyName('BioTrade GmbH')).toBe('biotrade');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeCompanyName('  My   Company  ')).toBe('my company');
  });
});

describe('Phase 7 — Utility: extractDomain', () => {
  it('extracts domain from full URL', () => {
    expect(extractDomain('https://www.acme.de/about')).toBe('acme.de');
    expect(extractDomain('http://shop.example.com')).toBe('shop.example.com');
  });

  it('handles bare domain without protocol', () => {
    expect(extractDomain('acme.de')).toBe('acme.de');
  });

  it('returns undefined for undefined input', () => {
    expect(extractDomain(undefined)).toBeUndefined();
  });

  it('returns undefined for invalid URLs', () => {
    expect(extractDomain('not a url!!')).toBeUndefined();
  });
});

describe('Phase 7 — Utility: generateBuyerSearchQuery', () => {
  it('generates query with product and market', () => {
    const q = generateBuyerSearchQuery('Basmati Rice', 'United Kingdom');
    expect(q).toContain('Basmati Rice');
    expect(q).toContain('United Kingdom');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unit Tests — Deduplication
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Deduplication', () => {
  it('deduplicates candidates with identical name+countryCode+domain', () => {
    const c1 = makeCandidate({ providerReference: 'ref-a' });
    const c2 = makeCandidate({ providerReference: 'ref-b' }); // identical dedup key
    const result = deduplicateCandidates([c1, c2]);
    expect(result).toHaveLength(1);
    expect(result[0].providerReference).toBe('ref-a'); // first seen wins
  });

  it('keeps candidates with different countryCode', () => {
    const c1 = makeCandidate({ countryCode: 'DE' });
    const c2 = makeCandidate({ countryCode: 'US' });
    const result = deduplicateCandidates([c1, c2]);
    expect(result).toHaveLength(2);
  });

  it('keeps candidates with same name+country but different domain', () => {
    const c1 = makeCandidate({ domain: 'acme.de' });
    const c2 = makeCandidate({ domain: 'acme-global.de' });
    const result = deduplicateCandidates([c1, c2]);
    expect(result).toHaveLength(2);
  });

  it('deduplication key includes all three discriminators', () => {
    const c = makeCandidate();
    const key = deduplicationKey(c);
    expect(key).toContain('DE');
    expect(key).toContain('acme-importers.de');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Unit Tests — Verification
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Verification: explicit status logic', () => {
  it('returns "unverified" for a candidate with only a company name (no evidence)', () => {
    const c = makeCandidate({ domain: undefined, website: undefined, email: undefined });
    const ev = verifyCandidateEvidence(c);
    expect(ev.status).toBe('unverified');
    expect(ev.importerActivityConfirmed).toBe(false);
  });

  it('returns "partially_verified" when domain is present but no customs or registry', () => {
    const c = makeCandidate({ domain: 'acme.de' });
    const ev = verifyCandidateEvidence(c);
    expect(ev.status).toBe('partially_verified');
    expect(ev.importerActivityConfirmed).toBe(false);
    expect(ev.criteriaChecked.some(x => x.criterion === 'website_domain_present' && x.passed)).toBe(true);
  });

  it('returns "verified_against_defined_criteria" when both company and customs evidence present', () => {
    const c = makeCandidate({
      companyName: 'Real Importer GmbH',
      hasCustomsImportEvidence: true,
      corporateRegistryActive: true,
    });
    const ev = verifyCandidateEvidence(c);
    expect(ev.status).toBe('verified_against_defined_criteria');
    expect(ev.importerActivityConfirmed).toBe(true);
    expect(ev.corporateIdentityConfirmed).toBe(true);
  });

  it('lists missing signals but does not confuse them with negative evidence', () => {
    const c = makeCandidate({ email: undefined, domain: undefined });
    const ev = verifyCandidateEvidence(c);
    expect(ev.missingSignals).toContain('website_domain');
    expect(ev.missingSignals).toContain('contact_information');
    expect(ev.notes).toContain('Missing signals');
    expect(ev.notes).not.toContain('negative');
  });

  it('never confirms importer activity from website alone', () => {
    const c = makeCandidate({
      website: 'https://verified-looking-importer.com',
      domain: 'verified-looking-importer.com',
      hasCustomsImportEvidence: false,
    });
    const ev = verifyCandidateEvidence(c);
    expect(ev.importerActivityConfirmed).toBe(false);
  });

  it('domain ownership requires both domain AND corporate registry confirmation', () => {
    const domainOnly = makeCandidate({ domain: 'example.com', corporateRegistryActive: false });
    expect(verifyCandidateEvidence(domainOnly).domainOwnershipConfirmed).toBe(false);

    const both = makeCandidate({ domain: 'example.com', corporateRegistryActive: true });
    expect(verifyCandidateEvidence(both).domainOwnershipConfirmed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Unit Tests — Lead Scorer
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Lead Scoring: deterministic evidence-based rules', () => {
  it('scores a bare candidate with only company name at baseline', () => {
    const c = makeCandidate({ domain: undefined, email: undefined, website: undefined });
    const ev = verifyCandidateEvidence(c);
    const score = scoreCandidate(c, ev);
    expect(score.score).toBe(15); // 20 (identity) - 5 (mock)
    expect(score.factors.some(f => f.factor === 'company_identity_confirmed' && f.impact === 'positive')).toBe(true);
  });

  it('awards points for email and domain when present', () => {
    const c = makeCandidate({ domain: 'acme.de', email: 'info@acme.de' });
    const ev = verifyCandidateEvidence(c);
    const score = scoreCandidate(c, ev);
    // 20 (identity) + 10 (domain) + 15 (email) - 5 (mock) = 40
    expect(score.score).toBe(40);
  });

  it('awards maximum score for full evidence with no mock penalty', () => {
    const c = makeCandidate({
      sourceProvider: 'gemini_agent',
      domain: 'real-importer.de',
      email: 'import@real-importer.de',
      hasCustomsImportEvidence: true,
      corporateRegistryActive: true,
    });
    const ev = verifyCandidateEvidence(c);
    const score = scoreCandidate(c, ev);
    // 20 + 10 + 15 + 25 + 30 = 100
    expect(score.score).toBe(100);
    expect(score.confidence).toBe(1);
  });

  it('missing data is neutral — does not subtract points', () => {
    const withDomain = makeCandidate({ domain: 'acme.de', email: undefined });
    const withoutDomain = makeCandidate({ domain: undefined, email: undefined });
    const evWith = verifyCandidateEvidence(withDomain);
    const evWithout = verifyCandidateEvidence(withoutDomain);
    const sWith = scoreCandidate(withDomain, evWith).score;
    const sWithout = scoreCandidate(withoutDomain, evWithout).score;
    // Domain present adds points; missing does not subtract
    expect(sWith).toBeGreaterThan(sWithout);
    expect(sWithout).toBeGreaterThanOrEqual(0);
  });

  it('score is always clamped to [0, 100]', () => {
    const c = makeCandidate({ sourceProvider: 'mock_provider' });
    const ev = verifyCandidateEvidence(c);
    const { score } = scoreCandidate(c, ev);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns transparent explanation text', () => {
    const c = makeCandidate();
    const ev = verifyCandidateEvidence(c);
    const { explanation } = scoreCandidate(c, ev);
    expect(typeof explanation).toBe('string');
    expect(explanation.length).toBeGreaterThan(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Unit Tests — Mock Provider
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — MockBuyerDataProvider', () => {
  const provider = new MockBuyerDataProvider();

  it('returns candidates marked with mock provider name', async () => {
    const result = await provider.searchCandidates({
      product: 'Basmati Rice',
      targetMarket: 'Germany',
    });
    expect(result.provider).toBe('mock_provider');
    expect(result.dataSourceMode).toBe('mock_provider');
    expect(result.candidates.length).toBeGreaterThan(0);
    result.candidates.forEach(c => {
      expect(c.sourceProvider).toBe('mock_provider');
      expect(c.rawAttributes?._isMockData).toBe(true);
    });
  });

  it('includes query used in the result', async () => {
    const result = await provider.searchCandidates({
      product: 'Organic Turmeric',
      targetMarket: 'United Kingdom',
    });
    expect(result.queryUsed).toContain('Organic Turmeric');
    expect(result.queryUsed).toContain('United Kingdom');
  });

  it('does not fabricate email addresses', async () => {
    const result = await provider.searchCandidates({
      product: 'Spices',
      targetMarket: 'France',
    });
    result.candidates.forEach(c => {
      expect(c.email).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Unit Tests — GeminiAgentBuyerProvider (mocked fetch, never live API)
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — GeminiAgentBuyerProvider (fetch mocked — no live API access)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('parses well-formed response and normalizes all fields', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        searchedAt: new Date().toISOString(),
        buyers: [
          {
            companyName: 'Eurofoods GmbH',
            country: 'Germany',
            countryCode: 'DE',
            industry: 'Food Distribution',
            website: 'https://eurofoods.de',
            email: 'import@eurofoods.de',
            estimatedLeadScore: 75,
            source: 'ai_web_search',
          },
        ],
      }),
    });

    const provider = new GeminiAgentBuyerProvider('http://localhost:8000/api/v1');
    const result = await provider.searchCandidates({ product: 'Basmati Rice', targetMarket: 'Germany' });

    expect(result.candidates).toHaveLength(1);
    const c = result.candidates[0];
    expect(c.companyName).toBe('Eurofoods GmbH');
    expect(c.countryCode).toBe('DE');
    expect(c.domain).toBe('eurofoods.de');
    expect(c.email).toBe('import@eurofoods.de');
    expect(c.sourceProvider).toBe('gemini_agent');
    expect(c.sourceUrl).toBe('http://localhost:8000/api/v1/agents/buyer-discovery');
  });

  it('strips email fields that are not real addresses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        buyers: [{ companyName: 'Test Co', country: 'US', countryCode: 'US', industry: 'Trade', email: 'not-an-email' }],
      }),
    });

    const provider = new GeminiAgentBuyerProvider('http://localhost:8000/api/v1');
    const result = await provider.searchCandidates({ product: 'Spices', targetMarket: 'US' });
    expect(result.candidates[0].email).toBeUndefined();
  });

  it('throws retryable ProviderError on HTTP 429', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 429 });

    const provider = new GeminiAgentBuyerProvider('http://localhost:8000/api/v1');
    await expect(provider.searchCandidates({ product: 'X', targetMarket: 'Y' }))
      .rejects.toMatchObject({ name: 'ProviderError', retryable: true });
  });

  it('throws retryable ProviderError on network error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new TypeError('fetch failed'));

    const provider = new GeminiAgentBuyerProvider('http://localhost:8000/api/v1');
    await expect(provider.searchCandidates({ product: 'X', targetMarket: 'Y' }))
      .rejects.toMatchObject({ name: 'ProviderError', retryable: true });
  });

  it('throws non-retryable ProviderError on HTTP 500', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });

    const provider = new GeminiAgentBuyerProvider('http://localhost:8000/api/v1');
    await expect(provider.searchCandidates({ product: 'X', targetMarket: 'Y' }))
      .rejects.toMatchObject({ name: 'ProviderError', retryable: false });
  });

  it('throws ProviderError on malformed JSON response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('bad JSON'); },
    });

    const provider = new GeminiAgentBuyerProvider('http://localhost:8000/api/v1');
    await expect(provider.searchCandidates({ product: 'X', targetMarket: 'Y' }))
      .rejects.toMatchObject({ name: 'ProviderError' });
  });

  it('handles empty buyers array gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ buyers: [] }),
    });

    const provider = new GeminiAgentBuyerProvider('http://localhost:8000/api/v1');
    const result = await provider.searchCandidates({ product: 'X', targetMarket: 'Y' });
    expect(result.candidates).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Integration Tests — runBuyerDiscovery (mock provider, live DB)
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — runBuyerDiscovery (mock provider, live PostgreSQL)', () => {
  beforeEach(async () => {
    await prisma.buyer.deleteMany({ where: { sourceProvider: 'mock_provider' } });
  });

  it('persists discovered buyers with provenance fields to the database', async () => {
    const result = await runBuyerDiscovery(
      { product: 'Organic Rice', targetCountries: ['Germany'] },
      new MockBuyerDataProvider(),
    );

    expect(result.totalUniqueBuyers).toBeGreaterThan(0);
    expect(result.buyers[0].sourceProvider).toBe('mock_provider');
    expect(result.buyers[0].verificationStatus).toBeDefined();
    expect(result.buyers[0].verificationEvidence).toBeDefined();
    expect(result.buyers[0].scoreBreakdown).toBeDefined();

    // Verify DB persistence
    const dbRecord = await prisma.buyer.findFirst({
      where: { sourceProvider: 'mock_provider' },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.sourceProvider).toBe('mock_provider');
    expect(dbRecord!.sourceUrl).toMatch(/^mock:\/\//);
    expect(dbRecord!.verificationStatus).toMatch(
      /^(unverified|partially_verified|verified_against_defined_criteria|verification_failed)$/,
    );
    expect(dbRecord!.verificationEvidence).toBeTruthy();
  });

  it('deduplicates across multiple target countries before persisting', async () => {
    const result = await runBuyerDiscovery(
      { product: 'Basmati Rice', targetCountries: ['Germany', 'Germany'] },
      new MockBuyerDataProvider(),
    );
    // Two markets, both mock — should not double-persist same candidates
    const dbCount = await prisma.buyer.count({ where: { sourceProvider: 'mock_provider' } });
    expect(dbCount).toBe(result.totalUniqueBuyers);
  });

  it('mock-provider candidates are marked unverified (not as importers)', async () => {
    const result = await runBuyerDiscovery(
      { product: 'Spices', targetCountries: ['France'] },
      new MockBuyerDataProvider(),
    );
    result.buyers.forEach(b => {
      expect(b.isVerified).toBe(false);
      expect(b.verificationStatus).toBe('unverified');
      expect(b.verificationEvidence.importerActivityConfirmed).toBe(false);
    });
  });

  it('propagates ProviderError to caller', async () => {
    class AlwaysFailingProvider {
      readonly name = 'always_failing';
      async searchCandidates(): Promise<never> {
        throw new ProviderError('Simulated failure', false);
      }
    }
    await expect(
      runBuyerDiscovery(
        { product: 'X', targetCountries: ['Y'] },
        new AlwaysFailingProvider() as any,
      ),
    ).rejects.toMatchObject({ name: 'ProviderError' });
  });

  it('handles empty results from provider gracefully', async () => {
    class EmptyProvider {
      readonly name = 'empty_provider';
      async searchCandidates() {
        return { candidates: [], provider: 'empty_provider', dataSourceMode: 'mock_provider' as const, queryUsed: 'test', totalFound: 0 };
      }
    }
    const result = await runBuyerDiscovery(
      { product: 'X', targetCountries: ['Y'] },
      new EmptyProvider() as any,
    );
    expect(result.buyers).toHaveLength(0);
    expect(result.totalUniqueBuyers).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. API Integration Tests — POST /api/v1/buyers/discover
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — POST /api/v1/buyers/discover (API endpoint)', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/buyers/discover')
      .send({ product: 'Rice', targetCountries: ['Germany'] });
    expect(res.status).toBe(401);
  });

  it('validates request body — missing product', async () => {
    const res = await request(app)
      .post('/api/v1/buyers/discover')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ targetCountries: ['Germany'] });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('product');
  });

  it('validates request body — missing targetCountries', async () => {
    const res = await request(app)
      .post('/api/v1/buyers/discover')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ product: 'Rice' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('targetCountries');
  });

  it('validates request body — empty targetCountries array', async () => {
    const res = await request(app)
      .post('/api/v1/buyers/discover')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ product: 'Rice', targetCountries: [] });
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated GET /api/v1/buyers/:id', async () => {
    const res = await request(app).get('/api/v1/buyers/nonexistent-id');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent buyer id', async () => {
    const res = await request(app)
      .get('/api/v1/buyers/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Honesty Guard Tests — fabrication prevention
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Honesty Guards', () => {
  it('verification evidence explicitly states importer activity is NOT confirmed for mock data', async () => {
    const result = await runBuyerDiscovery(
      { product: 'Tea', targetCountries: ['UK'] },
      new MockBuyerDataProvider(),
    );
    result.buyers.forEach(b => {
      expect(b.verificationEvidence.notes).toContain('Importer activity has NOT been established');
    });
  });

  it('email field is not fabricated — mock provider returns no emails', async () => {
    const result = await runBuyerDiscovery(
      { product: 'Coffee', targetCountries: ['France'] },
      new MockBuyerDataProvider(),
    );
    result.buyers.forEach(b => {
      expect(b.email).toBeNull();
    });
  });

  it('providerReference is preserved from provider to database record', async () => {
    await prisma.buyer.deleteMany({ where: { sourceProvider: 'mock_provider' } });
    const result = await runBuyerDiscovery(
      { product: 'Cardamom', targetCountries: ['Netherlands'] },
      new MockBuyerDataProvider(),
    );
    const first = result.buyers[0];
    expect(first.providerReference).toBeDefined();

    const dbRecord = await prisma.buyer.findFirst({ where: { id: first.id } });
    expect(dbRecord?.providerReference).toBe(first.providerReference);
  });

  it('mock provider candidates have isMockData flag in rawAttributes', async () => {
    const provider = new MockBuyerDataProvider();
    const provResult = await provider.searchCandidates({ product: 'Cumin', targetMarket: 'Italy' });
    provResult.candidates.forEach(c => {
      expect(c.rawAttributes?._isMockData).toBe(true);
    });
  });
});
