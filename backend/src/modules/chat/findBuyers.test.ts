import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = vi.fn();
vi.mock('../../config/database', () => ({
  prisma: { buyer: { findMany: (...args: unknown[]) => findMany(...args) } },
}));
const discoverMock = vi.fn();
vi.mock('../buyers/buyers.service', () => ({
  buyersService: { discover: (...args: unknown[]) => discoverMock(...args) },
}));

import { detectFindBuyers, parseBuyerQuery, tryFindBuyersAnswer, resetPendingDiscovery } from './findBuyers';

const PIPELINE = [
  { id: '1', companyName: 'Mountain Rose Herbs', country: 'United States', industry: 'Herbs & Botanicals', tags: ['herbs', 'organic'], leadScore: 45 },
  { id: '2', companyName: 'Sabinsa Corporation', country: 'USA', industry: 'Nutraceuticals', tags: ['supplements'], leadScore: 45 },
  { id: '3', companyName: 'Jawhar Al Rabea Trading Company', country: 'Saudi Arabia', industry: 'Food Marketing & Distribution', tags: ['food'], leadScore: 45 },
  { id: '4', companyName: 'Excellence Food Trading LLC', country: 'United Arab Emirates', industry: 'Food Trading', tags: ['food', 'spices'], leadScore: 45 },
  { id: '5', companyName: 'CottonCraft Mills', country: 'United States', industry: 'Cotton Textiles & Apparel', tags: ['cotton', 'fabric'], leadScore: 50 },
];

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue(PIPELINE);
  discoverMock.mockReset();
  resetPendingDiscovery();
});

describe('detectFindBuyers', () => {
  it('catches verb-first and noun-first buyer queries', () => {
    expect(detectFindBuyers('Find buyers for cotton in Germany')).toBe(true);
    expect(detectFindBuyers('Find buyers for cotton in USA')).toBe(true);
    expect(detectFindBuyers('buyers for cotton in Germany')).toBe(true);
    expect(detectFindBuyers('show me importers in France')).toBe(true);
    expect(detectFindBuyers('I need distributors for turmeric')).toBe(true);
  });
  it('ignores non-buyer queries', () => {
    expect(detectFindBuyers('What is the HS code for cotton?')).toBe(false);
    expect(detectFindBuyers('How much duty on apparel to the US?')).toBe(false);
    expect(detectFindBuyers("how do I verify this buyer's registration?")).toBe(false);
    expect(detectFindBuyers('Generate an invoice for my shipment')).toBe(false);
  });
});

describe('parseBuyerQuery', () => {
  it('extracts product and country', () => {
    expect(parseBuyerQuery('Find buyers for cotton in Germany')).toEqual({ product: 'cotton', country: 'Germany' });
    expect(parseBuyerQuery('Find buyers for cotton in USA')).toEqual({ product: 'cotton', country: 'United States' });
    expect(parseBuyerQuery('show me importers in France')).toEqual({ product: undefined, country: 'France' });
  });
  it('does not confuse the pronoun us with the US', () => {
    expect(parseBuyerQuery('help us find buyers for cotton').country).toBeUndefined();
  });
});

describe('tryFindBuyersAnswer', () => {
  it('returns null for non-buyer queries', async () => {
    expect(await tryFindBuyersAnswer('What is the HS code for cotton?', 's1', 'u1')).toBeNull();
  });

  it('(a) country with buyers but no product match: lists country buyers, says none are product-specific', async () => {
    // CottonCraft Mills removed: no cotton-tagged US buyer remains
    findMany.mockResolvedValue(PIPELINE.filter((b) => b.id !== '5'));
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in USA', 's1', 'u1');
    expect(ans).not.toBeNull();
    expect(ans!.intent).toBe('find_buyers');
    expect(ans!.response).toContain('United States');
    expect(ans!.response).toContain('Mountain Rose Herbs');
    expect(ans!.response).toContain('Sabinsa Corporation'); // "USA" row normalized to United States
    expect(ans!.response).toMatch(/None of them are tagged for \*\*cotton\*\*/);
    expect(ans!.response).not.toContain('Jawhar Al Rabea'); // other country not listed
    expect(ans!.response).toContain('tab=buyers');
    expect(ans!.response).not.toMatch(/wasn't able to generate/);
  });

  it('(b) country with no pipeline buyers: honest empty + live discovery offer + deep link', async () => {
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's1', 'u1');
    expect(ans).not.toBeNull();
    expect(ans!.response).toContain('no buyers in **Germany**');
    expect(ans!.response).toContain('cotton');
    expect(ans!.response).toContain('HS 52');
    expect(ans!.response).toContain('live Buyer Discovery');
    expect(ans!.response).toContain('tab=buyers');
    expect(ans!.response).toContain('Saudi Arabia'); // states current coverage honestly
    expect(ans!.tool_results).toMatchObject({ matched: 0, parsed: { product: 'cotton', country: 'Germany' } });
  });

  it('lists product-matched buyers when they exist', async () => {
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in USA', 's1', 'u1');
    expect(ans).not.toBeNull();
    expect(ans!.response).toContain('CottonCraft Mills');
    expect(ans!.response).toMatch(/matching \*\*cotton\*\* \(HS 52\)/);
    expect(ans!.response).not.toContain('Mountain Rose Herbs'); // non-cotton US buyer excluded
  });

  it('uses the caller session id', async () => {
    const ans = await tryFindBuyersAnswer('Find buyers in Saudi Arabia', 'session-xyz', 'u1');
    expect(ans!.session_id).toBe('session-xyz');
    expect(ans!.response).toContain('Jawhar Al Rabea');
  });

  it('handles an empty pipeline without fabricating buyers', async () => {
    findMany.mockResolvedValue([]);
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's1', 'u1');
    expect(ans!.response).toContain('pipeline is empty');
    expect(ans!.response).not.toContain('CottonCraft');
  });
});

describe('live discovery opt-in flow', () => {
  const DISCOVERED = {
    product: 'cotton', targetCountries: ['Germany'], searchedAt: '2026-10-30', provider: 'gemini_grounded',
    dataSourceMode: 'live_provider', totalCandidatesDiscovered: 2, totalUniqueBuyers: 2, queriesUsed: ['q1'],
    buyers: [
      { id: 'n1', companyName: 'Hanse Textil GmbH', country: 'Germany', countryCode: 'DE', industry: 'Cotton Textiles', leadScore: 62, isVerified: true, sourceProvider: 'gemini', sourceUrl: 'https://example.com', verificationStatus: 'web_evidence', verificationEvidence: {}, scoreBreakdown: {} },
      { id: 'n2', companyName: 'Berlin Fabrics AG', country: 'Germany', countryCode: 'DE', industry: 'Apparel Sourcing', leadScore: 55, isVerified: true, sourceProvider: 'gemini', sourceUrl: 'https://example.com', verificationStatus: 'web_evidence', verificationEvidence: {}, scoreBreakdown: {} },
    ],
  };

  it('a plain question only OFFERS discovery - zero discovery calls', async () => {
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's1', 'u1');
    expect(ans!.response).toContain('live Buyer Discovery');
    expect(discoverMock).not.toHaveBeenCalled();
  });

  it('yes/haan/ok after the offer runs exactly one discovery with the pending product+country', async () => {
    discoverMock.mockResolvedValue(DISCOVERED);
    await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's1', 'u1');
    for (const yes of ['yes']) {
      discoverMock.mockClear();
      const ans = await tryFindBuyersAnswer(yes, 's1', 'u1');
      expect(discoverMock).toHaveBeenCalledTimes(1);
      expect(discoverMock).toHaveBeenCalledWith('u1', 'cotton', ['Germany'], { hsCode: '52' });
      expect(ans!.response).toContain('Hanse Textil GmbH');
      expect(ans!.response).toContain('lead score 62');
      expect(ans!.response).toContain('one grounded AI search');
    }
  });

  it('Hinglish confirmations also trigger (haan, karo)', async () => {
    discoverMock.mockResolvedValue(DISCOVERED);
    for (const yes of ['haan', 'karo']) {
      resetPendingDiscovery(); discoverMock.mockClear();
      await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's2', 'u1');
      const ans = await tryFindBuyersAnswer(yes, 's2', 'u1');
      expect(discoverMock).toHaveBeenCalledTimes(1);
      expect(ans!.response).toContain('Berlin Fabrics AG');
    }
  });

  it('a bare yes with NO pending offer never spends', async () => {
    const ans = await tryFindBuyersAnswer('yes', 'fresh-session', 'u1');
    expect(discoverMock).not.toHaveBeenCalled();
    expect(ans).toBeNull(); // falls through to the agent
  });

  it('no/nahi after the offer exits cleanly with zero spend', async () => {
    await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's3', 'u1');
    const ans = await tryFindBuyersAnswer('nahi', 's3', 'u1');
    expect(discoverMock).not.toHaveBeenCalled();
    expect(ans!.response).toContain('no AI search was run');
    // and the pending offer is gone
    const after = await tryFindBuyersAnswer('yes', 's3', 'u1');
    expect(after).toBeNull();
    expect(discoverMock).not.toHaveBeenCalled();
  });

  it('a different question after the offer does not trigger discovery (mismatch)', async () => {
    await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's4', 'u1');
    const ans = await tryFindBuyersAnswer('What is the HS code for rice?', 's4', 'u1');
    expect(ans).toBeNull();
    expect(discoverMock).not.toHaveBeenCalled();
  });

  it('pending offer expires after the TTL', async () => {
    discoverMock.mockResolvedValue(DISCOVERED);
    vi.useFakeTimers();
    try {
      await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's5', 'u1');
      vi.advanceTimersByTime(11 * 60 * 1000); // past the 10-minute TTL
      const ans = await tryFindBuyersAnswer('yes', 's5', 'u1');
      expect(ans).toBeNull();
      expect(discoverMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('direct explicit command runs discovery immediately, no confirmation', async () => {
    discoverMock.mockResolvedValue(DISCOVERED);
    const ans = await tryFindBuyersAnswer('find new buyers for cotton in germany live', 's6', 'u1');
    expect(discoverMock).toHaveBeenCalledTimes(1);
    expect(discoverMock).toHaveBeenCalledWith('u1', 'cotton', ['Germany'], { hsCode: '52' });
    expect(ans!.response).toContain('Hanse Textil GmbH');
  });

  it('"run discovery" phrasing is also explicit', async () => {
    discoverMock.mockResolvedValue(DISCOVERED);
    const ans = await tryFindBuyersAnswer('run discovery for cotton in germany', 's7', 'u1');
    expect(discoverMock).toHaveBeenCalledTimes(1);
    expect(ans!.intent).toBe('find_buyers');
  });

  it('discovery finding nothing is answered honestly, nothing fabricated', async () => {
    discoverMock.mockResolvedValue({ ...DISCOVERED, buyers: [], totalUniqueBuyers: 0 });
    const ans = await tryFindBuyersAnswer('find new buyers for cotton in germany live', 's8', 'u1');
    expect(ans!.response).toContain('found no verifiable buyers');
    expect(ans!.response).toContain('nothing was added');
    expect(ans!.response).not.toContain('GmbH');
  });

  it('provider failure surfaces honestly, no retry', async () => {
    discoverMock.mockRejectedValue(new Error('Gemini unavailable'));
    const ans = await tryFindBuyersAnswer('find new buyers for cotton in germany live', 's9', 'u1');
    expect(discoverMock).toHaveBeenCalledTimes(1);
    expect(ans!.response).toContain('failed just now');
    expect(ans!.response).toContain('no retry was run');
  });
});
