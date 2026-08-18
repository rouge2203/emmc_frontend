// Edit-mode horario editor: three lines inside the cell so nothing truncates —
// line 1 a full-width Día <select>, line 2 "Inicio" + the drawer's <TimeSelect>,
// line 3 "Fin" + <TimeSelect> — keeping the grid's Excel keyboard model:
//   ↑/↓        change the focused select's value (we step it so macOS Chrome
//              does not open the picker; Alt+↓ / Space still do)
//   ←/→        move focus to the previous/next ENABLED select inside the cell
//   Tab/⇧Tab   move focus within the cell; past the last / before the first,
//              commit + move to the next/previous cell
//   Enter      commit + move down
//   Esc        cancel (revert)
//   digits     hour selects use a two-digit typeahead buffer (1 then 0 → 10);
//              minutes / AM-PM keep native typeahead
//   letters    native typeahead (day code letters, "a"/"p")
// Commit validation (Enter/Tab/blur) reuses validateRange: an invalid, changed
// draft shows an inline red error and stays in edit mode on Enter/Tab; a blur
// with an invalid changed draft cancels with a transient error. An unchanged
// draft cancels (no request). Mouse: a pointer-chosen value commits only once
// the whole draft is complete & valid — otherwise it just updates the draft so
// the user keeps picking; the cell still commits on Enter/Tab/blur. The Fin
// select's AM/PM default keeps fin after inicio (defaultEndPeriod).
//
// The parent unmounts this the moment we commit or cancel, so a doneRef guards
// against a second terminal action (e.g. a blur firing as Enter unmounts us).
import { useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import TimeSelect from "../../TimeSelect";
import { SELECT_CLASS, SelectShell } from "./selectChrome";
import { stepFocusedSelect } from "../selectStep";
import { hourTypeahead } from "../hourTypeahead";
import { defaultEndPeriod, parseApiTime, toApiTime, validateRange } from "../time";
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

const START_HOUR = "Hora de inicio: hora";
const END_HOUR = "Hora de fin: hora";
const isHourSelect = (el: HTMLSelectElement): boolean => {
  const label = el.getAttribute("aria-label");
  return label === START_HOUR || label === END_HOUR;
};

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

  // A nav-mode seed: a day letter pre-selects that día; a digit is fed through
  // the hour typeahead buffer on mount so "1" then "0" builds 10. Either way,
  // focus starts on the start-hour select so the next keystroke flows naturally.
  const seedUpper = seed?.toUpperCase();
  let seedDay = initDay;
  let seedDigit: string | null = null;
  let focusStartHour = false;
  if (seedUpper && (DAY_ORDER as readonly string[]).includes(seedUpper)) {
    seedDay = seedUpper as DayCode;
    focusStartHour = true;
  } else if (seed && /^[0-9]$/.test(seed)) {
    seedDigit = seed;
    focusStartHour = true;
  }

  const [day, setDay] = useState<DayCode | null>(seedDay);
  const [start, setStart] = useState<string | null>(initStart);
  const [end, setEnd] = useState<string | null>(initEnd);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const mouseRef = useRef(viaMouse);
  // Two-digit hour typeahead buffer: which hour select it belongs to, the
  // pending first digit, and the ~1 s timer that expires it.
  const hourBuf = useRef<{
    seg: "start" | "end" | null;
    buffer: string;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ seg: null, buffer: "", timer: null });

  const resetHourBuffer = (): void => {
    if (hourBuf.current.timer) clearTimeout(hourBuf.current.timer);
    hourBuf.current = { seg: null, buffer: "", timer: null };
  };

  const done = (): void => {
    doneRef.current = true;
  };

  const toMinutes = (s: string | null): number | null => (s ? parseApiTime(s) : null);
  const startMinutes = toMinutes(start);
  const changed = (d: DayCode | null, s: string | null, e: string | null): boolean =>
    d !== initDay || s !== initStart || e !== initEnd;
  const validate = (d: DayCode | null, s: string | null, e: string | null) =>
    validateRange({ day: d, start: toMinutes(s), end: toMinutes(e) });

  /** Set an hour select's value and fire change so TimeSelect recomposes. Clears
   *  first so the hour's default AM/PM is recomputed (a completed 10 after an
   *  intermediate 1 is a fresh pick, not "keep the 1 o'clock period"). */
  const setHourValue = (select: HTMLSelectElement, hour: number): void => {
    if (select.value !== "") {
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    select.value = String(hour);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const applyHourDigit = (select: HTMLSelectElement, seg: "start" | "end", digit: string): void => {
    const cur = hourBuf.current.seg === seg ? hourBuf.current.buffer : "";
    const { hour, buffer } = hourTypeahead(cur, digit);
    if (hour !== null) setHourValue(select, hour);
    if (hourBuf.current.timer) clearTimeout(hourBuf.current.timer);
    hourBuf.current = {
      seg,
      buffer,
      timer: buffer ? setTimeout(resetHourBuffer, 1000) : null,
    };
  };

  // Focus the start-hour select after a seed, else the Día select; feed a digit
  // seed through the hour buffer. showPicker on a mouse-opened cell.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const startHour = root.querySelector<HTMLSelectElement>(`select[aria-label="${START_HOUR}"]`);
    const target = focusStartHour ? startHour : root.querySelector<HTMLSelectElement>("select");
    target?.focus({ preventScroll: true });
    if (viaMouse) {
      try {
        target?.showPicker?.();
      } catch {
        /* not supported / not allowed */
      }
    }
    if (seedDigit !== null && startHour) applyHourDigit(startHour, "start", seedDigit);
    return () => resetHourBuffer();
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
        resetHourBuffer();
        e.preventDefault();
        mouseRef.current = false;
        commitFromKey("down");
        return;
      case "Escape":
        resetHourBuffer();
        e.preventDefault();
        cancel();
        return;
      case "Tab": {
        resetHourBuffer();
        e.preventDefault();
        mouseRef.current = false;
        if (!moveFocus(e.shiftKey ? -1 : 1)) {
          commitFromKey(e.shiftKey ? "tabPrev" : "tabNext");
        }
        return;
      }
      case "ArrowLeft":
        resetHourBuffer();
        e.preventDefault();
        mouseRef.current = false;
        moveFocus(-1);
        return;
      case "ArrowRight":
        resetHourBuffer();
        e.preventDefault();
        mouseRef.current = false;
        moveFocus(1);
        return;
      case "ArrowUp":
      case "ArrowDown": {
        resetHourBuffer();
        if (e.altKey) return; // Alt+↓ opens the native picker
        const el = e.target as HTMLElement;
        if (el instanceof HTMLSelectElement) {
          e.preventDefault();
          mouseRef.current = false;
          stepFocusedSelect(el, e.key === "ArrowDown" ? 1 : -1);
        }
        return;
      }
      default: {
        mouseRef.current = false;
        const el = e.target as HTMLElement;
        // Two-digit hour typeahead on the hour selects; everything else (minute
        // digits, "a"/"p", day letters) keeps native typeahead.
        if (
          el instanceof HTMLSelectElement &&
          isHourSelect(el) &&
          /^[0-9]$/.test(e.key) &&
          !e.altKey &&
          !e.ctrlKey &&
          !e.metaKey
        ) {
          e.preventDefault();
          applyHourDigit(el, el.getAttribute("aria-label") === START_HOUR ? "start" : "end", e.key);
          return;
        }
        if (e.key.length === 1) resetHourBuffer(); // any other char ends a pending hour
        return;
      }
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
      className="relative flex min-w-[15rem] flex-col gap-1.5"
    >
      {/* Línea 1: Día, ancho completo de la celda. */}
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

      {/* Línea 2: Inicio. */}
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0 text-xs text-gray-500">Inicio</span>
        <div className="min-w-0 flex-1">
          <TimeSelect ariaLabel="Hora de inicio" value={start} onChange={onStartChange} />
        </div>
      </div>

      {/* Línea 3: Fin (AM/PM default keeps fin > inicio). */}
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0 text-xs text-gray-500">Fin</span>
        <div className="min-w-0 flex-1">
          <TimeSelect
            ariaLabel="Hora de fin"
            value={end}
            onChange={onEndChange}
            defaultPeriodForHour={(hour12) => defaultEndPeriod(hour12, 0, startMinutes)}
          />
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
