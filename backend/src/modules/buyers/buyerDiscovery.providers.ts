// ─────────────────────────────────────────────────────────────────────────────
// GlobeX AI — Buyer Data Providers (Phase 7)
//
// PROVIDER ASSESSMENT (documented here for honest accounting):
//
//   GEMINI_GROUNDED_PROVIDER (production):
//     Routes requests through the Python ai-agent microservice at
//     AGENT_SERVICE_URL/agents/buyer-discovery, which runs Gemini with the
//     Google Search grounding tool. The agent keeps only companies that are
//     attributable to a real search-result citation; companies without a
//     citation are dropped there, and each returned buyer carries its source
//     URL. When grounded search finds nothing credible, the agent returns an
//     honest empty result — never fabricated companies.
//
//     Evidence level: web-search citation (company existence + relevance).
//       - Can establish: company name, country, industry, website, and a
//         public source URL for the claim.
//       - Cannot establish: actual customs import records, confirmed importer
//         registration, verified contact data, or purchase history.
//       - Verification status: "partially_verified" at best (domain evidence);
//         never "verified_against_defined_criteria" without customs evidence.
//
//   MOCK_PROVIDER:
//     Test-only (unit/integration tests inject it via providerOverride).
//     It is never selected implicitly in production: a missing or failing
//     live provider raises ProviderError instead of returning mock companies.
//
//   UNEVALUATED / NOT CONFIGURED:
//     - OpenCorporates (401 without API key — not provisioned)
//     - Apollo.io (no key present)
//     - Clearbit (no key present)
//     - SerpApi / HasData (no key present)
//
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IBuyerDataProvider,
  BuyerProviderSearchParams,
  BuyerProviderResult,
  DiscoveredCandidate,
} from './buyerDiscovery.types';

// ─── Query Generator ─────────────────────────────────────────────────────────

export function generateBuyerSearchQuery(
  product: string,
  targetMarket: string,
): string {
  const market = targetMarket.trim();
  return `importers of "${product}" in ${market}`;
}

// ─── Name Normalizer ─────────────────────────────────────────────────────────

export function normalizeCompanyName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b(ltd|llc|inc|corp|gmbh|plc|pvt|limited|co\.|s\.a\.|b\.v\.)\b\.?$/gi, '')
    .trim();
}

// ─── Domain Extractor ────────────────────────────────────────────────────────

export function extractDomain(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

// ─── Deduplication Key ───────────────────────────────────────────────────────

export function deduplicationKey(candidate: Pick<DiscoveredCandidate, 'normalizedName' | 'countryCode' | 'domain'>): string {
  return [
    candidate.normalizedName,
    candidate.countryCode.toUpperCase(),
    candidate.domain || '',
  ].join('::');
}

// ─── Deduplication ───────────────────────────────────────────────────────────

export function deduplicateCandidates(candidates: DiscoveredCandidate[]): DiscoveredCandidate[] {
  const seen = new Map<string, DiscoveredCandidate>();
  for (const c of candidates) {
    const key = deduplicationKey(c);
    if (!seen.has(key)) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

// ─── Mock Provider (tests only — never selected implicitly in production) ───

export class MockBuyerDataProvider implements IBuyerDataProvider {
  readonly name = 'mock_provider';

  async searchCandidates(params: BuyerProviderSearchParams): Promise<BuyerProviderResult> {
    const query = generateBuyerSearchQuery(params.product, params.targetMarket);
    const now = new Date().toISOString();

    // Deterministic mock candidates — clearly labelled as mock data.
    // Domain and website are intentionally absent: fabricated .example.com URLs
    // are not real evidence and would incorrectly elevate verification status.
    const candidates: DiscoveredCandidate[] = [
      {
        companyName: 'Global Traders Mock Co.',
        normalizedName: normalizeCompanyName('Global Traders Mock Co.'),
        country: params.targetMarket,
        countryCode: 'XX',
        industry: 'Import & Distribution',
        domain: undefined,
        website: undefined,
        email: undefined,
        importVolume: undefined,
        sourceProvider: this.name,
        sourceUrl: `mock://provider/search?q=${encodeURIComponent(query)}&index=0`,
        providerReference: 'mock-ref-001',
        retrievedAt: now,
        rawAttributes: { _isMockData: true },
      },
      {
        companyName: 'Mock Imports International',
        normalizedName: normalizeCompanyName('Mock Imports International'),
        country: params.targetMarket,
        countryCode: 'XX',
        industry: 'Wholesale Trade',
        domain: undefined,
        website: undefined,
        email: undefined,
        importVolume: undefined,
        sourceProvider: this.name,
        sourceUrl: `mock://provider/search?q=${encodeURIComponent(query)}&index=1`,
        providerReference: 'mock-ref-002',
        retrievedAt: now,
        rawAttributes: { _isMockData: true },
      },
    ];

    return {
      candidates,
      provider: this.name,
      dataSourceMode: 'mock_provider',
      queryUsed: query,
      totalFound: candidates.length,
    };
  }
}

// ─── Gemini / AI-Agent Provider ───────────────────────────────────────────────
//
// Routes to the Python ai-agent microservice, which runs Gemini with the
// Google Search grounding tool and returns only citation-backed companies
// (see ai-agent/services/buyer_discovery.py). An honest empty result is
// returned upstream when nothing credible is found.
//
// Rate-limit behaviour: FastAPI upstream will return 429 or 503 when overloaded;
// we surface those as ProviderError with retryable=true so the caller can back off.

export class GeminiAgentBuyerProvider implements IBuyerDataProvider {
  readonly name = 'gemini_agent';
  private readonly agentServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(agentServiceUrl: string, timeoutMs = 45_000) {
    this.agentServiceUrl = agentServiceUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  async searchCandidates(params: BuyerProviderSearchParams): Promise<BuyerProviderResult> {
    const query = generateBuyerSearchQuery(params.product, params.targetMarket);

    let response: Response;
    try {
      response = await fetch(`${this.agentServiceUrl}/agents/buyer-discovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: params.product,
          target_countries: [params.targetMarket],
          category: params.category,
          hs_code: params.hsCode,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      throw new ProviderError(`GeminiAgentBuyerProvider: network error — ${msg}`, true);
    }

    if (response.status === 429 || response.status === 503) {
      throw new ProviderError(
        `GeminiAgentBuyerProvider: upstream rate-limited (HTTP ${response.status})`,
        true,
      );
    }

    if (!response.ok) {
      throw new ProviderError(
        `GeminiAgentBuyerProvider: upstream error (HTTP ${response.status})`,
        false,
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new ProviderError('GeminiAgentBuyerProvider: malformed JSON from agent service', false);
    }

    const rawBuyers: any[] = Array.isArray(data?.buyers) ? data.buyers : [];
    const now = new Date().toISOString();

    const candidates: DiscoveredCandidate[] = rawBuyers.map((b, i) => {
      const website = typeof b.website === 'string' && b.website.length > 0 ? b.website : undefined;
      const domain = extractDomain(website);
      const companyName = typeof b.companyName === 'string' ? b.companyName.trim() : 'Unknown Company';
      return {
        companyName,
        normalizedName: normalizeCompanyName(companyName),
        country: typeof b.country === 'string' ? b.country : params.targetMarket,
        countryCode: typeof b.countryCode === 'string' && b.countryCode.length === 2
          ? b.countryCode.toUpperCase()
          : 'XX',
        industry: typeof b.industry === 'string' ? b.industry : 'Unknown',
        domain,
        website,
        email: typeof b.email === 'string' && b.email.includes('@') ? b.email : undefined,
        phone: typeof b.phone === 'string' ? b.phone : undefined,
        address: typeof b.address === 'string' ? b.address : undefined,
        annualRevenue: typeof b.annualRevenue === 'string' ? b.annualRevenue : undefined,
        employeeCount: typeof b.employeeCount === 'number'
          ? String(b.employeeCount)
          : (typeof b.employeeCount === 'string' ? b.employeeCount : undefined),
        importVolume: typeof b.importVolume === 'string' ? b.importVolume : undefined,
        sourceProvider: this.name,
        // Source URL is the grounding citation if available; else the query endpoint
        sourceUrl: typeof b.sourceUrl === 'string' && b.sourceUrl.startsWith('http')
          ? b.sourceUrl
          : `${this.agentServiceUrl}/agents/buyer-discovery`,
        providerReference: typeof b.providerRef === 'string' ? b.providerRef : `gemini-${i}`,
        retrievedAt: now,
        hasCustomsImportEvidence: false,
        corporateRegistryActive: false,
        rawAttributes: {
          source: b.source,
          estimatedLeadScore: b.estimatedLeadScore,
          isVerifiedByProvider: b.isVerified ?? false,
        },
      };
    });

    return {
      candidates,
      provider: this.name,
      dataSourceMode: 'live_provider',
      queryUsed: query,
      totalFound: candidates.length,
    };
  }
}

// ─── ProviderError ────────────────────────────────────────────────────────────

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
