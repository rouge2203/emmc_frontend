// Two-digit hour typeahead for the horario editor's hour selects (1–12). The
// browser's native <select> typeahead can't build "10"/"11"/"12" from a
// nav-mode seed (the first digit was applied programmatically, not typed into
// the select), so the editor buffers the first digit for ~1 s and completes it
// here.
//
// Rules:
//  - a fresh 2–9 → that hour immediately (no buffer);
//  - a fresh 1 → hour 1 now, buffer "1" (wait for a 0/1/2 to make 10/11/12);
//  - a fresh 0 → nothing yet, buffer "0" (wait for a 1–9 leading-zero hour);
//  - buffer "1" + 0/1/2 → 10/11/12; buffer "1" + anything else → keep hour 1;
//  - buffer "0" + 1–9 → that hour (01–09); buffer "0" + 0 → nothing.
// The returned `buffer` is "" once nothing more is pending.

export interface HourTypeaheadResult {
  /** The hour to apply now (1–12), or null when nothing valid was entered yet. */
  hour: number | null;
  /** The pending first digit to keep for up to ~1 s ("" when nothing pends). */
  buffer: string;
}

export function hourTypeahead(buffer: string, digit: string): HourTypeaheadResult {
  const n = Number(digit);
  if (!Number.isInteger(n) || n < 0 || n > 9 || digit.length !== 1) {
    return { hour: null, buffer: "" };
  }

  if (buffer === "1") {
    if (n <= 2) return { hour: 10 + n, buffer: "" }; // 10 / 11 / 12
    return { hour: 1, buffer: "" }; // keep the single hour; ignore the second digit
  }
  if (buffer === "0") {
    if (n >= 1) return { hour: n, buffer: "" }; // leading zero → 1–9
    return { hour: null, buffer: "" }; // "00"
  }

  // Fresh first digit.
  if (n >= 2) return { hour: n, buffer: "" };
  if (n === 1) return { hour: 1, buffer: "1" };
  return { hour: null, buffer: "0" }; // n === 0
}
