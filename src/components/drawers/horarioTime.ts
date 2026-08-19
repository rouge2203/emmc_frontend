// Pure helpers for the enrollment-drawer horario row: school-day hours (7am–9pm),
// 40-minute default duration, and the day+inicio gates for aula/save.

/** School-day hours as 24h values: 7 (7am) through 21 (9pm). */
export const SCHOOL_HOUR24: readonly number[] = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
];

export const MINUTE_STEP = 5;
export const MINUTE_OPTIONS: readonly number[] = Array.from(
  { length: 60 / MINUTE_STEP },
  (_, i) => i * MINUTE_STEP,
);

export const DEFAULT_DURATION_MINUTES = 40;

const LAST_SCHOOL_MINUTE = 21 * 60 + 55;

export const formatHourLabel = (hour24: number): string => {
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "pm" : "am";
  return `${hour12}${period}`;
};

export const periodOf = (hour24: number): "am" | "pm" =>
  hour24 >= 12 ? "pm" : "am";

export const parseHourMinute = (
  value: string | null | undefined,
): { hour24: number; minute: number } | null => {
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
  return { hour24, minute };
};

export const composeHourMinute = (hour24: number, minute: number): string =>
  `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

export const addMinutes = (value: string, minutes: number): string | null => {
  const parsed = parseHourMinute(value);
  if (!parsed) return null;
  const total = parsed.hour24 * 60 + parsed.minute + minutes;
  if (total > LAST_SCHOOL_MINUTE) return null;
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  if (hour24 > 21) return null;
  return composeHourMinute(hour24, minute);
};

export const endHourOptions = (startHour24: number | null): number[] => {
  if (startHour24 === null) return [...SCHOOL_HOUR24];
  return SCHOOL_HOUR24.filter((h) => h >= startHour24);
};

export const aulaEnabled = (day: string, startHour: string | null | undefined): boolean =>
  Boolean(day && startHour);

export const canSaveHorario = (day: string, startHour: string | null | undefined): boolean =>
  Boolean(day && startHour);

/** Map a 1–12 typeahead hour onto the school-day 24h select (7am–9pm). */
export const schoolHour24FromTypeahead = (hour12: number): number | null => {
  if (SCHOOL_HOUR24.includes(hour12)) return hour12;
  const pm = hour12 + 12;
  if (SCHOOL_HOUR24.includes(pm)) return pm;
  return null;
};

/** Disabled native selects can still steal pointer focus in some browsers. */
export const keepEditorFocusOnDisabledControl = (enabled: boolean): boolean => !enabled;
