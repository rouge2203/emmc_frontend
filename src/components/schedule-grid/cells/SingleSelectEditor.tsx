// Edit-mode native <select> shared by the professor and aula cells. It keeps the
// grid's Excel keyboard model working with a real, unmistakable select:
//   ↑/↓        native value change (NOT prevented) — does not commit
//   letters    native typeahead (NOT prevented)     — does not commit
//   Enter      commit + move down
//   Tab/⇧Tab   commit + move to the next/previous cell
//   Esc        cancel (revert)
//   blur       commit the current value
// A value equal to the current one commits as a cancel (no request). Mouse: a
// value chosen with the pointer commits immediately; keyboard value changes wait
// for Enter/Tab/blur. "Opened by mouse" is tracked with a ref (set on the
// select's mousedown, and seeded true when the cell was opened by a click so the
// showPicker-opened dropdown's first pick still commits); the first keystroke
// flips it back to keyboard mode.
//
// The parent unmounts this the moment we commit or cancel, so a doneRef guards
// against a second terminal action (e.g. the select's blur firing as Enter
// unmounts us).
import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { SELECT_CLASS, SelectShell } from "./selectChrome";
import { stepFocusedSelect } from "../selectStep";
import type { MoveDir } from "../types";

export interface SelectOption {
  /** "" is the "none" option (Sin profesor / Aula). */
  value: string;
  label: string;
}

export interface SingleSelectEditorProps {
  options: SelectOption[];
  /** The current committed value ("" or an id as a string). */
  current: string;
  /** First typed char (Excel replace-typing) → jump to the first option whose label starts with it. */
  seed: string | null;
  /** Opened by a mouse click → focus + showPicker + start in mouse-commit mode. */
  viaMouse: boolean;
  ariaLabel: string;
  onCommit: (value: string, move: MoveDir) => void;
  onCancel: (move: MoveDir) => void;
}

/** First option (excluding the "none" value) whose label starts with the seed char, case-insensitively. */
const seedValue = (options: SelectOption[], seed: string | null, current: string): string => {
  if (seed === null) return current;
  const s = seed.toLowerCase();
  const match = options.find((o) => o.value !== "" && o.label.toLowerCase().startsWith(s));
  return match ? match.value : current;
};

export default function SingleSelectEditor({
  options,
  current,
  seed,
  viaMouse,
  ariaLabel,
  onCommit,
  onCancel,
}: SingleSelectEditorProps) {
  const [value, setValue] = useState<string>(() => seedValue(options, seed, current));
  const rootRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const doneRef = useRef(false);
  // Mouse mode: a value chosen with the pointer commits immediately. Seeded from
  // viaMouse so a dropdown opened by showPicker still commits its first pick; any
  // keystroke flips it back to keyboard mode.
  const mouseRef = useRef(viaMouse);

  useEffect(() => {
    const select = selectRef.current;
    if (!select) return;
    select.focus({ preventScroll: true });
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (next: string, move: MoveDir): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (next === current) onCancel(move);
    else onCommit(next, move);
  };

  const cancel = (move: MoveDir): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel(move);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLSelectElement>): void => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        commit(value, "down");
        return;
      case "Tab":
        e.preventDefault();
        commit(value, e.shiftKey ? "tabPrev" : "tabNext");
        return;
      case "Escape":
        e.preventDefault();
        cancel("none");
        return;
      case "ArrowUp":
      case "ArrowDown":
        // Step the value ourselves so macOS Chrome does not open the picker
        // (Alt+↓ / Space still do). Fires change() → keyboard mode, no commit.
        if (e.altKey) return;
        e.preventDefault();
        mouseRef.current = false;
        stepFocusedSelect(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
        return;
      default:
        // Letters / digits: native typeahead. Switch to keyboard mode so the
        // resulting change() does not auto-commit.
        mouseRef.current = false;
        return;
    }
  };

  const handleChange = (next: string): void => {
    setValue(next);
    if (mouseRef.current) commit(next, "none");
  };

  const handleBlur = (e: FocusEvent<HTMLSelectElement>): void => {
    if (doneRef.current) return;
    const related = e.relatedTarget as HTMLElement | null;
    const run = (): void => commit(value, "none");
    // Defer the commit ONLY when focus leaves to a control outside the grid
    // subtree (search box, Notify button): the editor's synchronous unmount
    // would otherwise reparent focus back into the grid and steal it. A blur
    // that lands on the grid container itself (clicking another cell) commits
    // immediately so the click that follows can open the next cell's editor.
    if (related && related !== document.body && !related.contains(rootRef.current as Node)) {
      setTimeout(run, 0);
    } else {
      run();
    }
  };

  const renderedOptions = useMemo(
    () =>
      options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      )),
    [options],
  );

  return (
    <div ref={rootRef} data-editor>
      <SelectShell>
        <select
          ref={selectRef}
          aria-label={ariaLabel}
          className={SELECT_CLASS}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onMouseDown={() => {
            mouseRef.current = true;
          }}
          onBlur={handleBlur}
        >
          {renderedOptions}
        </select>
      </SelectShell>
    </div>
  );
}
