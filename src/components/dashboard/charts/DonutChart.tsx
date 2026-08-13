import { formatNumber } from "../types";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
}

const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface gap between slices, in path units (~2px at the rendered size). */
const GAP = 2.5;

const DonutChart = ({ segments, centerLabel }: DonutChartProps) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const drawable = segments.filter((s) => s.value > 0);

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg viewBox="0 0 120 120" className="size-40" role="img">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="14"
          />
          <g transform="rotate(-90 60 60)">
            {drawable.map((segment) => {
              const fraction = segment.value / total;
              // Single full-circle segment: no gap, or the ring shows a nick.
              const gap = drawable.length > 1 ? GAP : 0;
              const dash = Math.max(fraction * CIRCUMFERENCE - gap, 0.5);
              const circle = (
                <circle
                  key={segment.label}
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${segment.label}: ${formatNumber(segment.value)}`}</title>
                </circle>
              );
              offset += fraction * CIRCUMFERENCE;
              return circle;
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-gray-900">
            {formatNumber(total)}
          </span>
          <span className="text-xs text-gray-500">{centerLabel}</span>
        </div>
      </div>

      {/* Legend carries label + count, so identity is never color-alone. */}
      <ul className="w-full space-y-2">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate text-gray-600">{segment.label}</span>
            </span>
            <span className="font-medium text-gray-900 tabular-nums">
              {formatNumber(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonutChart;
