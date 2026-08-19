// Edit-mode horario card for the schedule grid: Día + Aula + X on row 1,
// compact inicio/fin clocks on row 2. Same Excel keyboard model as the old
// TimeRangeSelects (arrows step the focused select, Tab/Enter commit, Esc
// cancels). Day + hora inicio is enough to save; picking an inicio hour
// auto-fills fin +40 min. Aula stays disabled until those two are set.
import { useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { NativeSelect } from "../../drawers/CompactSelect";
import HorarioTimeRange from "../../drawers/HorarioTimeRange";
import { DAY_OPTIONS } from "../../drawers/HorarioItemCard";
import {
  aulaEnabled,
  keepEditorFocusOnDisabledControl,
  schoolHour24FromTypeahead,
} from "../../drawers/horarioTime";
import { stepFocusedSelect } from "../selectStep";
import { hourTypeahead } from "../hourTypeahead";
import { parseApiTime, toApiTime, validateRange } from "../time";
import { DAY_ORDER } from "../types";
import type { Classroom, DayCode, MoveDir, TimeRangeValue } from "../types";
import {
  findHorarioTargetSelect,
  resolveHorarioEditorTarget,
  type HorarioEditorTarget,
} from "../horarioEditorTarget";

export interface HorarioSlotEditorProps {
  initial: {
    day: DayCode | null;
    start: number | null;
    end: number | null;
    classroomId: number | null;
  } | null;
  classrooms: Classroom[];
  seed: string | null;
  requestedTarget: HorarioEditorTarget;
  canDelete: boolean;
  onCommitTime: (value: TimeRangeValue, move: MoveDir) => void;
  onCommitAula: (classroomId: number | null, move: MoveDir) => void;
  onCancel: (move: MoveDir, error?: string) => void;
  onRequestDelete: () => void;
}

const START_HOUR = "Hora de inicio: hora";
const END_HOUR = "Hora de fin: hora";
const isHourSelect = (el: HTMLSelectElement): boolean => {
  const label = el.getAttribute("aria-label");
  return label === START_HOUR || label === END_HOUR;
};

export default function HorarioSlotEditor({
  initial,
  classrooms,
  seed,
  requestedTarget,
  canDelete,
  onCommitTime,
  onCommitAula,
  onCancel,
  onRequestDelete,
}: HorarioSlotEditorProps) {
  const initDay = initial?.day ?? null;
  const initStart = initial && initial.start !== null ? toApiTime(initial.start) : null;
  const initEnd = initial && initial.end !== null ? toApiTime(initial.end) : null;
  const initClassroom = initial?.classroomId ?? null;

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
  const [classroomId, setClassroomId] = useState<number | null>(initClassroom);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
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
  const timeChanged = (d: DayCode | null, s: string | null, e: string | null): boolean =>
    d !== initDay || s !== initStart || e !== initEnd;
  const aulaChanged = classroomId !== initClassroom;
  const validate = (d: DayCode | null, s: string | null, e: string | null) =>
    validateRange({ day: d, start: toMinutes(s), end: toMinutes(e) });

  const setHourValue = (select: HTMLSelectElement, hour24: number): void => {
    if (select.value !== "") {
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    select.value = String(hour24);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const applyHourDigit = (select: HTMLSelectElement, seg: "start" | "end", digit: string): void => {
    const cur = hourBuf.current.seg === seg ? hourBuf.current.buffer : "";
    const { hour, buffer } = hourTypeahead(cur, digit);
    if (hour !== null) {
      const hour24 = schoolHour24FromTypeahead(hour);
      if (hour24 !== null) setHourValue(select, hour24);
    }
    if (hourBuf.current.timer) clearTimeout(hourBuf.current.timer);
    hourBuf.current = {
      seg,
      buffer,
      timer: buffer ? setTimeout(resetHourBuffer, 1000) : null,
    };
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const startHour = root.querySelector<HTMLSelectElement>(`select[aria-label="${START_HOUR}"]`);
    const resolvedTarget = focusStartHour
      ? "start"
      : resolveHorarioEditorTarget(initDay, requestedTarget);
    findHorarioTargetSelect(root, resolvedTarget)?.focus({ preventScroll: true });
    if (seedDigit !== null && startHour) applyHourDigit(startHour, "start", seedDigit);
    return () => resetHourBuffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (move: MoveDir, fromBlur: boolean): void => {
    if (doneRef.current) return;
    const tChanged = timeChanged(day, start, end);
    if (!tChanged && !aulaChanged) {
      done();
      onCancel(move);
      return;
    }
    if (tChanged) {
      const res = validate(day, start, end);
      if (!res.ok) {
        if (fromBlur) {
          done();
          onCancel("none", `No se guardó: ${res.error}`);
        } else {
          setError(res.error);
        }
        return;
      }
      done();
      onCommitTime(res.value, aulaChanged ? "none" : move);
      if (aulaChanged) onCommitAula(classroomId, move);
      return;
    }
    done();
    onCommitAula(classroomId, move);
  };

  const enabledSelects = (): HTMLSelectElement[] =>
    Array.from(rootRef.current?.querySelectorAll("select") ?? []).filter((s) => !s.disabled);

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
        finish("down", false);
        return;
      case "Escape":
        resetHourBuffer();
        e.preventDefault();
        if (doneRef.current) return;
        done();
        onCancel("none");
        return;
      case "Tab": {
        resetHourBuffer();
        e.preventDefault();
        if (!moveFocus(e.shiftKey ? -1 : 1)) finish(e.shiftKey ? "tabPrev" : "tabNext", false);
        return;
      }
      case "ArrowLeft":
        resetHourBuffer();
        e.preventDefault();
        moveFocus(-1);
        return;
      case "ArrowRight":
        resetHourBuffer();
        e.preventDefault();
        moveFocus(1);
        return;
      case "ArrowUp":
      case "ArrowDown": {
        resetHourBuffer();
        if (e.altKey) return;
        const el = e.target as HTMLElement;
        if (el instanceof HTMLSelectElement) {
          e.preventDefault();
          stepFocusedSelect(el, e.key === "ArrowDown" ? 1 : -1);
        }
        return;
      }
      default: {
        const el = e.target as HTMLElement;
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
        if (e.key.length === 1) resetHourBuffer();
        return;
      }
    }
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>): void => {
    if (doneRef.current) return;
    if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
    const related = e.relatedTarget as HTMLElement | null;
    if (related && related !== document.body && !related.contains(rootRef.current as Node)) {
      setTimeout(() => finish("none", true), 0);
    } else {
      finish("none", true);
    }
  };

  const aulaOn = aulaEnabled(day ?? "", start);
  const focusStartHourControl = (): void => {
    rootRef.current
      ?.querySelector<HTMLSelectElement>(`select[aria-label="${START_HOUR}"]`)
      ?.focus({ preventScroll: true });
  };

  // Día comes first: the hours are meaningless without it, and a range typed
  // against no day would only fail validation on the way out. Reaching for a
  // clock before picking a day opens the Día list instead of that clock's.
  const openDayPicker = (): void => {
    const dia = rootRef.current?.querySelector<HTMLSelectElement>('select[aria-label="Día"]');
    if (!dia) return;
    dia.focus({ preventScroll: true });
    try {
      dia.showPicker?.();
    } catch {
      // Unsupported or blocked — the Día select is still focused.
    }
  };
  const requireDayFirst = (e: MouseEvent): void => {
    if (day !== null) return;
    if (!(e.target as HTMLElement).closest("select, button")) return;
    e.preventDefault();
    openDayPicker();
  };
  const stopDeleteBubble = (e: MouseEvent): void => {
    e.stopPropagation();
  };

  return (
    <div
      ref={rootRef}
      data-editor
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="relative"
    >
      <div className="flex items-center gap-2">
        <div className="w-28 shrink-0">
          <NativeSelect
            aria-label="Día"
            value={day ?? ""}
            onChange={(e) => {
              setDay((e.target.value || null) as DayCode | null);
              setError(null);
            }}
          >
            <option value="">Día</option>
            {DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="relative min-w-0 flex-1">
          <NativeSelect
            aria-label="Aula"
            value={classroomId ?? ""}
            disabled={!aulaOn}
            onChange={(e) => setClassroomId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Aula #</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </NativeSelect>
          {keepEditorFocusOnDisabledControl(aulaOn) && (
            <span
              aria-hidden="true"
              className="absolute inset-0 z-10 cursor-not-allowed rounded-md"
              onMouseDown={(e) => e.preventDefault()}
              onClick={focusStartHourControl}
            />
          )}
        </div>
        {canDelete && (
          <button
            type="button"
            title="Eliminar horario"
            onMouseDown={stopDeleteBubble}
            onClick={(e) => {
              e.stopPropagation();
              if (doneRef.current) return;
              done();
              onRequestDelete();
            }}
            className="shrink-0 rounded-full p-1 text-gray-400 ring-1 ring-inset ring-gray-300 hover:text-red-600 hover:ring-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="sr-only">Eliminar horario</span>
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-2" onMouseDownCapture={requireDayFirst}>
        <HorarioTimeRange
          start={start}
          end={end}
          onStartChange={(next, autoEnd) => {
            setStart(next || null);
            if (autoEnd !== undefined) setEnd(autoEnd);
            setError(null);
          }}
          onEndChange={(next) => {
            setEnd(next || null);
            setError(null);
          }}
        />
      </div>
      {error && (
        <div className="mt-1 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[11px] text-red-600 shadow ring-1 ring-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
