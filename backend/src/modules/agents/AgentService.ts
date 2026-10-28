// ─────────────────────────────────────────────────────────────────────────────
// GlobeX AI — Agent Service Contracts
//
// This file defines the TypeScript interfaces (contracts) for each AI Agent.
// The implementations are intentionally stubbed with realistic mock data
// so the backend compiles and runs end-to-end without any AI API keys.
//
// HOW TO PLUG IN REAL AI:
//   1. Pick your AI framework: OpenAI, Gemini, Claude, CrewAI, LangGraph, n8n
//   2. Replace the mock implementation in each Agent file
//   3. Set the relevant API key in .env
//   4. The service layer and routes remain unchanged
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentResult<T> {
  data: T;
  model: string;
  tokensUsed?: number;
  latencyMs?: number;
  cached?: boolean;
}

// ─── Market Research Agent ────────────────────────────────────────────────────

export interface MarketResearchInput {
  product: string;
  targetRegions?: string[];
  userIndustry?: string;
}

export interface MarketResearchOutput {
  product: string;
  category?: string;
  candidateHsCodes?: {
    hs_code: string;
    description: string;
    confidence: string;
    classification_status: string;
    rationale: string;
  }[];
  analyzedAt: string;
  summary: string;
  dataSourceMode?: string;
  disclaimer?: string;
  productId?: string;
  recommendedCountries: {
    country: string;
    countryCode: string;
    demandScore: number;
    growthRate: string;
    competition: 'Low' | 'Medium' | 'High' | 'N/A';
    marketSize?: string;
    trend?: string;
    insights?: string;
  }[];
}

export interface IMarketResearchAgent {
  analyze(input: MarketResearchInput): Promise<MarketResearchOutput>;
}

// ─── Buyer Discovery Agent ────────────────────────────────────────────────────

export interface BuyerDiscoveryInput {
  product: string;
  targetCountries: string[];
  industry?: string;
}

export interface BuyerDiscoveryOutput {
  buyers: {
    companyName: string;
    country: string;
    countryCode: string;
    industry: string;
    website?: string;
    email?: string;
    estimatedLeadScore: number;
    source: string;
  }[];
  searchedAt: string;
}

export interface IBuyerDiscoveryAgent {
  discover(input: BuyerDiscoveryInput): Promise<BuyerDiscoveryOutput>;
}

// ─── Lead Scoring Agent ───────────────────────────────────────────────────────

export interface LeadScoringInput {
  buyerId: string;
  userId: string;
  productId?: string;
}

export interface LeadScoringOutput {
  score: number;           // 0–100
  confidence: number;      // 0–1
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
  reasoning: string;
}

export interface ILeadScoringAgent {
  score(input: LeadScoringInput): Promise<number>;
  scoreWithDetails(input: LeadScoringInput): Promise<LeadScoringOutput>;
}

// ─── Outreach Agent ───────────────────────────────────────────────────────────

export interface OutreachInput {
  buyer: {
    companyName: string;
    country: string;
    industry: string;
    email?: string;
  };
  sender: {
    name: string;
    companyName: string;
    industry: string;
  };
  tone: 'professional' | 'friendly' | 'formal';
  language: string;
  customContext?: string;
}

export interface OutreachOutput {
  subject: string;
  content: string;
  model: string;
  prompt?: string;
}

export interface IOutreachAgent {
  generate(input: OutreachInput): Promise<OutreachOutput>;
}

// ─── Compliance Agent ─────────────────────────────────────────────────────────

export interface ComplianceInput {
  country: string;
  product: string;
  productCategory?: string;
  hsCode?: string;
}

export interface ComplianceOutput {
  country: string;
  requirements: {
    documentName: string;
    description: string;
    category: string;
    isRequired: boolean;
    estimatedCost?: string;
    processingTime?: string;
  }[];
  summary: string;
}

export interface IComplianceAgent {
  getRequirements(input: ComplianceInput): Promise<ComplianceOutput>;
}
