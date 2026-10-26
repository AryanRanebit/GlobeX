// ─────────────────────────────────────────────────────────────────────────────
// GlobeX AI — Buyer Verification Pipeline (Phase 7)
//
// Verification is strictly evidence-based.
// A company name from an LLM does NOT constitute verified importer status.
// Each status maps to a specific and honest evidence threshold.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DiscoveredCandidate,
  VerificationCriterion,
  VerificationEvidence,
  VerificationStatus,
} from './buyerDiscovery.types';

// ─── Status computation ───────────────────────────────────────────────────────

function computeStatus(
  identityOk: boolean,
  domainOk: boolean,
  importerOk: boolean,
  corporateOk: boolean,
): VerificationStatus {
  if (importerOk && identityOk) return 'verified_against_defined_criteria';
  // "partially_verified" requires at least one external signal (domain or corporate registry).
  // A company name alone from an LLM is insufficient — it is unverified.
  if (domainOk || corporateOk) return 'partially_verified';
  return 'unverified';
}

// ─── Verify a single candidate ───────────────────────────────────────────────

export function verifyCandidateEvidence(candidate: DiscoveredCandidate): VerificationEvidence {
  const criteria: VerificationCriterion[] = [];
  const missingSignals: string[] = [];

  // ── Criterion 1: Company name present and non-empty
  const identityOk =
    typeof candidate.companyName === 'string' &&
    candidate.companyName.trim().length > 3 &&
    !['Unknown Company', 'Unknown'].includes(candidate.companyName.trim());

  criteria.push({
    criterion: 'company_name_present',
    passed: identityOk,
    evidenceDescription: identityOk
      ? `Company name "${candidate.companyName}" is present from provider "${candidate.sourceProvider}".`
      : 'No usable company name returned by provider.',
    sourceUrl: identityOk ? candidate.sourceUrl : undefined,
  });

  // ── Criterion 2: Website domain present
  const domainOk = typeof candidate.domain === 'string' && candidate.domain.length > 3;
  criteria.push({
    criterion: 'website_domain_present',
    passed: domainOk,
    evidenceDescription: domainOk
      ? `Website domain "${candidate.domain}" was returned by provider. Domain existence does NOT confirm importer activity.`
      : 'No website domain available from provider.',
    sourceUrl: domainOk ? candidate.sourceUrl : undefined,
  });
  if (!domainOk) missingSignals.push('website_domain');

  // ── Criterion 3: Corporate registry active (requires a registry provider)
  const corporateOk = candidate.corporateRegistryActive === true;
  criteria.push({
    criterion: 'corporate_registry_active',
    passed: corporateOk,
    evidenceDescription: corporateOk
      ? 'Provider confirmed active registration in a corporate registry.'
      : 'Corporate registry status unknown — no registry provider is connected. OpenCorporates or equivalent required.',
  });
  if (!corporateOk) missingSignals.push('corporate_registry_confirmation');

  // ── Criterion 4: Customs/import activity evidence
  const importerOk = candidate.hasCustomsImportEvidence === true;
  criteria.push({
    criterion: 'customs_import_evidence',
    passed: importerOk,
    evidenceDescription: importerOk
      ? 'Provider returned customs or trade-lane import evidence.'
      : 'No customs or import-activity evidence. A web search result or LLM suggestion does NOT establish import history.',
  });
  if (!importerOk) missingSignals.push('customs_import_evidence');

  // ── Criterion 5: Contact data present (email or phone)
  const contactOk =
    (typeof candidate.email === 'string' && candidate.email.includes('@')) ||
    (typeof candidate.phone === 'string' && candidate.phone.length > 0);
  criteria.push({
    criterion: 'contact_information_present',
    passed: contactOk,
    evidenceDescription: contactOk
      ? 'Contact data (email or phone) returned by provider.'
      : 'No contact information available from provider.',
  });
  if (!contactOk) missingSignals.push('contact_information');

  const status = computeStatus(identityOk, domainOk, importerOk, corporateOk);

  const importerActivityConfirmed = importerOk;
  const corporateIdentityConfirmed = corporateOk;
  const domainOwnershipConfirmed = domainOk && corporateOk; // Domain alone is insufficient

  return {
    status,
    evaluatedAt: new Date().toISOString(),
    importerActivityConfirmed,
    corporateIdentityConfirmed,
    domainOwnershipConfirmed,
    criteriaChecked: criteria,
    missingSignals,
    notes: [
      `Provider: ${candidate.sourceProvider}.`,
      importerOk
        ? 'Customs import evidence present.'
        : 'WARNING: Importer activity has NOT been established. Candidate is a discovery lead only.',
      missingSignals.length > 0
        ? `Missing signals (absent, not disqualifying): ${missingSignals.join(', ')}.`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}
