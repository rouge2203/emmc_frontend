// Edit-mode horario editor: a Día <select> plus the drawer's two <TimeSelect>
// rows (start on line 1, end on line 2), so a horario reads unmistakably as a
// set of selects while keeping the grid's Excel keyboard model:
//   ↑/↓        native value change on the focused select (NOT prevented)
//   ←/→        move focus to the previous/next ENABLED select inside the cell
//   Tab/⇧Tab   move focus within the cell; past the last / before the first,
//              commit + move to the next/previous cell
//   Enter      commit + move down
//   Esc        cancel (revert)
//   digits/letters  native typeahead (day code letters, hours, "a"/"p")
// Commit validation (Enter/Tab/blur) reuses validateRange: an invalid, changed
// draft shows an inline red error and stays in edit mode on Enter/Tab; a blur
// with an invalid changed draft cancels with a transient error. An unchanged
// draft cancels (no request). Mouse: a pointer-chosen value commits only once
// the whole draft is complete & valid — otherwise it just updates the draft so
// the user keeps picking; the cell still commits on Enter/Tab/blur.
//
// The parent unmounts this the moment we commit or cancel, so a doneRef guards
// against a second terminal action (e.g. a blur firing as Enter unmounts us).
import { useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import TimeSelect from "../../TimeSelect";
import { SELECT_CLASS, SelectShell } from "./selectChrome";
import {
  defaultPeriodForHour,
  from12h,
  parseApiTime,
  toApiTime,
  validateRange,
} from "../time";
import { DAY_LABELS, DAY_ORDER } from "../types";
import type { DayCode, MoveDir, TimeRangeValue } from "../types";

export interface TimeRangeSelectsProps {
  initial: { day: DayCode | null; start: number | null; end: number | null } | null;
  seed: string | null;
  viaMouse: boolean;
  onCommit: (value: TimeRangeValue, move: MoveDir) => void;
  onCancel: (move: MoveDir, error?: string) => void;
}

// Leading code letter makes native typeahead work with the codes staff use.
const DAY_OPTIONS = DAY_ORDER.map((code) => ({ value: code, label: `${code} · ${DAY_LABELS[code]}` }));

export default function TimeRangeSelects({
  initial,
  seed,
  viaMouse,
  onCommit,
  onCancel,
}: TimeRangeSelectsProps) {
  const initDay = initial?.day ?? null;
  const initStart = initial && initial.start !== null ? toApiTime(initial.start) : null;
  const initEnd = initial && initial.end !== null ? toApiTime(initial.end) : null;

  // Apply a nav-mode seed: a day letter pre-selects that día, a digit pre-selects
  // that start hour (TimeSelect then defaults minutes/AM-PM). Either way, focus
  // starts on the start-hour select so the next keystroke flows naturally.
  const seedUpper = seed?.toUpperCase();
  let seedDay = initDay;
  let seedStart = initStart;
  let focusStartHour = false;
  if (seedUpper && (DAY_ORDER as readonly string[]).includes(seedUpper)) {
    seedDay = seedUpper as DayCode;
    focusStartHour = true;
  } else if (seed && /[1-9]/.test(seed)) {
    const hour12 = Number(seed);
    seedStart = toApiTime(from12h(hour12, 0, defaultPeriodForHour(hour12)));
    focusStartHour = true;
  }

  const [day, setDay] = useState<DayCode | null>(seedDay);
  const [start, setStart] = useState<string | null>(seedStart);
  const [end, setEnd] = useState<string | null>(initEnd);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const mouseRef = useRef(viaMouse);

  const done = (): void => {
    doneRef.current = true;
  };

  const toMinutes = (s: string | null): number | null => (s ? parseApiTime(s) : null);
  const changed = (d: DayCode | null, s: string | null, e: string | null): boolean =>
    d !== initDay || s !== initStart || e !== initEnd;
  const validate = (d: DayCode | null, s: string | null, e: string | null) =>
    validateRange({ day: d, start: toMinutes(s), end: toMinutes(e) });

  // Focus the start-hour select after a seed, else the Día select. showPicker on
  // a mouse-opened cell so the dropdown drops on the first click.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const target = focusStartHour
      ? root.querySelector<HTMLSelectElement>('select[aria-label="Hora de inicio: hora"]')
      : root.querySelector<HTMLSelectElement>("select");
    target?.focus({ preventScroll: true });
    if (viaMouse) {
      try {
        target?.showPicker?.();
      } catch {
        /* not supported / not allowed */
      }
    }
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitFromKey = (move: MoveDir): void => {
    if (doneRef.current) return;
    if (!changed(day, start, end)) {
      done();
      onCancel(move);
      return;
    }
    const res = validate(day, start, end);
    if (res.ok) {
      done();
      onCommit(res.value, move);
    } else {
      setError(res.error); // stay in edit mode
    }
  };

  const cancel = (): void => {
    if (doneRef.current) return;
    done();
    onCancel("none");
  };

  const commitFromBlur = (): void => {
    if (doneRef.current) return;
    if (!changed(day, start, end)) {
      done();
      onCancel("none");
      return;
    }
    const res = validate(day, start, end);
    done();
    if (res.ok) onCommit(res.value, "none");
    else onCancel("none", `No se guardó: ${res.error}`);
  };

  // A pointer-driven change commits only once the whole draft is complete & valid.
  const maybeMouseCommit = (d: DayCode | null, s: string | null, e: string | null): void => {
    if (!mouseRef.current || doneRef.current) return;
    if (!changed(d, s, e)) return;
    const res = validate(d, s, e);
    if (res.ok) {
      done();
      onCommit(res.value, "none");
    }
  };

  const onDayChange = (v: string): void => {
    const nd = (v || null) as DayCode | null;
    setDay(nd);
    setError(null);
    maybeMouseCommit(nd, start, end);
  };
  const onStartChange = (v: string): void => {
    const ns = v || null;
    setStart(ns);
    setError(null);
    maybeMouseCommit(day, ns, end);
  };
  const onEndChange = (v: string): void => {
    const ne = v || null;
    setEnd(ne);
    setError(null);
    maybeMouseCommit(day, start, ne);
  };

  const enabledSelects = (): HTMLSelectElement[] =>
    Array.from(rootRef.current?.querySelectorAll("select") ?? []).filter((s) => !s.disabled);

  /** Move focus to the previous/next enabled select; returns false at the edge. */
  const moveFocus = (dir: -1 | 1): boolean => {
    const list = enabledSelects();
    const idx = list.indexOf(document.activeElement as HTMLSelectElement);
    if (idx === -1) return false;
    const next = idx + dir;
    if (next < 0 || next >= list.length) return false;
    list[next].focus();
    return true;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        mouseRef.current = false;
        commitFromKey("down");
        return;
      case "Escape":
        e.preventDefault();
        cancel();
        return;
      case "Tab": {
        e.preventDefault();
        mouseRef.current = false;
        if (!moveFocus(e.shiftKey ? -1 : 1)) {
          commitFromKey(e.shiftKey ? "tabPrev" : "tabNext");
        }
        return;
      }
      case "ArrowLeft":
        e.preventDefault();
        mouseRef.current = false;
        moveFocus(-1);
        return;
      case "ArrowRight":
        e.preventDefault();
        mouseRef.current = false;
        moveFocus(1);
        return;
      default:
        // ArrowUp/Down (native value change), digits and letters (native
        // typeahead) all stay keyboard-driven and never auto-commit.
        mouseRef.current = false;
        return;
    }
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>): void => {
    if (doneRef.current) return;
    if (rootRef.current?.contains(e.relatedTarget as Node | null)) return; // focus stayed inside
    const related = e.relatedTarget as HTMLElement | null;
    if (related && related !== document.body && !related.contains(rootRef.current as Node)) {
      setTimeout(commitFromBlur, 0);
    } else {
      commitFromBlur();
    }
  };

  return (
    <div
      ref={rootRef}
      data-editor
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onMouseDown={() => {
        mouseRef.current = true;
      }}
      className="relative flex min-w-[15rem] flex-col gap-1"
    >
      <div className="flex items-center gap-1">
        <div className="w-28 shrink-0">
          <SelectShell>
            <select
              aria-label="Día"
              className={SELECT_CLASS}
              value={day ?? ""}
              onChange={(e) => onDayChange(e.target.value)}
            >
              <option value="">Día</option>
              {DAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </SelectShell>
        </div>
        <div className="min-w-0 flex-1">
          <TimeSelect ariaLabel="Hora de inicio" value={start} onChange={onStartChange} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span aria-hidden="true" className="w-28 shrink-0 pl-2 text-gray-400">
          –
        </span>
        <div className="min-w-0 flex-1">
          <TimeSelect ariaLabel="Hora de fin" value={end} onChange={onEndChange} />
        </div>
      </div>
      {error && (
        <div className="whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[11px] text-red-600 shadow ring-1 ring-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
