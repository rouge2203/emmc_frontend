// Pure decision for what a combobox editor (ProfessorEditor / AulaEditor) should
// do when the user presses Enter or Tab. Shared by BOTH editors so they treat a
// plain Enter on an unchanged value as a no-op cancel (no request), an emptied
// field as an explicit clear, and an arrow-navigated highlight as a selection.
//
// Kept React-free so the rules are unit-tested directly (comboboxCommit.test.ts).

export interface ComboboxCommitInput<Option> {
  /** The current input text. */
  text: string;
  /**
   * The value the field was prefilled with when it opened (the current
   * professor's name / the current aula's number), or null when the cell had no
   * value. Used to recognise an untouched field so Enter re-commits it as a
   * cancel instead of clearing or picking the top match.
   */
  prefill: string | null;
  /** Whether the user moved the highlight with ArrowUp/ArrowDown since opening/typing. */
  highlightMoved: boolean;
  /** The currently filtered options. */
  options: Option[];
  /** The highlighted index into `options`. */
  highlight: number;
}

export type ComboboxCommit<Option> =
  | { kind: "cancel" }
  | { kind: "clear" }
  | { kind: "select"; option: Option };

/**
 * Decide the outcome of an Enter/Tab commit, or `null` when nothing should
 * happen (a non-empty query that matches no option — the editor stays open so
 * Enter is a dead-end while "Sin resultados" is shown; the caller handles Tab).
 *
 * Precedence:
 *  1. an arrow-navigated highlight → select that option, even if the text is
 *     empty (the user deliberately picked a row);
 *  2. otherwise, emptied text → clear the value (the user deleted the prefill);
 *  3. otherwise, text still equal to the prefill → cancel (re-commit the same
 *     value, i.e. no request);
 *  4. otherwise → select the highlighted option, or `null` when the query
 *     matches nothing.
 */
export function resolveComboboxCommit<Option>({
  text,
  prefill,
  highlightMoved,
  options,
  highlight,
}: ComboboxCommitInput<Option>): ComboboxCommit<Option> | null {
  const trimmed = text.trim();

  if (highlightMoved) {
    const option = options[highlight];
    if (option !== undefined) return { kind: "select", option };
    // Nothing to select (empty list) → fall through to the text-based rules.
  }

  if (trimmed === "") return { kind: "clear" };

  if (prefill !== null && trimmed === prefill.trim()) return { kind: "cancel" };

  const option = options[highlight];
  if (option !== undefined) return { kind: "select", option };

  return null; // non-empty query, no match → stay (Enter dead-end)
}
