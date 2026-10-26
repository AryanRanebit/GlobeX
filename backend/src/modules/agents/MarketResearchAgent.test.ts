import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { marketResearchAgent } from './MarketResearchAgent';

// Mock global fetch safely and restore afterwards
const originalFetch = global.fetch;
const fetchMock = vi.fn();

describe('MarketResearchAgent Failure Scenarios', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should throw an error on network timeout', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(marketResearchAgent.analyze({ product: 'Test Product' }))
      .rejects.toThrow('MarketResearchAgent failed: fetch failed');
  });

  it('should throw an error on non-200 HTTP response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    await expect(marketResearchAgent.analyze({ product: 'Test Product' }))
      .rejects.toThrow('Agent service responded with status 500');
  });

  it('should throw an error on malformed JSON response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });

    await expect(marketResearchAgent.analyze({ product: 'Test Product' }))
      .rejects.toThrow('MarketResearchAgent failed to parse response');
  });

  it('should successfully parse valid AI response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        product: 'Test Product',
        analyzedAt: '2026-10-10',
        summary: 'Test summary',
        recommendedCountries: [{
          country: 'USA',
          countryCode: 'US',
          demandScore: 90,
          growthRate: '10%',
          competition: 'High',
          marketSize: '1B',
          trend: 'Growing',
          insights: 'Good market'
        }]
      }),
    });

    const result = await marketResearchAgent.analyze({ product: 'Test Product' });
    expect(result.summary).toBe('Test summary');
    expect(result.recommendedCountries[0].countryCode).toBe('US');
  });
});
