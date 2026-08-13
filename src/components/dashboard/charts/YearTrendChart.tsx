import { BRAND, formatNumber } from "../types";

interface YearTrendChartProps {
  data: { year: number; count: number }[];
  selectedYear: number;
}

/**
 * Emphasis form: the selected year carries the brand hue and its value label,
 * every other year recedes to gray. The story is "this year vs the rest", not
 * five competing series.
 */
const YearTrendChart = ({ data, selectedYear }: YearTrendChartProps) => {
  const max = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className="flex items-end gap-3">
      {data.map((item) => {
        const isSelected = item.year === selectedYear;
        return (
          <div
            key={item.year}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            title={`${item.year}: ${formatNumber(item.count)} matrículas`}
          >
            <span
              className={`text-xs tabular-nums ${
                isSelected ? "font-semibold text-gray-900" : "text-transparent"
              }`}
            >
              {formatNumber(item.count)}
            </span>
            <div className="flex h-32 w-full items-end justify-center">
              <div
                className="w-full max-w-10 rounded-t transition-all duration-500"
                style={{
                  height:
                    item.count > 0
                      ? `max(3px, ${(item.count / max) * 100}%)`
                      : "2px",
                  backgroundColor: isSelected ? BRAND.bar : "#d1d5db",
                }}
              />
            </div>
            <span
              className={`text-xs tabular-nums ${
                isSelected ? "font-semibold text-primary" : "text-gray-500"
              }`}
            >
              {item.year}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default YearTrendChart;
