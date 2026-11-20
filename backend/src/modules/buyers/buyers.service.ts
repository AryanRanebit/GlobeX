import { buyersRepository } from './buyers.repository';

import { AppError } from '../../middleware/error.middleware';
import type { BuyerSearchDto } from './buyers.schema';
import { runBuyerDiscovery } from './buyerDiscovery.engine';
import { ProviderError } from './buyerDiscovery.providers';
import type { IBuyerDataProvider } from './buyerDiscovery.types';

// A discovery run calls the paid Gemini provider synchronously and can take
// over a minute. The frontend disables the Run button while one is in
// flight, but a same-tick double click, a second tab, or a retried request
// would otherwise start (and pay for) a duplicate run. Guard per
// user+product+countries here too. Single Render instance, so an in-memory
// map is sufficient.
const discoveryInFlight = new Set<string>();

function discoveryKey(userId: string, product: string, targetCountries: string[]): string {
  const countries = (Array.isArray(targetCountries) ? targetCountries : [])
    .map((c) => String(c).trim().toLowerCase())
    .sort()
    .join(',');
  return `${userId}:${(product || '').trim().toLowerCase()}:${countries}`;
}

export const buyersService = {
  async search(dto: BuyerSearchDto) {
    const { page, limit, sortBy, sortDir, q, country, industry, minLeadScore } = dto;
    const skip = (page - 1) * limit;

    const { buyers, total } = await buyersRepository.search({
      q, country, industry, minLeadScore,
      skip, take: limit,
      orderBy: { [sortBy]: sortDir },
    });

    return { buyers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  /**
   * Phase 7: Evidence-based buyer discovery.
   *
   * Candidates come from the grounded Gemini provider (Google Search citations
   * required). Accepts an optional providerOverride for testing with mock
   * providers. All candidates are verified, scored, and persisted before being
   * returned. Provider failures surface as honest 502/503 errors — never as
   * silently substituted mock companies.
   */
  async discover(
    userId: string,
    product: string,
    targetCountries: string[],
    options?: {
      category?: string;
      hsCode?: string;
      industry?: string;
      providerOverride?: IBuyerDataProvider;
    },
  ) {
    const key = discoveryKey(userId, product, targetCountries);
    if (discoveryInFlight.has(key)) {
      throw new AppError(
        'A buyer discovery for this product and country is already running. Please wait for it to finish.',
        429,
      );
    }
    discoveryInFlight.add(key);
    try {
      const result = await runBuyerDiscovery(
        {
          product,
          targetCountries: Array.isArray(targetCountries) ? targetCountries : [],
          category: options?.category,
          hsCode: options?.hsCode,
          industry: options?.industry,
        },
        options?.providerOverride,
      );
      return result;
    } catch (err) {
      if (err instanceof ProviderError) {
        const code = err.retryable ? 503 : 502;
        throw new AppError(err.message, code);
      }
      throw err;
    } finally {
      discoveryInFlight.delete(key);
    }
  },

  async getById(id: string) {
    const buyer = await buyersRepository.findById(id);
    if (!buyer) throw new AppError('Buyer not found', 404);
    return buyer;
  },
};
