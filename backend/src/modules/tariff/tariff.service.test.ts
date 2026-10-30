import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { tariffService, parseWitsSdmx, normalizeHsCode } from './tariff.service';

const originalFetch = global.fetch;
const fetchMock = vi.fn();

/** Real-shaped WITS SDMX-JSON payload (Saudi Arabia, HS 100630, 2022). */
function sdmxPayload(rate: number, tariffType: 'MFN' | 'PREF', year = '2022') {
  return {
    header: { id: 'DF_WITS_Tariff_TRAINS' },
    dataSets: [
      {
        action: 'Information',
        attributes: [0],
        series: {
          '0:0:0:0:0': {
            attributes: [],
            observations: { '0': [rate, 0, null, tariffType === 'MFN' ? 0 : 1, 0, 0, 0, 0, 0, 0, 0, 0] },
          },
        },
      },
    ],
    structure: {
      dimensions: {
        dataset: [],
        series: [
          { id: 'FREQ', values: [{ id: 'A' }] },
          { id: 'REPORTER', values: [{ id: '682' }] },
          { id: 'PARTNER', values: [{ id: '000' }] },
          { id: 'PRODUCTCODE', values: [{ id: '100630' }] },
          { id: 'DATATYPE', values: [{ id: 'Reported' }] },
        ],
        observation: [{ id: 'TIME_PERIOD', values: [{ id: year, name: year }] }],
      },
      attributes: {
        dataset: [{ id: 'DATASOURCE', values: [{ id: 'TRN' }] }],
        series: [],
        observation: [
          { id: 'NOMENCODE', values: [{ id: 'H6' }] },
          { id: 'EXCLUDEDFROM', values: [] },
          { id: 'TARIFFTYPE', values: [{ id: 'MFN' }, { id: 'PREF' }] },
          { id: 'SUM_OF_RATES', values: [{ id: '0' }] },
          { id: 'MIN_RATE', values: [{ id: '0' }] },
          { id: 'MAX_RATE', values: [{ id: '15' }] },
          { id: 'TOTALNOOFLINES', values: [{ id: '1' }] },
          { id: 'NBR_PREF_LINES', values: [{ id: '0' }] },
          { id: 'NBR_MFN_LINES', values: [{ id: '1' }] },
          { id: 'NBR_NA_LINES', values: [{ id: '0' }] },
          { id: 'OBS_VALUE_MEASURE', values: [{ id: 'SimpleAverage' }] },
        ],
      },
    },
  };
}

const emptyPayload = {
  dataSets: [{ action: 'Information', attributes: [0], series: {} }],
  structure: { dimensions: { observation: [{ id: 'TIME_PERIOD', values: [] }] }, attributes: { observation: [] } },
};

describe('normalizeHsCode', () => {
  it('strips dots and truncates to 6 digits', () => {
    expect(normalizeHsCode('1006.30')).toBe('100630');
    expect(normalizeHsCode('0901.21.00')).toBe('090121');
    expect(normalizeHsCode('62')).toBe('62');
    expect(normalizeHsCode(null)).toBeNull();
  });
});

describe('parseWitsSdmx', () => {
  it('extracts the simple-average MFN rate and attributes', () => {
    const rows = parseWitsSdmx(sdmxPayload(5, 'MFN'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      year: 2022,
      tariffType: 'MFN',
      simpleAverage: 5,
      minRate: 0,
      maxRate: 15,
      numLines: 1,
    });
  });

  it('returns no rows for an empty dataset', () => {
    expect(parseWitsSdmx(emptyPayload)).toHaveLength(0);
  });
});

describe('tariffService.getTariff', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns MFN + India-preferential rates for an FTA partner (UAE)', async () => {
    // 2023 empty, 2022 MFN 5%, then PREF 0% for India
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => emptyPayload }) // 2023 MFN
      .mockResolvedValueOnce({ ok: true, json: async () => sdmxPayload(5, 'MFN') }) // 2022 MFN
      .mockResolvedValueOnce({ ok: true, json: async () => sdmxPayload(0, 'PREF') }); // 2022 PREF

    const info = await tariffService.getTariff('1006.30', 'AE');
    expect(info.status).toBe('ok');
    expect(info.year).toBe(2022);
    expect(info.mfnSimpleAverage).toBe(5);
    expect(info.preferentialSimpleAverage).toBe(0);
    expect(info.indiaFta?.agreement).toContain('CEPA');
    expect(info.source).toContain('WITS');
  });

  it('skips the preferential lookup for non-FTA markets (US)', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => sdmxPayload(11.2, 'MFN', '2023') });

    const info = await tariffService.getTariff('100630', 'US');
    expect(info.status).toBe('ok');
    expect(info.mfnSimpleAverage).toBe(11.2);
    expect(info.preferentialSimpleAverage).toBeNull();
    expect(info.indiaFta).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable for an unmapped market code', async () => {
    const info = await tariffService.getTariff('100630', 'XX');
    expect(info.status).toBe('unavailable');
    expect(info.note).toMatch(/mapping/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports unavailable (never throws) when WITS fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const info = await tariffService.getTariff('100630', 'SA');
    expect(info.status).toBe('unavailable');
    expect(info.note).toMatch(/did not respond/i);
  });
});
