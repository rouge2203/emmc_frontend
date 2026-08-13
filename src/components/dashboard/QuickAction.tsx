import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface QuickActionProps {
  label: string;
  icon: ReactNode;
  to: string;
}

/** One brand color for all actions — these are buttons, not data series. */
const QuickAction = ({ label, icon, to }: QuickActionProps) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  >
    <span className="shrink-0">{icon}</span>
    {label}
  </Link>
);

export default QuickAction;
