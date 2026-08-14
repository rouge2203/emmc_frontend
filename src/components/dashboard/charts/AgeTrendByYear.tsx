import { useState } from "react";
import type { AgeTrendPoint } from "../types";
import { BRAND, formatNumber } from "../types";

interface AgeTrendByYearProps {
  points: AgeTrendPoint[];
  selectedYear?: number;
  emptyMessage?: string;
}

/** Track height in px (h-2.5) — the median marker is sized against it. */
const TRACK_HEIGHT = 10;
/** Years of breathing room added on each side of the observed domain. */
const DOMAIN_PADDING = 1;

/**
 * Range bars on one shared age scale: each year's datum is a *span*, not a
 * magnitude, so it gets a segment with a start and an end rather than a bar
 * growing from zero. Every span carries the same hue — the years are one
 * series observed repeatedly, and only the selected year is emphasised, in
 * the label, the way YearTrendChart does it.
 */
const AgeTrendByYear = ({
  points,
  selectedYear,
  emptyMessage = "Sin datos históricos de edad",
}: AgeTrendByYearProps) => {
  const [activeYear, setActiveYear] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">{emptyMessage}</p>
    );
  }

  // The scale has to hold every mark we draw: both span ends and the median.
  const ages: number[] = [];
  for (const point of points) {
    if (point.median !== null) ages.push(point.median);
    if (point.dominant_span !== null) {
      ages.push(point.dominant_span.from, point.dominant_span.to);
    }
  }

  const hasScale = ages.length > 0;
  const domainMin = (hasScale ? Math.min(...ages) : 0) - DOMAIN_PADDING;
  const domainMax = (hasScale ? Math.max(...ages) : 0) + DOMAIN_PADDING;
  // Guards the degenerate single-value domain — never divide by zero.
  const domainRange = Math.max(1, domainMax - domainMin);
  const midAge = Math.round((domainMin + domainMax) / 2);

  const positionOf = (age: number): number =>
    ((age - domainMin) / domainRange) * 100;

  const summaryOf = (point: AgeTrendPoint): string => {
    const parts = [
      `${point.year} – ${formatNumber(point.total)} ${
        point.total === 1 ? "estudiante" : "estudiantes"
      }`,
    ];
    if (point.median !== null) {
      parts.push(`mediana ${formatNumber(point.median)} años`);
    }
    if (point.dominant_span !== null) {
      parts.push(`mayor presencia ${point.dominant_span.label}`);
    }
    return parts.join(" / ");
  };

  return (
    <div>
      {/*
       * Two different marks share one track, and on a right-skewed intake the
       * median regularly sits outside the span — which reads as a drawing bug
       * unless the key says otherwise. The swatches mirror the real marks
       * below, ring and all.
       */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[10px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span
            className="block h-1.5 w-5 rounded-full"
            style={{ backgroundColor: BRAND.bar }}
          />
          rango de mayor presencia
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="block size-2 rounded-full bg-white"
            style={{ boxShadow: `0 0 0 2px ${BRAND.bar}` }}
          />
          mediana
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,3.5rem)_1fr_auto] items-center gap-x-3 gap-y-0.5">
      {points.map((point, index) => {
        const isSelected =
          selectedYear !== undefined && point.year === selectedYear;
        const isActive = activeYear === point.year;
        const span = point.dominant_span;
        const summary = summaryOf(point);
        // The pill is centred on the span's midpoint, so a single-age span
        // stays symmetric around the age it encodes — and around its median dot.
        const startPct = span !== null ? positionOf(span.from) : 0;
        const endPct = span !== null ? positionOf(span.to) : 0;

        return (
          <div
            key={point.year}
            className={`relative col-span-3 grid grid-cols-subgrid items-center rounded py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive ? "bg-gray-900/5" : ""
            }`}
            role="img"
            tabIndex={0}
            aria-label={summary}
            onMouseEnter={() => setActiveYear(point.year)}
            onMouseLeave={() => setActiveYear(null)}
            onFocus={() => setActiveYear(point.year)}
            onBlur={() => setActiveYear(null)}
          >
            <span
              className={`text-xs tabular-nums ${
                isSelected ? "font-semibold text-primary" : "text-gray-500"
              }`}
            >
              {point.year}
            </span>

            <span
              className="relative block h-2.5 w-full rounded-full"
              style={{ backgroundColor: BRAND.track }}
            >
              {span !== null && (
                <span
                  className="absolute inset-y-0 block rounded-full transition-all duration-500"
                  style={{
                    left: `${(startPct + endPct) / 2}%`,
                    transform: "translateX(-50%)",
                    // A single-age span still has to read as a mark.
                    width: `max(${TRACK_HEIGHT}px, ${endPct - startPct}%)`,
                    backgroundColor: BRAND.bar,
                  }}
                />
              )}
              {point.median !== null && (
                <span
                  className="absolute top-1/2 block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-500"
                  style={{
                    left: `${positionOf(point.median)}%`,
                    // 2px ring keeps the marker legible over the span segment.
                    boxShadow: `0 0 0 2px ${BRAND.bar}`,
                  }}
                />
              )}
            </span>

            <span className="whitespace-nowrap text-xs text-gray-500 tabular-nums">
              {span !== null ? span.label : "—"}
            </span>

            {isActive && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-1/2 z-10 w-max max-w-[min(16rem,100%)] -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg ${
                  index === 0 ? "top-full mt-1" : "bottom-full mb-1"
                }`}
              >
                {summary}
              </span>
            )}
          </div>
        );
      })}

      {hasScale && (
        <div
          aria-hidden="true"
          className="col-span-3 mt-1 grid grid-cols-subgrid"
        >
          <div className="col-start-2">
            <div className="h-px w-full bg-gray-200" />
            <div className="relative mt-1 h-3 text-[10px] text-gray-500 tabular-nums">
              <span className="absolute left-0">{formatNumber(domainMin)}</span>
              <span
                className="absolute -translate-x-1/2"
                style={{ left: `${positionOf(midAge)}%` }}
              >
                {formatNumber(midAge)}
              </span>
              <span className="absolute right-0">
                {formatNumber(domainMax)}
              </span>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AgeTrendByYear;
