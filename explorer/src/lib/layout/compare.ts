/**
 * Deterministic string comparison helpers for graph geometry and layout decisions.
 * Guarantees identical sorting order across environments, independent of system locale.
 */

/**
 * Null-safe, locale-independent stable string comparator.
 * Compares two strings using code-point comparison (<, >).
 */
export function stableCompareStrings(a?: string | null, b?: string | null): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return a < b ? -1 : 1;
}

/**
 * Helper to compare objects by string property deterministically.
 */
export function stableCompareByProperty<T>(
  a: T,
  b: T,
  getter: (item: T) => string | null | undefined
): number {
  return stableCompareStrings(getter(a), getter(b));
}
