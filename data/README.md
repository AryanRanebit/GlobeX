# UN Comtrade 2025 Merchandise Export Datasets for India

This folder contains merchandise export statistics reported by India (reporter code `699`) for calendar year 2025, extracted from the United Nations Statistics Division (UNSD) UN Comtrade API.

## Source & Provenance

- **Source:** UN Comtrade Database (United Nations Statistics Division)
- **Reporter:** India (ISO: `IND`, numeric code: `699`)
- **Period:** Calendar year `2025` (Annual)
- **Flow:** `X` (Exports)
- **Trade System:** Harmonized System 2022 (H6)
- **Citation:** Source: UN Comtrade, United Nations Statistics Division (UNSD), India merchandise exports, calendar year 2025, HS 2022. https://comtradeplus.un.org/

---

## Files

1. **`india_exports_total_by_partner_2025.csv`**:
   - 224 records (World aggregate + 223 destination countries/territories)
   - Total exports of all goods from India: **$445,769,600,047.19 USD** (~$445.77B)
   - Top markets: USA ($92.57B), UAE ($38.67B), Netherlands ($19.06B)

2. **`india_exports_hs62_by_partner_2025.csv`**:
   - 197 records (World aggregate + 196 destination countries/territories)
   - Chapter 62: *Apparel and clothing accessories; not knitted or crocheted*
   - Total apparel exports from India: **$8,392,174,046.02 USD** (~$8.39B)
   - Top destinations: USA ($2.67B), United Kingdom ($793.5M), UAE ($628.6M), Spain ($469.6M), Germany ($376.2M)

3. **`update_comtrade.py`**:
   - Automated, reproducible extractor script for querying UN Comtrade API v1 with API key support.

---

## CSV Column Specifications

Both CSV files share the following standardized schema:

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `period` | String | Calendar Year | `"2025"` |
| `reporterCode` | Integer | Reporting country numeric code | `699` (India) |
| `reporterISO` | String | Reporting country ISO-3 | `"IND"` |
| `reporterDesc` | String | Reporting country name | `"India"` |
| `flowCode` | String | Trade flow indicator | `"X"` (Exports) |
| `flowDesc` | String | Trade flow description | `"Export"` |
| `partnerCode` | Integer | Partner country numeric code | `842` (USA), `0` (World) |
| `partnerISO` | String | Partner ISO-3 code | `"USA"` |
| `partnerDesc` | String | Partner country name | `"USA"`, `"World"` |
| `cmdCode` | String | Commodity code | `"62"`, `"TOTAL"` |
| `cmdDesc` | String | Commodity description | `"Apparel..."` |
| `primaryValue` | Float | Primary trade value in USD | `2671153548.12` |
| `netWgt` | Float | Net weight in kilograms | `0.0` or weight |
| `qty` | Float | Quantity exported | `0.0` or quantity |
| `qtyUnitCode` | Integer | Quantity unit code | `-1` or standard code |
| `qtyUnitAbbr` | String | Quantity unit abbreviation | `"N/A"`, `"kg"` |

---

## Critical Data Semantics Contract

- **India-reported exports ≠ Destination market size:**
  The figures in these CSVs represent what India exported to each destination.
  They do NOT represent that destination's total global imports (market size).
- **Market Size Contract:**
  Market size for destination *D* must be sourced from *D*'s imports from World (`reporter = D`, `partner = 0`, `flow = M`).
- **India's Share Contract:**
  $\text{India's share} = \frac{\text{Destination } D\text{'s imports from India}}{\text{Destination } D\text{'s imports from World}}$.
  If destination-reported import data is not available in free data or cache, the system must show **"Not available from free data"** — never substitute India's export figure as market size.
