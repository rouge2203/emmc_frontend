import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { BRAND, formatNumber } from "../types";
import type { AgeBucket, AgeDistribution } from "../types";

export interface AgeDistributionChartProps {
  data: AgeDistribution;
  /** Height of the bar band in px; axis, bracket and chip sit below it. */
  height?: number;
  emptyMessage?: string;
  /**
   * Noun for a single counted observation. Period-scoped data counts one row
   * per student, but the all-time view counts one per student *per year*, so
   * that caller passes "registro" instead.
   */
  unitSingular?: string;
  /** Plural of {@link AgeDistributionChartProps.unitSingular}. */
  unitPlural?: string;
}

/** Emphasis is the only colour variation: outside the span the bars recede. */
const OUT_OF_SPAN = "#d1d5db";
/** A zero-count age still gets a hairline so the axis reads as continuous. */
const ZERO_STUB = "#e5e7eb";
/** Surface gap between adjacent bars, px — the bracket bridges the same gap. */
const GAP = 2;
/**
 * One bar per year runs the axis past 80 columns, and there a 2px seam eats
 * most of the bar it separates, so the gap halves instead.
 */
const DENSE_GAP = 1;
/** Past this many bars the gap drops to {@link DENSE_GAP}. */
const DENSE_BARS = 40;
/** Keeps a clamped tooltip off the plot's own edges. */
const EDGE_PAD = 4;
/** How many axis labels to aim for, whatever the bucket count. */
const TARGET_LABELS = 14;

interface HoverState {
  index: number;
  bucket: AgeBucket;
  /** Pointer — or the focused column's centre — inside the plot wrapper, px. */
  x: number;
  y: number;
  /** Wrapper width at hover time, so the tooltip can clamp itself. */
  plotWidth: number;
}

/** Every bucket is exactly one year wide, so an age is always an exact age. */
const ageTitle = (bucket: AgeBucket): string => `${bucket.age} años`;

/** Share of the counted students, one decimal, guarded against an empty total. */
const sharePercent = (count: number, total: number): number =>
  total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

/**
 * Student ages as a histogram: one bar per year of the observed range, so the
 * bins are all the same width and no bucket stands for "or more". Single-series
 * magnitude — every bar is the brand hue and the only colour variation is
 * emphasis: the dominant span (the densest five-year window) stays saturated
 * while the rest recede, mirroring YearTrendChart. The parent supplies the card.
 */
const AgeDistributionChart = ({
  data,
  height = 160,
  emptyMessage = "Sin datos de edad para este periodo",
  unitSingular = "estudiante",
  unitPlural = "estudiantes",
}: AgeDistributionChartProps) => {
  const { buckets, total, median, average } = data;
  const unknownCount = data.unknown_count;
  const span = data.dominant_span;

  const [hover, setHover] = useState<HoverState | null>(null);
  const [tooltipWidth, setTooltipWidth] = useState(0);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Resolve the span to column indices instead of trusting ages to be offsets:
  // the buckets are contiguous, but their first age is whatever the data had.
  const spanRange = useMemo(() => {
    if (!span) return null;
    let start = -1;
    let end = -1;
    buckets.forEach((bucket, index) => {
      if (bucket.age >= span.from && bucket.age <= span.to) {
        if (start === -1) start = index;
        end = index;
      }
    });
    return start === -1 ? null : { start, end };
  }, [buckets, span]);

  // The axis can hold 80+ single-year buckets, so the label step follows the
  // bucket count rather than a fixed every-other rule: aim for ~TARGET_LABELS
  // whatever the range, and let the anchors — the two ends of the axis and the
  // span's endpoints, which are read as values and not as ticks — claim their
  // columns before the stepped fill gets a turn.
  const labelledIndices = useMemo(() => {
    const step = Math.max(1, Math.ceil(buckets.length / TARGET_LABELS));
    const thinned = step > 1;
    const shown = new Set<number>();
    const add = (index: number) => {
      if (index < 0 || index >= buckets.length || shown.has(index)) return;
      // Once the axis is thinned a column is barely wider than the label it
      // carries, so two labels on neighbouring bars would touch.
      if (thinned && (shown.has(index - 1) || shown.has(index + 1))) return;
      shown.add(index);
    };
    // Priority: the ends of the axis, then the span's endpoints, then the fill.
    add(0);
    add(buckets.length - 1);
    if (spanRange) {
      add(spanRange.start);
      add(spanRange.end);
    }
    for (let index = 0; index < buckets.length; index += step) {
      add(index);
    }
    return shown;
  }, [buckets, spanRange]);

  const hoverTitle = hover ? ageTitle(hover.bucket) : null;
  const hoverCount = hover ? hover.bucket.count : null;

  // Measure the tooltip so it can be clamped by its real width rather than a
  // guessed one; layout effect keeps the correction from ever being painted.
  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    const width = node.getBoundingClientRect().width;
    setTooltipWidth((current) =>
      Math.abs(current - width) > 0.5 ? width : current,
    );
  }, [hoverTitle, hoverCount]);

  const unitFor = (count: number): string =>
    count === 1 ? unitSingular : unitPlural;

  // Built once and rendered by both branches below: a bulk import can leave
  // every enrolled student without a birthdate, and then this chip is the only
  // actionable thing the card knows — the empty state must not swallow it.
  const unknownNote =
    unknownCount > 0 ? (
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 tabular-nums">
          {formatNumber(unknownCount)} {unitFor(unknownCount)} sin fecha de
          nacimiento
        </span>
        <span className="text-[10px] text-gray-500">
          no {unknownCount === 1 ? "entra" : "entran"} en los porcentajes
        </span>
      </p>
    ) : null;

  if (buckets.length === 0 || total === 0) {
    return (
      <div className="py-12">
        <p className="text-center text-sm text-gray-500">{emptyMessage}</p>
        {unknownNote && (
          <div className="flex justify-center">{unknownNote}</div>
        )}
      </div>
    );
  }

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  // Every row below shares this gap — bars, labels and bracket are the same
  // column grid, so a wide range thins the seam rather than the bars.
  const gap = buckets.length > DENSE_BARS ? DENSE_GAP : GAP;

  const clearHover = () => setHover(null);

  const showFromPointer = (
    event: ReactMouseEvent<HTMLDivElement>,
    index: number,
    bucket: AgeBucket,
  ) => {
    const plot = plotRef.current;
    if (!plot) return;
    const rect = plot.getBoundingClientRect();
    setHover({
      index,
      bucket,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      plotWidth: rect.width,
    });
  };

  const showFromFocus = (
    event: ReactFocusEvent<HTMLDivElement>,
    index: number,
    bucket: AgeBucket,
  ) => {
    const plot = plotRef.current;
    if (!plot) return;
    const plotRect = plot.getBoundingClientRect();
    const columnRect = event.currentTarget.getBoundingClientRect();
    setHover({
      index,
      bucket,
      x: columnRect.left + columnRect.width / 2 - plotRect.left,
      y: columnRect.top + columnRect.height / 2 - plotRect.top,
      plotWidth: plotRect.width,
    });
  };

  const tooltipHalf = tooltipWidth / 2 + EDGE_PAD;
  const tooltipLeft = hover
    ? Math.min(
        Math.max(hover.x, tooltipHalf),
        Math.max(tooltipHalf, hover.plotWidth - tooltipHalf),
      )
    : 0;

  const spanColumns = spanRange ? spanRange.end - spanRange.start + 1 : 0;

  // The bracket line is pinned to the columns, but its caption is wider than a
  // narrow span and nothing clips the card: hug whichever axis end the span
  // touches so the text can only ever overhang inwards.
  const captionAlign =
    spanRange !== null && spanRange.start === 0
      ? "left-0"
      : spanRange !== null && spanRange.end === buckets.length - 1
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  const hasSummary = span !== null || median !== null || average !== null;

  return (
    <div>
      {hasSummary && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {span && (
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
              <span className="font-semibold text-gray-900">{span.label}</span>
              <span aria-hidden="true" className="text-gray-300">
                ·
              </span>
              <span className="text-gray-500 tabular-nums">
                {formatNumber(span.count)} {unitFor(span.count)}
              </span>
              <span aria-hidden="true" className="text-gray-300">
                ·
              </span>
              <span className="text-gray-500 tabular-nums">
                {formatNumber(Math.round(span.percentage))}% del total
              </span>
            </p>
          )}
          <p className="ml-auto flex items-baseline gap-x-3 text-xs text-gray-500 tabular-nums">
            {median !== null && <span>Mediana {formatNumber(median)} años</span>}
            {average !== null && <span>Promedio {formatNumber(average)}</span>}
          </p>
        </div>
      )}

      <div ref={plotRef} className="relative" onMouseLeave={clearHover}>
        {hover && (
          <div
            ref={tooltipRef}
            aria-hidden="true"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
            style={{ left: tooltipLeft, top: hover.y - 8 }}
          >
            <span className="block font-medium">{ageTitle(hover.bucket)}</span>
            <span className="mt-0.5 block text-gray-300 tabular-nums">
              {formatNumber(hover.bucket.count)} {unitFor(hover.bucket.count)} ·{" "}
              {formatNumber(sharePercent(hover.bucket.count, total))}% del total
            </span>
          </div>
        )}

        <div
          className="flex items-end"
          style={{ height, gap }}
          onMouseLeave={clearHover}
        >
          {buckets.map((bucket, index) => {
            const isActive = hover?.index === index;
            const inSpan =
              spanRange !== null &&
              index >= spanRange.start &&
              index <= spanRange.end;
            return (
              <div
                key={bucket.age}
                role="img"
                tabIndex={0}
                aria-label={`${ageTitle(bucket)}: ${formatNumber(
                  bucket.count,
                )} ${unitFor(bucket.count)}, ${formatNumber(
                  sharePercent(bucket.count, total),
                )}% del total`}
                className="relative flex h-full min-w-0 flex-1 items-end rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onMouseMove={(event) => showFromPointer(event, index, bucket)}
                onFocus={(event) => showFromFocus(event, index, bucket)}
                onBlur={clearHover}
              >
                {/* Hit target reads wider than the thin bar it stands for. */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded bg-gray-900/5"
                  />
                )}
                <span
                  className="relative w-full rounded-t transition-all duration-500"
                  style={{
                    height:
                      bucket.count > 0
                        ? `max(3px, ${(bucket.count / max) * 100}%)`
                        : "2px",
                    backgroundColor:
                      bucket.count === 0
                        ? ZERO_STUB
                        : inSpan || spanRange === null
                          ? BRAND.bar
                          : OUT_OF_SPAN,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Same column structure as the bars, so labels stay aligned at any count. */}
        <div className="mt-1.5 flex h-4" style={{ gap }}>
          {buckets.map((bucket, index) => (
            <div key={bucket.age} className="relative min-w-0 flex-1">
              {labelledIndices.has(index) && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] leading-4 whitespace-nowrap text-gray-500 tabular-nums">
                  {bucket.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {spanRange && (
          // The summary line already states the span in words; this is its
          // visual echo, so it stays out of the accessibility tree.
          <div className="mt-1 flex h-6" aria-hidden="true" style={{ gap }}>
            {buckets.map((bucket, index) => (
              <div key={bucket.age} className="relative min-w-0 flex-1">
                {index === spanRange.start && (
                  <div
                    className="absolute top-0 left-0"
                    style={{
                      // N columns plus the N-1 gaps they straddle: exact, and
                      // it tracks the flex columns instead of guessing pixels.
                      width: `calc(${spanColumns * 100}% + ${
                        (spanColumns - 1) * gap
                      }px)`,
                    }}
                  >
                    <span
                      className="block"
                      style={{ height: 2, backgroundColor: BRAND.bar }}
                    />
                    <span
                      className="absolute top-0 left-0"
                      style={{ width: 2, height: 6, backgroundColor: BRAND.bar }}
                    />
                    <span
                      className="absolute top-0 right-0"
                      style={{ width: 2, height: 6, backgroundColor: BRAND.bar }}
                    />
                    <span
                      className={`absolute top-2 ${captionAlign} text-[10px] leading-4 whitespace-nowrap text-gray-500`}
                    >
                      mayor presencia
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {unknownNote}
    </div>
  );
};

export default AgeDistributionChart;
