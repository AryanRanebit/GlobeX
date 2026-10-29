/**
 * Parse a hero/global search query into an HS product code when it looks
 * like one. Accepts "6204.62", "620462", "31010091", and chip strings like
 * "6204.62 - Cotton Trousers" (label preserved for display).
 * Returns { hs, label } or null when the query is plain text.
 */
export function parseHsQuery(query) {
  if (!query) return null;
  const trimmed = query.trim();
  const parts = trimmed.split(/\s+-\s+/);
  const candidate = parts[0].trim();
  if (!/^[\d.\s]+$/.test(candidate)) return null;
  const digits = candidate.replace(/\D/g, '');
  if (digits.length < 4 || digits.length > 8) return null;
  const label = parts.length > 1 && parts[1].trim() ? parts[1].trim() : null;
  return { hs: digits, label };
}
