import { Link } from "react-router-dom";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatNumber } from "./types";

export interface DashboardAlert {
  label: string;
  count: number;
  to: string;
}

interface AlertStripProps {
  alerts: DashboardAlert[];
}

const AlertStrip = ({ alerts }: AlertStripProps) => {
  const visible = alerts.filter((alert) => alert.count > 0);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ExclamationTriangleIcon className="size-5 shrink-0 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-900">
          Requieren atención
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((alert) => (
          <Link
            key={alert.label}
            to={alert.to}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
          >
            {alert.label}
            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 tabular-nums">
              {formatNumber(alert.count)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AlertStrip;
