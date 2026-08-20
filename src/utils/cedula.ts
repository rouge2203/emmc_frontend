/**
 * Cédula normalization utilities.
 *
 * Mirrors the backend's normalization exactly, so a value considered valid
 * (or equal) on the frontend is treated the same way once it reaches the
 * API.
 */

/**
 * Strips all whitespace and dashes (hyphen) from a raw cédula string.
 *
 * `raw` is typed as `string`, but this is defensive against null/undefined
 * sneaking in at runtime (e.g. an uncontrolled form field) — it never
 * throws, it just returns an empty string.
 */
export function normalizeCedula(raw: string): string {
  if (raw == null) return "";
  return raw.replace(/[\s-]/g, "");
}

/**
 * True when the normalized value is all digits and has length >= 9.
 *
 * Costa Rican cédula is 9 digits; DIMEX (foreign resident ID) is 11-12, so
 * this intentionally has no upper bound.
 */
export function isValidCedula(raw: string): boolean {
  const normalized = normalizeCedula(raw);
  return /^\d{9,}$/.test(normalized);
}
