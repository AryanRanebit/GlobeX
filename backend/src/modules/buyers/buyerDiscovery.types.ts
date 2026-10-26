// ─────────────────────────────────────────────────────────────────────────────
// GlobeX AI — Evidence-Based Buyer Discovery Types (Phase 7)
// ─────────────────────────────────────────────────────────────────────────────

export type VerificationStatus =
  | 'unverified'
  | 'partially_verified'
  | 'verified_against_defined_criteria'
  | 'verification_failed';

export interface DiscoveredCandidate {
  companyName: string;
  normalizedName: string;
  country: string;
  countryCode: string;
  industry: string;
  domain?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  annualRevenue?: string;
  employeeCount?: string;
  importVolume?: string;
  sourceProvider: string;
  sourceUrl: string;
  providerReference?: string;
  retrievedAt: string;
  rawAttributes?: Record<string, any>;
  hasCustomsImportEvidence?: boolean;
  corporateRegistryActive?: boolean;
}

export interface VerificationCriterion {
  criterion: string;
  passed: boolean;
  evidenceDescription: string;
  sourceUrl?: string;
}

export interface VerificationEvidence {
  status: VerificationStatus;
  evaluatedAt: string;
  importerActivityConfirmed: boolean;
  corporateIdentityConfirmed: boolean;
  domainOwnershipConfirmed: boolean;
  criteriaChecked: VerificationCriterion[];
  missingSignals: string[];
  notes: string;
}

export interface LeadScoreFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  points: number;
  reasoning: string;
}

export interface LeadScoreBreakdown {
  score: number;
  confidence: number;
  factors: LeadScoreFactor[];
  explanation: string;
}

export interface BuyerProviderSearchParams {
  product: string;
  category?: string;
  hsCode?: string;
  targetMarket: string;
  limit?: number;
}

export interface BuyerProviderResult {
  candidates: DiscoveredCandidate[];
  provider: string;
  dataSourceMode: 'live_provider' | 'mock_provider';
  queryUsed: string;
  totalFound: number;
}

export interface IBuyerDataProvider {
  readonly name: string;
  searchCandidates(params: BuyerProviderSearchParams): Promise<BuyerProviderResult>;
}

export interface BuyerDiscoveryRequestDto {
  product: string;
  targetCountries: string[];
  category?: string;
  hsCode?: string;
  industry?: string;
}

export interface EnrichedBuyerRecord {
  id?: string;
  companyName: string;
  country: string;
  countryCode: string;
  industry: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  annualRevenue?: string | null;
  employeeCount?: string | null;
  importVolume?: string | null;
  leadScore: number;
  isVerified: boolean;
  sourceProvider: string;
  sourceUrl: string;
  providerReference?: string | null;
  verificationStatus: VerificationStatus;
  verificationEvidence: VerificationEvidence;
  scoreBreakdown: LeadScoreBreakdown;
}

export interface BuyerDiscoveryExecutionResult {
  product: string;
  targetCountries: string[];
  searchedAt: string;
  provider: string;
  dataSourceMode: 'live_provider' | 'mock_provider';
  totalCandidatesDiscovered: number;
  totalUniqueBuyers: number;
  queriesUsed: string[];
  buyers: EnrichedBuyerRecord[];
}
