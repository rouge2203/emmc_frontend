// Compact inicio/fin picker for a horario card. Hour options are 7am–9pm with
// the meridiem in the option label; a clickable "am"/"pm" beside an already-set
// time opens that hour <select>. Picking an inicio hour auto-suggests fin +40
// min (parent applies it). Fin's hour list hides hours before inicio.
import { useRef, type RefObject } from "react";
import { NativeSelect } from "./CompactSelect";
import {
  DEFAULT_DURATION_MINUTES,
  MINUTE_OPTIONS,
  SCHOOL_HOUR24,
  addMinutes,
  composeHourMinute,
  endHourOptions,
  formatHourLabel,
  parseHourMinute,
  periodOf,
} from "./horarioTime";

export interface HorarioTimeRangeProps {
  start: string | null;
  end: string | null;
  disabled?: boolean;
  onStartChange: (start: string, autoEnd?: string | null) => void;
  onEndChange: (end: string) => void;
}

const withExtraHour = (hours: readonly number[], extra: number | undefined): number[] => {
  if (extra === undefined || hours.includes(extra)) return [...hours];
  return [...hours, extra].sort((a, b) => a - b);
};

const withExtraMinute = (minutes: readonly number[], extra: number | undefined): number[] => {
  if (extra === undefined || minutes.includes(extra)) return [...minutes];
  return [...minutes, extra].sort((a, b) => a - b);
};

const openPicker = (el: HTMLSelectElement | null): void => {
  if (!el || el.disabled) return;
  el.focus();
  try {
    el.showPicker?.();
  } catch {
    /* not supported / not allowed */
  }
};

function HourMinuteGroup({
  ariaLabel,
  hour24,
  minute,
  hours,
  minutes,
  disabled,
  hourRef,
  onHourChange,
  onMinuteChange,
}: {
  ariaLabel: string;
  hour24: number | null;
  minute: number | null;
  hours: number[];
  minutes: number[];
  disabled: boolean;
  hourRef: RefObject<HTMLSelectElement | null>;
  onHourChange: (raw: string) => void;
  onMinuteChange: (raw: string) => void;
}) {
  const hasHour = hour24 !== null;
  const minuteDisabled = disabled || !hasHour;
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={ariaLabel}>
      <div className="w-20 shrink-0">
        <NativeSelect
          ref={hourRef}
          selectSize="time"
          aria-label={`${ariaLabel}: hora`}
          value={hour24 !== null ? String(hour24) : ""}
          disabled={disabled}
          onChange={(e) => onHourChange(e.target.value)}
        >
          <option value="">hh</option>
          {hours.map((h) => (
            <option key={h} value={h}>
              {formatHourLabel(h)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <span className="text-sm font-medium text-gray-500" aria-hidden="true">
        :
      </span>
      <div className="w-16 shrink-0">
        <NativeSelect
          selectSize="time"
          aria-label={`${ariaLabel}: minutos`}
          value={hasHour && minute !== null ? String(minute) : ""}
          disabled={minuteDisabled}
          onChange={(e) => onMinuteChange(e.target.value)}
        >
          <option value="">mm</option>
          {minutes.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </NativeSelect>
      </div>
      <button
        type="button"
        disabled={!hasHour || disabled}
        onClick={() => openPicker(hourRef.current)}
        aria-label={`${ariaLabel}: ${hasHour ? periodOf(hour24) : "am o pm"}`}
        className="w-7 shrink-0 px-0.5 text-left text-sm text-gray-700 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
      >
        {hasHour ? periodOf(hour24) : "am"}
      </button>
    </div>
  );
}

export default function HorarioTimeRange({
  start,
  end,
  disabled = false,
  onStartChange,
  onEndChange,
}: HorarioTimeRangeProps) {
  const startHourRef = useRef<HTMLSelectElement>(null);
  const endHourRef = useRef<HTMLSelectElement>(null);
  const startParts = parseHourMinute(start);
  const endParts = parseHourMinute(end);

  const startHours = withExtraHour(SCHOOL_HOUR24, startParts?.hour24);
  const startMinutes = withExtraMinute(MINUTE_OPTIONS, startParts?.minute);
  const endHours = withExtraHour(
    endHourOptions(startParts?.hour24 ?? null),
    endParts?.hour24,
  );
  const endMinutes = withExtraMinute(MINUTE_OPTIONS, endParts?.minute);

  const handleStartHour = (raw: string): void => {
    if (!raw) {
      onStartChange("", null);
      return;
    }
    const hour24 = parseInt(raw, 10);
    const minute = startParts?.minute ?? 0;
    const next = composeHourMinute(hour24, minute);
    onStartChange(next, addMinutes(next, DEFAULT_DURATION_MINUTES));
  };

  const handleStartMinute = (raw: string): void => {
    if (!startParts || !raw) return;
    onStartChange(composeHourMinute(startParts.hour24, parseInt(raw, 10)));
  };

  const handleEndHour = (raw: string): void => {
    if (!raw) {
      onEndChange("");
      return;
    }
    const hour24 = parseInt(raw, 10);
    const minute = endParts?.minute ?? 0;
    onEndChange(composeHourMinute(hour24, minute));
  };

  const handleEndMinute = (raw: string): void => {
    if (!endParts || !raw) return;
    onEndChange(composeHourMinute(endParts.hour24, parseInt(raw, 10)));
  };

  return (
    <div className="flex min-w-max items-center gap-4">
      <HourMinuteGroup
        ariaLabel="Hora de inicio"
        hour24={startParts?.hour24 ?? null}
        minute={startParts ? startParts.minute : null}
        hours={startHours}
        minutes={startMinutes}
        disabled={disabled}
        hourRef={startHourRef}
        onHourChange={handleStartHour}
        onMinuteChange={handleStartMinute}
      />
      <HourMinuteGroup
        ariaLabel="Hora de fin"
        hour24={endParts?.hour24 ?? null}
        minute={endParts ? endParts.minute : null}
        hours={endHours}
        minutes={endMinutes}
        disabled={disabled}
        hourRef={endHourRef}
        onHourChange={handleEndHour}
        onMinuteChange={handleEndMinute}
      />
    </div>
  );
}
