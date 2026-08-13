import { formatNumber } from "../types";

export interface StackedSegment {
  label: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  segments: StackedSegment[];
}

const StackedBar = ({ segments }: StackedBarProps) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-4">
      {/* 2px surface gaps separate segments — no borders on the marks. */}
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-gray-100">
        {total > 0 &&
          segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <div
                key={segment.label}
                style={{
                  flexGrow: segment.value,
                  backgroundColor: segment.color,
                }}
                title={`${segment.label}: ${formatNumber(segment.value)}`}
              />
            ))}
      </div>

      {/* Two columns: four across truncates the longer status words. */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
        {segments.map((segment) => (
          <li key={segment.label} className="min-w-0">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs text-gray-600 capitalize">
                {segment.label}
              </span>
            </span>
            <span className="mt-0.5 block text-lg font-semibold text-gray-900">
              {formatNumber(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StackedBar;
