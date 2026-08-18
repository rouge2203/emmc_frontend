import React from "react";

interface TimeSelectProps {
  /** 24h "HH:MM" (or "HH:MM:SS") string; "" / null means no time. */
  value: string | null;
  /** Receives the composed 24h "HH:MM" string, or "" when cleared. */
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Used to build accessible names, e.g. "Hora de inicio". */
  ariaLabel?: string;
  /**
   * AM/PM guessed when an hour is first picked on an empty field. Defaults to
   * the internal 8–11→AM heuristic (so the drawer is unaffected); the schedule
   * grid's "Fin" passes one that keeps fin after inicio.
   */
  defaultPeriodForHour?: (hour12: number) => "AM" | "PM";
}

interface TimeParts {
  hour12: number; // 1-12
  minute: number; // 0-59
  period: "AM" | "PM";
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_STEP = 5;
const MINUTE_OPTIONS = Array.from(
  { length: 60 / MINUTE_STEP },
  (_, i) => i * MINUTE_STEP,
);

const parseTime = (value: string | null): TimeParts | null => {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour24 = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (
    Number.isNaN(hour24) ||
    Number.isNaN(minute) ||
    hour24 < 0 ||
    hour24 > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return {
    hour12: hour24 % 12 || 12,
    minute,
    period: hour24 >= 12 ? "PM" : "AM",
  };
};

const composeTime = ({ hour12, minute, period }: TimeParts): string => {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// When an admin picks an hour on an empty field, guess the half of the day the
// school actually teaches in: 8-11 reads as morning, everything else as
// afternoon/evening. It is only a starting point — the AM/PM select stays
// editable right next to it.
const defaultPeriodForHour = (hour12: number): "AM" | "PM" =>
  hour12 >= 8 && hour12 <= 11 ? "AM" : "PM";

const chevron = (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    data-slot="icon"
    aria-hidden="true"
    className="pointer-events-none col-start-1 row-start-1 mr-1.5 size-4 self-center justify-self-end text-gray-500"
  >
    <path
      d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
      fillRule="evenodd"
    />
  </svg>
);

/**
 * Hour / minutes / AM-PM picker built from three native <select>s so it looks
 * and behaves the same on every screen size (the native <input type="time">
 * renders very differently between desktop and mobile browsers).
 */
const TimeSelect: React.FC<TimeSelectProps> = ({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Hora",
  defaultPeriodForHour: guessPeriod = defaultPeriodForHour,
}) => {
  const parts = parseTime(value);
  const hasHour = parts !== null;

  // Keep an off-grid minute (e.g. 12:37 saved before this picker existed)
  // visible instead of silently snapping it to the nearest step.
  const minuteOptions =
    parts && !MINUTE_OPTIONS.includes(parts.minute)
      ? [...MINUTE_OPTIONS, parts.minute].sort((a, b) => a - b)
      : MINUTE_OPTIONS;

  const emit = (next: TimeParts | null) => {
    onChange(next ? composeTime(next) : "");
  };

  const handleHourChange = (raw: string) => {
    if (!raw) {
      emit(null);
      return;
    }
    const hour12 = parseInt(raw, 10);
    if (parts) {
      emit({ ...parts, hour12 });
    } else {
      emit({ hour12, minute: 0, period: guessPeriod(hour12) });
    }
  };

  const handleMinuteChange = (raw: string) => {
    if (!parts) return;
    emit({ ...parts, minute: parseInt(raw, 10) });
  };

  const handlePeriodChange = (raw: string) => {
    if (!parts) return;
    emit({ ...parts, period: raw === "PM" ? "PM" : "AM" });
  };

  const selectClass = (isDisabled: boolean) =>
    `col-start-1 row-start-1 w-full min-w-0 appearance-none rounded-md py-1.5 pr-6 pl-2 text-sm outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 ${
      isDisabled
        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
        : "bg-white text-gray-900"
    }`;

  const subDisabled = disabled || !hasHour;

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={ariaLabel}>
      <div className="grid grid-cols-1">
        <select
          aria-label={`${ariaLabel}: hora`}
          value={parts ? String(parts.hour12) : ""}
          onChange={(e) => handleHourChange(e.target.value)}
          disabled={disabled}
          className={selectClass(disabled)}
        >
          <option value="">hh</option>
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        {chevron}
      </div>
      <div className="grid grid-cols-1">
        <select
          aria-label={`${ariaLabel}: minutos`}
          value={parts ? String(parts.minute) : ""}
          onChange={(e) => handleMinuteChange(e.target.value)}
          disabled={subDisabled}
          className={selectClass(subDisabled)}
        >
          <option value="">mm</option>
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        {chevron}
      </div>
      <div className="grid grid-cols-1">
        <select
          aria-label={`${ariaLabel}: AM o PM`}
          value={parts ? parts.period : ""}
          onChange={(e) => handlePeriodChange(e.target.value)}
          disabled={subDisabled}
          className={selectClass(subDisabled)}
        >
          <option value="">AM/PM</option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        {chevron}
      </div>
    </div>
  );
};

export default TimeSelect;
