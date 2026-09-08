/**
 * Shared text matching for the fleet browser and for search inside a checklist.
 *
 * Both work the same way: every term has to appear somewhere, in any order, so
 * "fuel pump" finds "Fuel boost pump" and "pump fuel" finds it too.
 */

/** Split a query into lower-cased terms. An empty query yields no terms. */
export function searchTerms(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  return trimmed === '' ? [] : trimmed.split(/\s+/);
}

/** True when every term appears in the haystack. No terms matches everything. */
export function matchesAll(haystack: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const lower = haystack.toLowerCase();
  return terms.every((term) => lower.includes(term));
}
