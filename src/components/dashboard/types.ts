export interface DashboardStats {
  filters: {
    year: number;
    period: number | null;
    available_years: number[];
  };
  users: {
    total_students: number;
    total_professors: number;
    total_admins: number;
    total_users: number;
    // Every record on file, regardless of portal access (is_active).
    // Optional: the frontend and backend deploy independently, so a newer
    // frontend can briefly talk to a backend that doesn't send these yet.
    total_students_all?: number;
    total_professors_all?: number;
  };
  enrollments: {
    active_count: number;
    active_students: number;
    active_becados?: number;
    by_status: {
      cursando: number;
      aprobado: number;
      reprobado: number;
      retirado: number;
    };
    by_period: Record<string, number>;
    students_by_period: Record<string, number>;
    by_year: { year: number; count: number }[];
    by_career: { career: string; count: number }[];
    /** All years, matricula enrollments only — careers live on those courses. */
    matriculas_by_career_all_time?: { career: string; count: number }[];
    missing_professor: number;
    missing_schedule: number;
  };
  professors: {
    total: number;
    with_active_enrollments: number;
  };
  instruments: {
    total: number;
    available: number;
    rented: number;
    active_loans: number;
    overdue_loans: number;
    by_type: { type: string; count: number }[];
  };
  schedules: {
    total_classes_per_week: number;
    by_day: { day: string; day_name: string; count: number }[];
  };
  payments: {
    pending: number;
    completed: number;
    incomplete: number;
    overdue: number;
  };
  classrooms?: {
    total: number;
  };
  courses: {
    total: number;
    total_careers: number;
    total_real?: number;
  };
}

/**
 * Brand sequential ramp, generated in OKLab from --color-primary (#155c95)
 * holding hue. Magnitude bars use the brand step for every bar; the light
 * steps are tracks and tints only, never a per-bar value ramp.
 */
export const BRAND = {
  bar: "#155c95",
  track: "#e9f1f8",
  muted: "#c3c2b7",
} as const;

/** Status palette — reserved for state, never reused as a series color. */
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  neutral: "#898781",
} as const;

export const formatNumber = (value: number): string =>
  value.toLocaleString("es-CR");
