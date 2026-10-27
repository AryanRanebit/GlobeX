import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { comtradeClient } from '../src/modules/trade/comtrade.client';

const app = createApp();

describe('UN Comtrade Data Layer & Markets Endpoint', () => {
  it('GET /api/v1/trade/markets?hs=62&year=2025 returns real HS62 apparel export data with UNSD attribution', async () => {
    const res = await request(app)
      .get('/api/v1/trade/markets?hs=62&year=2025')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Meta attribution check
    const meta = res.body.meta;
    expect(meta.source).toBe('UN Comtrade');
    expect(meta.period).toBe('2025');
    expect(meta.cmdCode).toBe('62');
    expect(meta.reporter).toBe('India');
    expect(meta.citation).toContain('UN Comtrade');
    expect(meta.worldTotalUsd).toBeGreaterThan(8_000_000_000); // ~$8.39B
    expect(meta.origin).toBe('seed');

    // Partner checks — Top 3 Indian HS62 export destinations
    const topPartner = res.body.data[0];
    expect(topPartner.rank).toBe(1);
    expect(topPartner.partnerName).toBe('USA');
    // USA import of Indian HS62 is ~$2.67B
    expect(topPartner.tradeValueUsd).toBeGreaterThan(2_500_000_000);
    expect(topPartner.tradeValueUsd).toBeLessThan(2_800_000_000);

    const secondPartner = res.body.data[1];
    expect(secondPartner.rank).toBe(2);
    expect(secondPartner.partnerName).toBe('United Kingdom');
    // UK is ~$794M
    expect(secondPartner.tradeValueUsd).toBeGreaterThan(700_000_000);
    expect(secondPartner.tradeValueUsd).toBeLessThan(850_000_000);

    const thirdPartner = res.body.data[2];
    expect(thirdPartner.rank).toBe(3);
    expect(thirdPartner.partnerName).toBe('United Arab Emirates');
    // UAE is ~$629M
    expect(thirdPartner.tradeValueUsd).toBeGreaterThan(600_000_000);
    expect(thirdPartner.tradeValueUsd).toBeLessThan(660_000_000);
  });

  it('GET /api/trade/markets?hs=TOTAL&year=2025 works on unversioned route with all-goods data', async () => {
    const res = await request(app)
      .get('/api/trade/markets?hs=TOTAL&year=2025')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.meta.source).toBe('UN Comtrade');
    expect(res.body.meta.cmdCode).toBe('TOTAL');
    // World total all goods is ~$445.77B
    expect(res.body.meta.worldTotalUsd).toBeGreaterThan(440_000_000_000);

    // USA is top destination for all goods (~$92.6B)
    const top = res.body.data[0];
    expect(top.partnerName).toBe('USA');
    expect(top.tradeValueUsd).toBeGreaterThan(90_000_000_000);
  });

  it('Verifies Comtrade cache behavior: cache HIT returns stored data without network fetch', async () => {
    // Check daily usage counter
    const usageBefore = comtradeClient.getDailyUsage();

    // Query for cmdCode '62' (which was pre-cached during seeding)
    const records = await comtradeClient.query({ cmdCode: '62', period: '2025' });
    expect(records.length).toBeGreaterThan(150);

    // Because it is cached in ComtradeCache table, no API call was made
    const usageAfter = comtradeClient.getDailyUsage();
    expect(usageAfter.used).toBe(usageBefore.used);
  });

  it('Strictly enforces Data-Semantics Contract: destination market size and share cannot be faked', async () => {
    const res = await request(app)
      .get('/api/v1/trade/markets?hs=62&year=2025&limit=3')
      .expect(200);

    const topPartner = res.body.data[0];
    // USA India-reported export value ~$2.67B
    expect(topPartner.indiaExportValueUsd).toBeGreaterThan(2_500_000_000);
    expect(topPartner.indiaExportLabel).toBe('India-Reported Exports (FOB)');

    // In the free India-reported seed, destination-reported imports from World are unseeded
    // Therefore destinationMarketSizeUsd must be null, never substituting India's export figure
    expect(topPartner.destinationMarketSizeUsd).toBeNull();
    expect(topPartner.destinationMarketSizeStatus).toBe('Not available from free data');
    expect(topPartner.indiaShareOfDestinationImportPct).toBeNull();
    expect(topPartner.indiaShareStatus).toBe('Not available from free data');

    // Semantics metadata is present
    expect(res.body.meta.dataSemantics).toBeDefined();
    expect(res.body.meta.dataSemantics.indiaReportedExports).toContain('FOB');
    expect(res.body.meta.dataSemantics.destinationMarketSize).toContain('Not available from free data');
  });
});

