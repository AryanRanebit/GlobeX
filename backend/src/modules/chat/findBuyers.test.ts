import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = vi.fn();
vi.mock('../../config/database', () => ({
  prisma: { buyer: { findMany: (...args: unknown[]) => findMany(...args) } },
}));

import { detectFindBuyers, parseBuyerQuery, tryFindBuyersAnswer } from './findBuyers';

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
    expect(await tryFindBuyersAnswer('What is the HS code for cotton?', 's1')).toBeNull();
  });

  it('(a) country with buyers but no product match: lists country buyers, says none are product-specific', async () => {
    // CottonCraft Mills removed: no cotton-tagged US buyer remains
    findMany.mockResolvedValue(PIPELINE.filter((b) => b.id !== '5'));
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in USA', 's1');
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
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's1');
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
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in USA', 's1');
    expect(ans).not.toBeNull();
    expect(ans!.response).toContain('CottonCraft Mills');
    expect(ans!.response).toMatch(/matching \*\*cotton\*\* \(HS 52\)/);
    expect(ans!.response).not.toContain('Mountain Rose Herbs'); // non-cotton US buyer excluded
  });

  it('uses the caller session id', async () => {
    const ans = await tryFindBuyersAnswer('Find buyers in Saudi Arabia', 'session-xyz');
    expect(ans!.session_id).toBe('session-xyz');
    expect(ans!.response).toContain('Jawhar Al Rabea');
  });

  it('handles an empty pipeline without fabricating buyers', async () => {
    findMany.mockResolvedValue([]);
    const ans = await tryFindBuyersAnswer('Find buyers for cotton in Germany', 's1');
    expect(ans!.response).toContain('pipeline is empty');
    expect(ans!.response).not.toContain('CottonCraft');
  });
});
