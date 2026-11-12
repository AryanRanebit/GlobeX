/**
 * Parse a hero/global search query into an HS product code when one appears
 * in it. Accepts "6204.62", "620462", "31010091", mixed queries like
 * "100630 rice" (extra words are ignored for the code lookup), and chip
 * strings like "6204.62 - Cotton Trousers" (label preserved for display).
 * Returns { hs, label } or null when the query has no HS-like number.
 */
export function parseHsQuery(query) {
  if (!query) return null;
  const trimmed = query.trim();
  const parts = trimmed.split(/\s+-\s+/);
  const candidate = parts[0].trim();
  // First run of digits and dots is the code candidate, so both "6204.62"
  // and "100630 rice" find their code.
  const m = candidate.match(/\d[\d.]*/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, '');
  if (digits.length < 4 || digits.length > 8) return null;
  const chipLabel = parts.length > 1 && parts[1].trim() ? parts[1].trim() : null;
  const trailingWords = candidate.slice(m.index + m[0].length).trim();
  return { hs: digits, label: chipLabel || trailingWords || null };
}
