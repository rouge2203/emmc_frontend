import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatNumber } from "./types";

interface StatTileProps {
  label: string;
  value: number;
  icon: ReactNode;
  to?: string;
  hint?: string;
}

const StatTile = ({ label, value, icon, to, hint }: StatTileProps) => {
  const content = (
    <div className="relative h-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md sm:p-5">
      <span className="absolute top-4 right-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
        {icon}
      </span>
      {/* Proportional figures: tabular-nums makes large numbers look loose. */}
      <p className="pr-10 text-2xl font-semibold text-gray-900 sm:text-3xl">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full focus:outline-none">
        {content}
      </Link>
    );
  }
  return content;
};

export default StatTile;
