import { prisma } from '../../config/database';
import { marketResearchAgent } from '../agents/MarketResearchAgent';
import type { AnalyzeMarketDto } from './market.schema';
import { researchJobService } from './researchJob.service';
import { tariffService, normalizeHsCode, type TariffInfo } from '../tariff/tariff.service';
import { historyService } from '../history/history.service';

export interface CountryOpportunity {
  country: string;
  countryCode: string;
  demandScore: number;
  growthRate: string;
  competition: 'Low' | 'Medium' | 'High' | 'N/A';
  marketSize?: string;
  trend?: string;
  insights?: string;
  /** WITS/TRAINS MFN + India-preferential tariff (free source), when found */
  tariff?: TariffInfo | null;
}

export interface MarketAnalysisResult {
  product: string;
  category?: string;
  candidateHsCodes?: any[];
  candidateHsCode?: string | null;
  analyzedAt: string;
  recommendedCountries: CountryOpportunity[];
  summary: string;
  dataSourceMode?: string;
  disclaimer?: string;
  productId?: string;
  savedOpportunitiesCount?: number;
}

export const marketService = {
  /**
   * Enqueues a research job for resilient background execution and returns immediately.
   */
  async analyze(
    userId: string,
    dto: AnalyzeMarketDto,
    options?: { idempotencyKey?: string; maxRetries?: number }
  ) {
    return researchJobService.createJob(userId, dto, options);
  },

  /**
   * Retrieves status and results for a specific research job.
   */
  async getJobStatus(jobId: string, userId: string) {
    return researchJobService.getJob(jobId, userId);
  },

  /**
   * Core synchronous execution of market research pipeline.
   * Invoked by background ResearchJobWorker.
   */
  async executeResearch(userId: string, dto: AnalyzeMarketDto): Promise<MarketAnalysisResult> {
    // ── 1. Call MarketResearchAgent (Python AI service) ──────────
    const agentResult = await marketResearchAgent.analyze({
      product: dto.product,
      targetRegions: dto.targetRegions,
    });

    if (!agentResult || !Array.isArray(agentResult.recommendedCountries)) {
      throw new Error('Market research provider returned an invalid result structure.');
    }

    // ── 1b. Enrich markets with tariff/duty data (free WITS source) ────
    // Runs in the background worker, so WITS latency does not block HTTP.
    // A tariff failure never fails the analysis: the field stays null.
    const tariffHs = normalizeHsCode(agentResult.candidateHsCodes?.[0]?.hs_code);
    if (tariffHs && agentResult.recommendedCountries.length > 0) {
      try {
        await tariffService.enrichCountries(agentResult.recommendedCountries, tariffHs);
      } catch (tariffErr) {
        // enrichment is best-effort; log and continue
        console.warn('Tariff enrichment failed:', (tariffErr as Error).message);
      }
    }

    // ── 2. Link or create Product for the authenticated user ─────
    let targetProductId = dto.productId;
    if (targetProductId) {
      const existing = await prisma.product.findFirst({
        where: { id: targetProductId, userId },
      });
      if (!existing) targetProductId = undefined;
    }

    if (!targetProductId) {
      // Look up by normalized product name for this user
      const existingByName = await prisma.product.findFirst({
        where: {
          userId,
          productName: { equals: agentResult.product, mode: 'insensitive' },
        },
      });

      if (existingByName) {
        targetProductId = existingByName.id;
      } else {
        const topCandidateHs = agentResult.candidateHsCodes?.[0]?.hs_code;
        const newProduct = await prisma.product.create({
          data: {
            userId,
            productName: agentResult.product,
            category: agentResult.category || 'General Merchandise',
            description: dto.description || `Export product analyzed via AI market intelligence.`,
            hsCode: topCandidateHs || null,
            targetCountries: agentResult.recommendedCountries.map(c => c.countryCode),
            currency: 'USD',
            isActive: true,
          },
        });
        targetProductId = newProduct.id;
      }
    }

    // ── 3. Persist opportunities with strict user ownership ──────
    if (agentResult.recommendedCountries.length > 0) {
      // Clear older opportunities for this product to avoid duplicates
      if (targetProductId) {
        await prisma.opportunity.deleteMany({
          where: { userId, productId: targetProductId },
        });
      }

      await prisma.opportunity.createMany({
        data: agentResult.recommendedCountries.map((c) => ({
          userId,
          productId: targetProductId,
          country: c.country,
          countryCode: c.countryCode,
          demandScore: c.demandScore,
          growthRate: c.growthRate,
          competition: c.competition,
          marketSize: c.marketSize || 'N/A',
          trend: c.trend || 'N/A',
          insights: c.insights || '',
          source: 'ai_analysis',
        })),
        skipDuplicates: true,
      });
    }

    const finalResult = {
      ...agentResult,
      candidateHsCode: agentResult.candidateHsCodes?.[0]?.hs_code || null,
      savedOpportunitiesCount: agentResult.recommendedCountries.length,
      productId: targetProductId,
    };

    // Analysis history: snapshot the completed analysis so the user can
    // reopen it from History with zero external API calls. Best-effort.
    void historyService.recordFullAnalysis(
      userId,
      finalResult.candidateHsCode,
      finalResult.product || dto.product,
      finalResult,
    );

    return finalResult;
  },

  /**
   * Retrieves saved opportunities for the user.
   */
  async getOpportunities(userId: string) {
    return prisma.opportunity.findMany({
      where: { userId },
      orderBy: { demandScore: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            productName: true,
            category: true,
            hsCode: true,
          },
        },
      },
    });
  },
};
