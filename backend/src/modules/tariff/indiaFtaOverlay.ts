/**
 * India Free Trade Agreement overlay (hand-curated, documented).
 *
 * WITS/TRAINS reports both MFN and preferential (PREF) tariff rates, but it
 * does not label WHICH agreement a preferential rate belongs to. This table
 * supplies that context for Indian exporters: given a destination market, it
 * names the India trade agreement (if any) that could deliver a preferential
 * rate, with its status.
 *
 * Sources (official):
 *  - SAFTA: https://commerce.gov.in/international-trade/trade-agreements/
 *  - India-ASEAN FTA (AIFTA): in force for goods 1 Jan 2010
 *  - India-UAE CEPA: signed 18 Feb 2022, in force 1 May 2022
 *  - India-Australia ECTA: signed 2 Apr 2022, in force 29 Dec 2022
 *  - India-Mauritius CECPA: in force 1 Apr 2021
 *  - India-Korea CEPA: in force 1 Jan 2010
 *  - India-Japan CEPA: in force 1 Aug 2011
 *  - India-Singapore CECA: in force 1 Aug 2005
 *  - India-Malaysia CECA: in force 1 Jul 2011
 *  - India-EFTA TEPA: signed 10 Mar 2024 (entry into force on completion of
 *    ratification by all parties - verify current status)
 *  - India-UK CETA: signed 24 Jul 2025 (entry into force pending
 *    ratification - verify current status)
 *
 * IMPORTANT: an agreement listed here does NOT mean every product gets a
 * preferential rate. Concessions are schedule-specific (per HS line) and
 * require a certificate of origin. The actual preferential rate, when one
 * exists, is read live from WITS (partner = India, TARIFFTYPE = PREF).
 */
export interface IndiaFtaEntry {
  /** Agreement short name, e.g. "India-UAE CEPA" */
  agreement: string;
  /** 'in_force' | 'signed_pending' */
  status: 'in_force' | 'signed_pending';
  /** Human context shown with the tariff data */
  note: string;
}

export const INDIA_FTA_OVERLAY: Record<string, IndiaFtaEntry> = {
  // ── SAFTA (South Asian Free Trade Area, in force 1 Jan 2006) ──────────
  BD: { agreement: 'SAFTA', status: 'in_force', note: 'South Asian FTA: concessional tariffs for SAARC members; check sensitive list.' },
  LK: { agreement: 'SAFTA + India-Sri Lanka FTA', status: 'in_force', note: 'ISFTA (2000) often deeper than SAFTA; product-specific quotas may apply.' },
  NP: { agreement: 'SAFTA + India-Nepal Treaty of Trade', status: 'in_force', note: 'Bilateral treaty gives broad duty-free access for originating goods.' },
  BT: { agreement: 'India-Bhutan Trade Agreement', status: 'in_force', note: 'Free trade regime between India and Bhutan.' },
  MV: { agreement: 'SAFTA', status: 'in_force', note: 'SAFTA concessional rates; narrow trade basket.' },
  PK: { agreement: 'SAFTA', status: 'in_force', note: 'SAFTA rates apply formally; bilateral trade restrictions frequently override in practice.' },
  AF: { agreement: 'SAFTA', status: 'in_force', note: 'SAFTA member; preferential market access arrangement also exists.' },

  // ── ASEAN bloc (India-ASEAN FTA, goods in force 1 Jan 2010) ───────────
  SG: { agreement: 'India-ASEAN FTA + India-Singapore CECA', status: 'in_force', note: 'Singapore already grants near-zero MFN duties on most goods.' },
  MY: { agreement: 'India-ASEAN FTA + India-Malaysia CECA', status: 'in_force', note: 'CECA concessions exceed AIFTA on many lines.' },
  TH: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions; earlier Early Harvest Scheme subsumed.' },
  VN: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions; check product schedule.' },
  ID: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions; check product schedule.' },
  PH: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions; check product schedule.' },
  MM: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions.' },
  KH: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions.' },
  LA: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions.' },
  BN: { agreement: 'India-ASEAN FTA', status: 'in_force', note: 'AIFTA concessions.' },

  // ── Bilateral CEPAs in force ───────────────────────────────────────────
  AE: { agreement: 'India-UAE CEPA', status: 'in_force', note: 'In force May 2022: zero duty on ~90% of tariff lines over 5-10 yrs; many agricultural lines duty-free from day one.' },
  AU: { agreement: 'India-Australia ECTA', status: 'in_force', note: 'In force Dec 2022: Australia gives 100% duty-free access to Indian exports (zero from day one on most lines).' },
  KR: { agreement: 'India-Korea CEPA', status: 'in_force', note: 'In force 2010; phased concessions, product schedule applies.' },
  JP: { agreement: 'India-Japan CEPA', status: 'in_force', note: 'In force 2011; phased concessions, product schedule applies.' },
  MU: { agreement: 'India-Mauritius CECPA', status: 'in_force', note: 'In force Apr 2021; first India-Africa trade pact.' },

  // ── Signed, entry into force pending ───────────────────────────────────
  CH: { agreement: 'India-EFTA TEPA', status: 'signed_pending', note: 'Signed Mar 2024; enters into force after ratification. Verify current status before quoting preferential rates.' },
  NO: { agreement: 'India-EFTA TEPA', status: 'signed_pending', note: 'Signed Mar 2024; enters into force after ratification. Verify current status before quoting preferential rates.' },
  IS: { agreement: 'India-EFTA TEPA', status: 'signed_pending', note: 'Signed Mar 2024; enters into force after ratification. Verify current status before quoting preferential rates.' },
  GB: { agreement: 'India-UK CETA', status: 'signed_pending', note: 'Signed Jul 2025; enters into force after ratification. Until then MFN rates apply.' },
};

/** Look up the India FTA overlay for a destination market (ISO alpha-2). */
export function getIndiaFta(iso2: string | undefined | null): IndiaFtaEntry | null {
  if (!iso2) return null;
  return INDIA_FTA_OVERLAY[iso2.trim().toUpperCase()] ?? null;
}
