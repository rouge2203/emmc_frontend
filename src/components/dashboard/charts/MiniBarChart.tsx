import { BRAND, formatNumber } from "../types";

export interface MiniBarItem {
  label: string;
  fullLabel?: string;
  value: number;
}

interface MiniBarChartProps {
  items: MiniBarItem[];
  color?: string;
  /** Plot height in px; the axis band sits below it, outside this value. */
  height?: number;
  /** Shown instead of a row of flat stubs when every value is zero. */
  emptyMessage?: string;
}

const MiniBarChart = ({
  items,
  color = BRAND.bar,
  height = 128,
  emptyMessage,
}: MiniBarChartProps) => {
  const max = Math.max(1, ...items.map((item) => item.value));
  const isEmpty = items.every((item) => item.value === 0);

  if (isEmpty && emptyMessage) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          title={`${item.fullLabel ?? item.label}: ${formatNumber(item.value)}`}
        >
          <span className="text-xs text-gray-600 tabular-nums">
            {item.value > 0 ? formatNumber(item.value) : ""}
          </span>
          <div
            className="flex w-full items-end justify-center"
            style={{ height }}
          >
            <div
              className="w-full max-w-8 rounded-t transition-all duration-500"
              style={{
                height:
                  item.value > 0
                    ? `max(3px, ${(item.value / max) * 100}%)`
                    : "2px",
                backgroundColor: item.value > 0 ? color : "#e5e7eb",
              }}
            />
          </div>
          <span className="truncate text-xs text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default MiniBarChart;
