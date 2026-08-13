import { BRAND, formatNumber } from "../types";

export interface HBarItem {
  label: string;
  value: number;
}

interface HBarListProps {
  items: HBarItem[];
  color?: string;
  emptyMessage?: string;
}

/**
 * Magnitude comparison across nominal categories: every bar gets the same hue.
 * Shading bars by value would re-encode length as color for no added meaning.
 */
const HBarList = ({
  items,
  color = BRAND.bar,
  emptyMessage = "Sin datos para este periodo",
}: HBarListProps) => {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3"
          title={`${item.label}: ${formatNumber(item.value)}`}
        >
          <span className="truncate text-sm text-gray-600">{item.label}</span>
          <span
            className="h-2.5 w-full rounded-full"
            style={{ backgroundColor: BRAND.track }}
          >
            <span
              className="block h-2.5 rounded-r-full transition-all duration-500"
              style={{
                // Keep a hairline visible for non-zero values.
                width:
                  item.value > 0
                    ? `max(3px, ${(item.value / max) * 100}%)`
                    : "0%",
                backgroundColor: color,
              }}
            />
          </span>
          <span className="text-sm font-medium text-gray-900 tabular-nums">
            {formatNumber(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default HBarList;
