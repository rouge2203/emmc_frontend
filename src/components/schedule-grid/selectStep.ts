// Cross-OS ArrowUp/ArrowDown stepping for the grid's native <select> editors.
// macOS Chrome opens the native picker on ↑/↓ for a *closed* <select> instead of
// cycling the value; the editors intercept the key and move the selection here
// so the keyboard model ("↑/↓ change the value of the select") behaves the same
// on every OS. Commit still happens only on Enter/Tab/blur — this just updates
// the draft, exactly like a user keyboard change.

/**
 * Next selectable index for an ArrowUp/ArrowDown on a native <select>. Steps by
 * `delta`, skipping disabled options and clamping at the ends. When nothing is
 * selected yet (`current < 0`) either direction lands on the first enabled
 * option. Returns `current` when there is nowhere to move.
 */
export function stepSelectIndex(current: number, delta: -1 | 1, disabled: boolean[]): number {
  const n = disabled.length;
  if (n === 0) return current;
  const firstEnabled = disabled.findIndex((d) => !d);
  if (firstEnabled === -1) return current; // every option disabled
  if (current < 0) return firstEnabled; // nothing selected yet → first real option
  for (let next = current + delta; next >= 0 && next < n; next += delta) {
    if (!disabled[next]) return next; // nearest enabled option in this direction
  }
  return current; // clamped: no enabled option that way
}

/**
 * Apply an ArrowUp/ArrowDown step to a focused native <select> and fire its
 * change handler exactly as a user keyboard change would (React's onChange runs
 * off the dispatched native `change`, so a controlled select — ours, or the
 * drawer's TimeSelect — updates the same way it does on Windows/Linux). Returns
 * true when the selection actually moved.
 */
export function stepFocusedSelect(select: HTMLSelectElement, delta: -1 | 1): boolean {
  const disabled = Array.from(select.options, (o) => o.disabled);
  const next = stepSelectIndex(select.selectedIndex, delta, disabled);
  if (next < 0 || next === select.selectedIndex) return false;
  select.selectedIndex = next;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
