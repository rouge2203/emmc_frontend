import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const ChartCard = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}: ChartCardProps) => (
  <div
    className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5 ${className}`}
  >
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

export default ChartCard;
