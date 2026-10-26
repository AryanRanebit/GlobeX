import { buyersRepository } from './buyers.repository';
import { AppError } from '../../middleware/error.middleware';
import type { BuyerSearchDto } from './buyers.schema';
import { runBuyerDiscovery } from './buyerDiscovery.engine';
import { ProviderError } from './buyerDiscovery.providers';
import type { IBuyerDataProvider } from './buyerDiscovery.types';

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
   * Accepts an optional providerOverride for testing with mock providers.
   * All candidates are verified, scored, and persisted before being returned.
   * The response includes provenance, verification status, and score breakdown.
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
    }
  },

  async getById(id: string) {
    const buyer = await buyersRepository.findById(id);
    if (!buyer) throw new AppError('Buyer not found', 404);
    return buyer;
  },
};
