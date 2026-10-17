/**
 * Strict boolean coercion helper.
 * Safely converts serialized or dynamically typed inputs into booleans.
 *
 * Rules:
 * - true / 1 / "true" / "TRUE" / "1" -> true
 * - false / 0 / "false" / "FALSE" / "0" / null / undefined -> false
 * - boolean primitives -> returned directly
 */
export function toBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0 && !isNaN(val);
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1') return true;
    if (trimmed === 'false' || trimmed === '0' || trimmed === '') return false;
  }
  return Boolean(val);
}
