/**
 * Tariff intelligence from free public data.
 *
 * Source: WITS (World Integrated Trade Solution), World Bank / UNCTAD TRAINS.
 *  - Free, no API key required.
 *  - REST form:
 *      https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN
 *        /reporter/{M49 numeric}/partner/{M49 numeric|000=World}
 *        /product/{HS code}/year/{yyyy}/datatype/reported?format=JSON
 *  - Response is SDMX-JSON: observation[0] is the SimpleAverage ad valorem
 *    rate (%); observation attributes carry TariffType (MFN/PREF),
 *    Min_Rate, Max_Rate and TotalNoOfLines.
 *  - partner=000 (World) yields the MFN rate; partner=356 (India) yields the
 *    preferential rate actually granted to India when a preference exists.
 *
 * Caveats surfaced honestly to callers:
 *  - TRAINS lags: recent years may have no data; we walk back from the
 *    latest year until a year with data is found (see YEARS_TO_TRY).
 *  - WITS can be slow (tens of seconds). Calls are cached in-process and
 *    individually time-boxed; failures degrade to status 'unavailable'
 *    rather than breaking the caller.
 */
import { logger } from '../../utils/logger';
import { resolveCountry } from './isoNumeric';
import { getIndiaFta, type IndiaFtaEntry } from './indiaFtaOverlay';

const WITS_BASE = 'https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN';
const INDIA_NUMERIC = '356';
const WORLD_NUMERIC = '000';
/** Latest TRAINS years to try, newest first (2023+ not yet populated). */
const YEARS_TO_TRY = [2023, 2022, 2021, 2020];
const REQUEST_TIMEOUT_MS = 45_000; // WITS regularly takes 30-40s
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface TariffInfo {
  hsCode: string;
  /** Destination market as ISO alpha-2 when known */
  countryIso2: string | null;
  reporterCode: string;
  reporterName: string;
  /** Year the rates were reported for */
  year: number | null;
  /** MFN simple-average ad valorem duty, percent */
  mfnSimpleAverage: number | null;
  mfnMinRate: number | null;
  mfnMaxRate: number | null;
  /** Preferential simple-average rate granted to India, percent (if any) */
  preferentialSimpleAverage: number | null;
  /** India FTA context for this market, from the curated overlay */
  indiaFta: (IndiaFtaEntry & { statusLabel: string }) | null;
  status: 'ok' | 'no_data' | 'unavailable';
  note?: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
}

interface WitsRow {
  year: number;
  tariffType: string | null;
  simpleAverage: number | null;
  minRate: number | null;
  maxRate: number | null;
  numLines: number | null;
}

const cache = new Map<string, { at: number; rows: WitsRow[] }>();

/** Parse the WITS SDMX-JSON payload into flat rows (exported for tests). */
export function parseWitsSdmx(payload: any): WitsRow[] {
  const rows: WitsRow[] = [];
  const structure = payload?.structure;
  const obsAttrs = structure?.attributes?.observation ?? [];
  const obsDims = structure?.dimensions?.observation ?? [];
  const dataSets = payload?.dataSets ?? [];

  const attrValue = (attrIdx: number, valueIdx: number | null): any => {
    if (valueIdx === null || valueIdx === undefined) return null;
    const values = obsAttrs[attrIdx]?.values ?? [];
    const raw = values[valueIdx]?.id ?? values[valueIdx]?.name;
    if (raw === undefined || raw === null) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  };

  for (const ds of dataSets) {
    const seriesMap = ds?.series ?? {};
    for (const series of Object.values<any>(seriesMap)) {
      for (const [obsKey, obsArr] of Object.entries<any>(series.observations ?? {})) {
        const dimIdx = obsKey.split(':').map(Number);
        const yearRaw = obsDims[0]?.values?.[dimIdx[0]]?.id;
        const year = Number(yearRaw);
        rows.push({
          year: Number.isFinite(year) ? year : 0,
          tariffType: attrValue(2, obsArr[3]) as string | null,
          simpleAverage: typeof obsArr[0] === 'number' ? obsArr[0] : Number(obsArr[0]),
          minRate: attrValue(4, obsArr[5]) as number | null,
          maxRate: attrValue(5, obsArr[6]) as number | null,
          numLines: attrValue(6, obsArr[7]) as number | null,
        });
      }
    }
  }
  return rows.filter((r) => r.year > 0);
}

async function fetchWitsRows(
  reporterNumeric: string,
  partnerNumeric: string,
  hsCode: string,
  year: number,
): Promise<WitsRow[]> {
  const cacheKey = `${reporterNumeric}:${partnerNumeric}:${hsCode}:${year}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rows;

  const url =
    `${WITS_BASE}/reporter/${reporterNumeric}/partner/${partnerNumeric}` +
    `/product/${hsCode}/year/${year}/datatype/reported?format=JSON`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'GlobeX-TariffClient/1.0' },
    });
    // WITS answers 404 "NoRecordsFound" when a reporter/year/product has
    // no data - that is a legitimate empty result, not a failure, so the
    // caller can walk back to an earlier year.
    if (res.status === 404) {
      cache.set(cacheKey, { at: Date.now(), rows: [] });
      return [];
    }
    if (!res.ok) throw new Error(`WITS responded ${res.status}`);
    const payload = await res.json();
    const rows = parseWitsSdmx(payload);
    cache.set(cacheKey, { at: Date.now(), rows });
    return rows;
  } finally {
    clearTimeout(timer);
  }
}

/** Normalize an HS code like "1006.30" / "100630" to a 6-digit WITS code. */
export function normalizeHsCode(hs: string | undefined | null): string | null {
  if (!hs) return null;
  const digits = String(hs).replace(/[^0-9]/g, '');
  if (digits.length < 2) return null;
  return digits.slice(0, 6);
}

export const tariffService = {
  /**
   * MFN + (where an India preference exists) preferential tariff for one
   * destination market and HS code. Never throws: failures return an
   * 'unavailable' TariffInfo with an explanatory note.
   */
  async getTariff(hsCodeRaw: string, countryRaw: string): Promise<TariffInfo> {
    const hsCode = normalizeHsCode(hsCodeRaw) ?? String(hsCodeRaw ?? '');
    const country = resolveCountry(countryRaw);
    const base: TariffInfo = {
      hsCode,
      countryIso2: country?.iso2 ?? null,
      reporterCode: country?.numeric ?? '',
      reporterName: country?.name ?? String(countryRaw ?? ''),
      year: null,
      mfnSimpleAverage: null,
      mfnMinRate: null,
      mfnMaxRate: null,
      preferentialSimpleAverage: null,
      indiaFta: null,
      status: 'unavailable',
      source: 'WITS (UNCTAD TRAINS), World Bank',
      sourceUrl: 'https://wits.worldbank.org/',
      retrievedAt: new Date().toISOString(),
    };

    if (!country) {
      return { ...base, note: `No WITS reporter mapping for market code "${countryRaw}".` };
    }
    base.sourceUrl =
      `${WITS_BASE}/reporter/${country.numeric}/partner/${WORLD_NUMERIC}` +
      `/product/${hsCode}/year/all/datatype/reported?format=JSON`;

    const fta = getIndiaFta(country.iso2);
    if (fta) {
      base.indiaFta = {
        ...fta,
        statusLabel: fta.status === 'in_force' ? 'In force' : 'Signed, not yet in force',
      };
    }

    // Find the most recent year with MFN data
    for (const year of YEARS_TO_TRY) {
      let rows: WitsRow[];
      try {
        rows = await fetchWitsRows(country.numeric, WORLD_NUMERIC, hsCode, year);
      } catch (err) {
        logger.warn(`WITS MFN fetch failed for ${country.iso2}/${hsCode}/${year}: ${(err as Error).message}`);
        return {
          ...base,
          note: 'WITS tariff service did not respond in time. Try again shortly.',
        };
      }
      const mfn = rows.find((r) => (r.tariffType ?? 'MFN') === 'MFN') ?? rows[0];
      if (!mfn) continue;

      base.year = year;
      base.mfnSimpleAverage = mfn.simpleAverage;
      base.mfnMinRate = mfn.minRate;
      base.mfnMaxRate = mfn.maxRate;
      base.status = 'ok';

      // Preferential rate granted to India (only worth asking when an FTA exists)
      if (fta && fta.status === 'in_force') {
        try {
          const prefRows = await fetchWitsRows(country.numeric, INDIA_NUMERIC, hsCode, year);
          const pref = prefRows.find((r) => r.tariffType === 'PREF');
          if (pref && pref.simpleAverage !== null) {
            base.preferentialSimpleAverage = pref.simpleAverage;
          }
        } catch (err) {
          logger.warn(`WITS PREF fetch failed for ${country.iso2}/${hsCode}/${year}: ${(err as Error).message}`);
        }
      }

      if (base.preferentialSimpleAverage === null && fta) {
        base.note = `${fta.agreement}: no India-specific preferential rate recorded in WITS for HS ${hsCode} (${year}); the MFN rate applies unless a schedule-specific concession is claimed with a certificate of origin.`;
      }
      return base;
    }

    return {
      ...base,
      status: 'no_data',
      note: `No tariff data in WITS/TRAINS for ${country.name} at HS ${hsCode} in recent years.`,
    };
  },

  /**
   * Attach a `tariff` field to each analysis-result country entry.
   * Runs with limited concurrency; individual failures set tariff to null
   * and never fail the analysis. (The analysis job runs in a background
   * worker, so the extra WITS latency does not block the HTTP request.)
   */
  async enrichCountries<T extends { countryCode?: string; country?: string }>(
    countries: T[],
    hsCode: string,
  ): Promise<void> {
    const queue = [...countries];
    const worker = async () => {
      while (queue.length > 0) {
        const c = queue.shift();
        if (!c) break;
        const code = c.countryCode || c.country;
        if (!code) continue;
        try {
          (c as any).tariff = await this.getTariff(hsCode, code);
        } catch {
          (c as any).tariff = null;
        }
      }
    };
    await Promise.all([worker(), worker()]);
  },
};
