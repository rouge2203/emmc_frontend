import { CalendarDaysIcon } from "@heroicons/react/24/outline";

/** The three trimesters the school runs. */
const PERIOD_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "I" },
  { value: 2, label: "II" },
  { value: 3, label: "III" },
];

export interface PeriodOption {
  period: number;
  year: number;
}

/** Same pair, but with "Todos" (null) allowed — see the `allowAll` prop. */
export interface NullablePeriodOption {
  period: number | null;
  year: number | null;
}

/** "md" is the "Asignación de horarios" look; "sm" fits a filter card or form row. */
type Size = "sm" | "md";

interface SegmentedProps {
  /** Unique per instance — two controls on one page must not share label ids. */
  idPrefix: string;
  /** null = "Todos", only reachable when `includeAll` is set. */
  value: number | null;
  onChange: (period: number | null) => void;
  /** Adds a leading "Todos" segment that clears the period. */
  includeAll?: boolean;
  /** Periods to keep clickable; every period is clickable when omitted. */
  enabled?: Set<number> | null;
  /** Turns the whole group inert, e.g. while no year is chosen. */
  disabled?: boolean;
  /** Says out loud why the group is inert. */
  disabledHint?: string;
  /** Field-level error, for form usage. */
  error?: string;
  /** Renders the "*" that marks a required form field. */
  required?: boolean;
  size?: Size;
  /** Pass null when the caller renders its own label (form grids do). */
  label?: string | null;
  /** Id of that external label. */
  labelledBy?: string;
  className?: string;
}

/**
 * The I / II / III segmented control on its own, for callers that already have
 * a year field of their own (or none at all).
 */
export function PeriodSegmentedControl({
  idPrefix,
  value,
  onChange,
  includeAll = false,
  enabled,
  disabled = false,
  disabledHint,
  error,
  required = false,
  size = "md",
  label = "Período",
  labelledBy,
  className,
}: SegmentedProps) {
  const options: { value: number | null; label: string }[] = includeAll
    ? [{ value: null, label: "Todos" }, ...PERIOD_OPTIONS]
    : PERIOD_OPTIONS;

  const labelId = `${idPrefix}PeriodLabel`;
  const errorId = `${idPrefix}PeriodError`;

  return (
    <div className={className}>
      {label !== null && (
        <span
          id={labelId}
          className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
        >
          <CalendarDaysIcon className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      )}
      {/* No top margin when the caller owns the label: its layout spaces us. */}
      <div
        role="group"
        aria-labelledby={labelledBy ?? labelId}
        aria-describedby={error ? errorId : undefined}
        className={`flex w-full rounded-md shadow-xs isolate sm:inline-flex sm:w-auto ${
          label === null ? "" : "mt-1"
        }`}
      >
        {options.map((option, index, all) => {
          const isActive = value === option.value;
          const isEnabled =
            !disabled &&
            (option.value === null || !enabled || enabled.has(option.value));
          return (
            <button
              key={option.label}
              type="button"
              disabled={!isEnabled}
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              title={
                isEnabled
                  ? undefined
                  : disabled
                    ? disabledHint
                    : `Sin cursos en el período ${option.label}`
              }
              className={`relative -ml-px flex-1 font-semibold whitespace-nowrap ring-1 ring-inset transition-colors focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 sm:flex-none ${
                size === "md"
                  ? `py-2.5 text-base sm:text-lg ${includeAll ? "px-2 sm:px-8" : "px-4 sm:px-8"}`
                  : "px-4 py-1.5 text-sm sm:px-6"
              } ${index === 0 ? "ml-0 rounded-l-md" : ""} ${
                index === all.length - 1 ? "rounded-r-md" : ""
              } ${
                !isEnabled
                  ? isActive
                    ? "z-10 cursor-not-allowed bg-gray-200 text-gray-500 ring-gray-300"
                    : "cursor-not-allowed bg-gray-50 text-gray-300 ring-gray-200"
                  : isActive
                    ? "z-10 bg-primary text-white ring-primary hover:bg-primary/90"
                    : `bg-white text-gray-700 hover:bg-gray-50 ${
                        error ? "ring-red-500" : "ring-gray-300"
                      }`
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {disabled && disabledHint && (
        <p className="mt-1 text-xs text-gray-500">{disabledHint}</p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface CommonProps {
  /** Every period the viewer actually has something in. */
  available?: PeriodOption[];
  /** Year list for callers that only know the years, not the year/period pairs. */
  years?: number[];
  /** Unique per instance — two selectors on one page must not share label ids. */
  idPrefix: string;
  yearLabel?: string;
  periodLabel?: string;
  /** Turns the period group inert without hiding it. */
  periodDisabled?: boolean;
  periodDisabledHint?: string;
  size?: Size;
}

interface StrictProps extends CommonProps {
  allowAll?: false;
  year: number;
  period: number;
  onChange: (next: PeriodOption) => void;
}

interface AllProps extends CommonProps {
  /** Adds "Todos los años" / "Todos", so the pair can also mean "no filter". */
  allowAll: true;
  year: number | null;
  period: number | null;
  onChange: (next: NullablePeriodOption) => void;
}

type Props = StrictProps | AllProps;

/**
 * Year dropdown plus a period segmented control.
 *
 * This is the same control the admin schedule pages use, so anyone who has seen
 * "Asignación de horarios" already knows how to drive it. Periods the viewer has
 * nothing in are shown but disabled, which keeps the three trimesters in a fixed
 * position instead of shuffling as years change.
 */
export default function PeriodSelector(props: Props) {
  const {
    available,
    years: yearsProp,
    year,
    period,
    idPrefix,
    yearLabel = "Año",
    periodLabel = "Período",
    allowAll = false,
    periodDisabled = false,
    periodDisabledHint,
    size = "md",
  } = props;

  // The prop union only lets a caller reach the null values below when it has
  // declared `allowAll`, so widening the callback here is safe.
  const emit = props.onChange as (next: NullablePeriodOption) => void;

  const years =
    yearsProp ??
    Array.from(new Set((available ?? []).map((p) => p.year))).sort(
      (a, b) => b - a,
    );
  // Without an availability list every trimester stays clickable.
  const periodsInYear = available
    ? new Set(available.filter((p) => p.year === year).map((p) => p.period))
    : null;

  const selectYear = (raw: string) => {
    if (raw === "") {
      emit({ period, year: null });
      return;
    }
    const nextYear = parseInt(raw, 10);
    if (!available) {
      emit({ period, year: nextYear });
      return;
    }
    const inYear = available
      .filter((p) => p.year === nextYear)
      .map((p) => p.period)
      .sort((a, b) => a - b);
    // Stay on the same trimester when that year has one; otherwise take its last.
    const nextPeriod =
      period !== null && inYear.includes(period)
        ? period
        : inYear[inYear.length - 1];
    if (nextPeriod !== undefined) emit({ period: nextPeriod, year: nextYear });
  };

  // Tops align, not bottoms: the year select and the period group are the same
  // height, and a hint under the group must not shove the select down.
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      {/* Wider when "Todos los años" is an option, so it is not truncated. */}
      <div className={allowAll ? "sm:w-56" : "sm:w-44"}>
        <label
          htmlFor={`${idPrefix}Year`}
          className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
        >
          <CalendarDaysIcon className="h-4 w-4" />
          {yearLabel}
        </label>
        <div className="mt-1 grid grid-cols-1">
          <select
            id={`${idPrefix}Year`}
            value={year ?? ""}
            onChange={(e) => selectYear(e.target.value)}
            className={`col-start-1 row-start-1 w-full cursor-pointer appearance-none rounded-md bg-white pr-10 pl-4 text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 ${
              size === "md"
                ? "py-2.5 text-lg font-semibold"
                : "py-1.5 text-sm font-medium"
            }`}
          >
            {allowAll && <option value="">Todos los años</option>}
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-500"
          >
            <path
              d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
              fillRule="evenodd"
            />
          </svg>
        </div>
      </div>

      <PeriodSegmentedControl
        idPrefix={idPrefix}
        label={periodLabel}
        value={period}
        onChange={(next) => emit({ period: next, year })}
        includeAll={allowAll}
        enabled={periodsInYear}
        disabled={periodDisabled}
        disabledHint={periodDisabledHint}
        size={size}
        className="flex-1"
      />
    </div>
  );
}
