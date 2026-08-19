// Native <select> chrome matching the Headless UI “simple native” pattern:
// grid overlay + ChevronDownIcon, with the project primary as the focus ring.
import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

// "timeCompact" is the resting size of a clock in the schedule grid: the same
// select, shrunk, so an unfilled card reads as a hint rather than as a form.
export type CompactSelectSize = "full" | "time" | "timeCompact";

const SIZE_CLASS: Record<CompactSelectSize, string> = {
  full: "py-1.5 pr-8 pl-3 text-base sm:text-sm/6",
  time: "py-1.5 pr-7 pl-2 text-sm",
  timeCompact: "py-0.5 pr-5 pl-1.5 text-xs",
};

/** Resting outline; callers (e.g. the grid's active cell) may swap it wholesale. */
export const DEFAULT_SELECT_OUTLINE = "outline-1 -outline-offset-1 outline-gray-300";

export function compactSelectClass(
  disabled: boolean,
  size: CompactSelectSize = "full",
  outline: string = DEFAULT_SELECT_OUTLINE,
): string {
  return [
    "col-start-1 row-start-1 w-full appearance-none rounded-md",
    outline,
    "focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary",
    SIZE_CLASS[size],
    disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900",
  ].join(" ");
}

const CHEVRON_CLASS: Record<CompactSelectSize, string> = {
  full: "mr-2 size-5 sm:size-4",
  time: "mr-1.5 size-4",
  timeCompact: "mr-1 size-3",
};

export function CompactSelect({
  children,
  disabled = false,
  size = "full",
}: {
  children: ReactNode;
  disabled?: boolean;
  size?: CompactSelectSize;
}) {
  return (
    <div className="grid grid-cols-1">
      {children}
      <ChevronDownIcon
        aria-hidden="true"
        className={`pointer-events-none col-start-1 row-start-1 self-center justify-self-end ${
          CHEVRON_CLASS[size]
        } ${disabled ? "text-gray-400" : "text-gray-500"}`}
      />
    </div>
  );
}

export type CompactSelectElProps = SelectHTMLAttributes<HTMLSelectElement> & {
  selectSize?: CompactSelectSize;
  /** Replaces the resting outline utilities (never appended — they would collide). */
  selectOutline?: string;
};

/** Convenience wrapper: shell + styled native select. */
export const NativeSelect = forwardRef<HTMLSelectElement, CompactSelectElProps>(
  function NativeSelect(
    { className, disabled, selectSize = "full", selectOutline, children, ...rest },
    ref,
  ) {
    return (
      <CompactSelect disabled={!!disabled} size={selectSize}>
        <select
          ref={ref}
          disabled={disabled}
          className={`${compactSelectClass(!!disabled, selectSize, selectOutline)} ${className ?? ""}`}
          {...rest}
        >
          {children}
        </select>
      </CompactSelect>
    );
  },
);
