// ─────────────────────────────────────────────────────────────────────────────
// GlobeX AI — Deterministic Lead Scorer (Phase 7)
//
// Scores are based exclusively on evidence present in the DiscoveredCandidate.
// Missing data is treated as "no evidence" (neutral/zero), not as a negative
// signal, unless the candidate is from a mock provider.
// All points are transparent and explainable.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DiscoveredCandidate,
  LeadScoreFactor,
  LeadScoreBreakdown,
} from './buyerDiscovery.types';
import type { VerificationEvidence } from './buyerDiscovery.types';

// ─── Scoring rules ────────────────────────────────────────────────────────────

interface ScoringRule {
  factor: string;
  points: number;
  reasoning: string;
  evaluate(c: DiscoveredCandidate, e: VerificationEvidence): boolean | null;
}

const SCORING_RULES: ScoringRule[] = [
  {
    factor: 'company_identity_confirmed',
    points: 20,
    reasoning: 'Company name is non-trivial and returned by provider.',
    evaluate: (c) =>
      typeof c.companyName === 'string' &&
      c.companyName.trim().length > 3 &&
      !['Unknown Company', 'Unknown'].includes(c.companyName.trim()),
  },
  {
    factor: 'domain_available',
    points: 10,
    reasoning: 'Provider returned a parseable website domain.',
    evaluate: (c) => typeof c.domain === 'string' && c.domain.length > 3,
  },
  {
    factor: 'contact_email_present',
    points: 15,
    reasoning: 'Contact email returned by provider (facilitates outreach).',
    evaluate: (c) => typeof c.email === 'string' && c.email.includes('@'),
  },
  {
    factor: 'corporate_registry_active',
    points: 25,
    reasoning: 'Corporate registry provider confirmed active legal status.',
    evaluate: (c) => c.corporateRegistryActive === true,
  },
  {
    factor: 'customs_import_evidence',
    points: 30,
    reasoning: 'Provider returned documented customs or trade-lane import evidence.',
    evaluate: (c) => c.hasCustomsImportEvidence === true,
  },
  {
    factor: 'from_mock_provider',
    points: -5,
    reasoning: 'Candidate is from a mock provider and has no real-world basis.',
    evaluate: (c) => c.sourceProvider === 'mock_provider',
  },
];

// ─── Score computation ────────────────────────────────────────────────────────

export function scoreCandidate(
  candidate: DiscoveredCandidate,
  evidence: VerificationEvidence,
): LeadScoreBreakdown {
  const factors: LeadScoreFactor[] = [];
  let total = 0;

  for (const rule of SCORING_RULES) {
    const result = rule.evaluate(candidate, evidence);
    if (result === null) continue; // data missing — skip, don't penalise

    const passed = result === true;
    const points = passed ? rule.points : 0;
    total += points;

    factors.push({
      factor: rule.factor,
      impact: rule.points > 0 ? (passed ? 'positive' : 'neutral') : (passed ? 'negative' : 'neutral'),
      points,
      reasoning: passed
        ? rule.reasoning
        : rule.points > 0
          ? `Missing: ${rule.reasoning}`
          : `Not applicable: ${rule.reasoning}`,
    });
  }

  const score = Math.max(0, Math.min(100, total));

  // Confidence: proportion of positive criteria met
  const possiblePositive = SCORING_RULES.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0);
  const confidence = possiblePositive > 0 ? Number((total / possiblePositive).toFixed(2)) : 0;

  const explanation = [
    `Score ${score}/100 based on ${factors.length} evaluated criteria.`,
    evidence.missingSignals.length > 0
      ? `Missing evidence (treated as neutral, not negative): ${evidence.missingSignals.join(', ')}.`
      : 'All key signals present.',
    evidence.importerActivityConfirmed
      ? 'Confirmed importer activity.'
      : 'Importer activity NOT confirmed — discovery lead only.',
  ].join(' ');

  return { score, confidence, factors, explanation };
}
