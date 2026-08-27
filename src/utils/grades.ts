/**
 * Grade entry and display.
 *
 * The portal is in Spanish (es-CR), where the decimal separator is a comma:
 * teachers type "7,5", not "7.5". Grades allow one decimal place at most.
 * The API speaks JSON numbers, so everything typed is parsed to a number
 * before it is sent and formatted back to a comma when it is shown.
 *
 * Mirrors `parse_grade` in backend_emmc/api/views_courses/utils.py — a value
 * accepted here is accepted there, and the messages match.
 */

/** Most decimal places a teacher can enter. */
export const GRADE_DECIMAL_PLACES = 1;

/**
 * Shows a grade the way the UI writes numbers: comma decimals, and no
 * trailing ",0" on whole numbers. Returns `fallback` for a missing grade.
 */
export function formatGrade(
  value: number | string | null | undefined,
  fallback = "—",
): string {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.round(numeric * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(".", ",");
}

/**
 * Turns what the teacher typed into a number, accepting either separator.
 * Returns `null` for an empty field (which clears the grade) and `NaN` for
 * something that is not a number at all.
 */
export function parseGradeInput(raw: string): number | null {
  const trimmed = (raw ?? "").trim().replace(",", ".");
  if (trimmed === "") return null;
  return Number(trimmed);
}

/**
 * True while the teacher is mid-typing something that could still become a
 * valid grade — used to decide what the input is allowed to contain, so the
 * field never rejects a keystroke like "7," on the way to "7,5".
 */
export function isPartialGradeInput(raw: string): boolean {
  return /^\d*([.,]\d?)?$/.test(raw ?? "");
}

/**
 * Validates a finished entry against its upper bound.
 *
 * Returns a Spanish message naming what is being graded, or `null` when the
 * value is fine. `label` is a noun phrase with its article, e.g. "la semana 2"
 * or `el recital "Recital 1"`.
 */
export function validateGrade(
  raw: string,
  maximum: number,
  label: string,
): string | null {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return null;

  const value = parseGradeInput(trimmed);
  if (value === null || !Number.isFinite(value)) {
    return `La nota ${de(label)} debe ser un número.`;
  }

  const decimals = trimmed.replace(",", ".").split(".")[1];
  if (decimals && decimals.length > GRADE_DECIMAL_PLACES) {
    return `La nota ${de(label)} solo admite un decimal. Por ejemplo: 7,5.`;
  }

  if (value < 0 || value > maximum) {
    return `La nota ${de(label)} debe estar entre 0 y ${formatGrade(maximum)}.`;
  }

  return null;
}

/** Spanish "de" + article, contracting "de el" into "del". */
function de(label: string): string {
  return label.startsWith("el ") ? `del ${label.slice(3)}` : `de ${label}`;
}
