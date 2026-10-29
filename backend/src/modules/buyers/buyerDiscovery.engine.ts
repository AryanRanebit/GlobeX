// ─────────────────────────────────────────────────────────────────────────────
// GlobeX AI — Buyer Discovery Engine (Phase 7)
//
// Orchestrates: provider query → normalization → deduplication →
//               verification → scoring → persistence
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../../config/env';
import {
  GeminiAgentBuyerProvider,
  deduplicateCandidates,
  generateBuyerSearchQuery,
  ProviderError,
} from './buyerDiscovery.providers';
import { verifyCandidateEvidence } from './buyerDiscovery.verification';
import { scoreCandidate } from './buyerDiscovery.scorer';
import type {
  IBuyerDataProvider,
  BuyerDiscoveryRequestDto,
  BuyerDiscoveryExecutionResult,
  EnrichedBuyerRecord,
  DiscoveredCandidate,
} from './buyerDiscovery.types';
import { buyersRepository } from './buyers.repository';

// ─── Provider Selection ───────────────────────────────────────────────────────

export function selectProvider(override?: IBuyerDataProvider): IBuyerDataProvider {
  if (override) return override;
  // The only production provider is the grounded Gemini agent (Google Search
  // grounding). The mock provider exists for tests only and is never selected
  // implicitly — surfacing a configuration error is more honest than silently
  // returning fabricated companies.
  const serviceUrl = env.AGENT_SERVICE_URL;
  if (serviceUrl && serviceUrl.length > 0) {
    return new GeminiAgentBuyerProvider(serviceUrl);
  }
  throw new ProviderError(
    'Buyer discovery is not configured: AGENT_SERVICE_URL is not set.',
    false,
  );
}

// ─── Enrich a single candidate ───────────────────────────────────────────────

function enrichCandidate(candidate: DiscoveredCandidate): EnrichedBuyerRecord {
  const evidence = verifyCandidateEvidence(candidate);
  const scoreBreakdown = scoreCandidate(candidate, evidence);

  return {
    companyName: candidate.companyName,
    country: candidate.country,
    countryCode: candidate.countryCode,
    industry: candidate.industry,
    website: candidate.website ?? null,
    email: candidate.email ?? null,
    phone: candidate.phone ?? null,
    address: candidate.address ?? null,
    annualRevenue: candidate.annualRevenue ?? null,
    employeeCount: candidate.employeeCount ?? null,
    importVolume: candidate.importVolume ?? null,
    leadScore: scoreBreakdown.score,
    isVerified: evidence.status === 'verified_against_defined_criteria',
    sourceProvider: candidate.sourceProvider,
    sourceUrl: candidate.sourceUrl,
    providerReference: candidate.providerReference ?? null,
    verificationStatus: evidence.status,
    verificationEvidence: evidence,
    scoreBreakdown,
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async function persistEnrichedBuyer(record: EnrichedBuyerRecord): Promise<EnrichedBuyerRecord> {
  const saved = await buyersRepository.createWithProvenance({
    companyName: record.companyName,
    country: record.country,
    countryCode: record.countryCode,
    industry: record.industry,
    website: record.website,
    email: record.email,
    phone: record.phone,
    address: record.address,
    annualRevenue: record.annualRevenue,
    employeeCount: record.employeeCount,
    importVolume: record.importVolume,
    leadScore: record.leadScore,
    isVerified: record.isVerified,
    sourceProvider: record.sourceProvider,
    sourceUrl: record.sourceUrl,
    providerReference: record.providerReference,
    verificationStatus: record.verificationStatus,
    verificationEvidence: record.verificationEvidence as any,
  });
  return { ...record, id: saved.id };
}

// ─── Main Discovery Function ──────────────────────────────────────────────────

export async function runBuyerDiscovery(
  dto: BuyerDiscoveryRequestDto,
  providerOverride?: IBuyerDataProvider,
): Promise<BuyerDiscoveryExecutionResult> {
  const provider = selectProvider(providerOverride);
  const searchedAt = new Date().toISOString();
  const allCandidates: DiscoveredCandidate[] = [];
  const queriesUsed: string[] = [];

  // Search per target country
  const countries = dto.targetCountries.length > 0 ? dto.targetCountries : ['global'];
  for (const market of countries) {
    const query = generateBuyerSearchQuery(dto.product, market);
    queriesUsed.push(query);

    try {
      const result = await provider.searchCandidates({
        product: dto.product,
        category: dto.category,
        hsCode: dto.hsCode,
        targetMarket: market,
      });
      allCandidates.push(...result.candidates);
    } catch (err) {
      // No silent fallback to fabricated candidates: provider failures surface
      // as an honest error (502/503 via the service layer) instead of mock buyers.
      throw err;
    }
  }

  // Deduplication across all markets
  const uniqueCandidates = deduplicateCandidates(allCandidates);

  // Enrich each unique candidate
  const enrichedBuyers: EnrichedBuyerRecord[] = [];
  for (const candidate of uniqueCandidates) {
    const enriched = enrichCandidate(candidate);
    const persisted = await persistEnrichedBuyer(enriched);
    enrichedBuyers.push(persisted);
  }

  return {
    product: dto.product,
    targetCountries: dto.targetCountries,
    searchedAt,
    provider: provider.name,
    dataSourceMode: provider.name === 'mock_provider' ? 'mock_provider' : 'live_provider',
    totalCandidatesDiscovered: allCandidates.length,
    totalUniqueBuyers: uniqueCandidates.length,
    queriesUsed,
    buyers: enrichedBuyers,
  };
}
