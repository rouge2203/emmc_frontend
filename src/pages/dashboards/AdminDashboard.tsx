import { useCallback, useEffect, useState } from "react";
import {
  AcademicCapIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  IdentificationIcon,
  MusicalNoteIcon,
  PlusIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { GiClarinet } from "react-icons/gi";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import StatTile from "../../components/dashboard/StatTile";
import ChartCard from "../../components/dashboard/ChartCard";
import SectionHeading from "../../components/dashboard/SectionHeading";
import AlertStrip from "../../components/dashboard/AlertStrip";
import QuickAction from "../../components/dashboard/QuickAction";
import DashboardSkeleton from "../../components/dashboard/Skeleton";
import DonutChart from "../../components/dashboard/charts/DonutChart";
import HBarList from "../../components/dashboard/charts/HBarList";
import MiniBarChart from "../../components/dashboard/charts/MiniBarChart";
import StackedBar from "../../components/dashboard/charts/StackedBar";
import YearTrendChart from "../../components/dashboard/charts/YearTrendChart";
import {
  BRAND,
  STATUS,
  formatNumber,
  type DashboardStats,
} from "../../components/dashboard/types";

const PERIOD_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "1", label: "I" },
  { value: "2", label: "II" },
  { value: "3", label: "III" },
];

const AdminDashboard = () => {
  const axiosPrivate = useAxiosPrivate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const fetchStats = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);
      const params = new URLSearchParams({ year: String(selectedYear) });
      if (selectedPeriod) params.append("period", selectedPeriod);

      const response = await axiosPrivate.get<DashboardStats>(
        `admin-dashboard/stats?${params.toString()}`,
      );
      const data = response.data;
      setStats(data);

      // Selected year may not exist in the data (e.g. a brand new calendar
      // year with no enrollments yet) — fall back to the newest that does.
      const years = data.filters.available_years;
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0]);
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { error?: string } } };
      setError(
        anyErr?.response?.data?.error ||
          "Error al cargar los datos del dashboard",
      );
    } finally {
      setIsFetching(false);
    }
  }, [axiosPrivate, selectedYear, selectedPeriod]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const periodLabel = selectedPeriod
    ? `Periodo ${PERIOD_OPTIONS.find((p) => p.value === selectedPeriod)?.label}`
    : "Todos los periodos";
  const scopeLabel = `${periodLabel} · ${selectedYear}`;

  const scopeQuery = `year=${selectedYear}${
    selectedPeriod ? `&period=${selectedPeriod}` : ""
  }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ============ HEADER + SCOPE FILTER ============ */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Panel de Administración
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Resumen general de la escuela
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-xl border-0 bg-white py-2.5 pr-8 pl-4 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-primary"
            >
              {(stats?.filters.available_years ?? [selectedYear]).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedPeriod(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    selectedPeriod === option.value
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!stats ? (
          <div className="mt-6">{!error && <DashboardSkeleton />}</div>
        ) : (
          <>
            {/* ============ PERIOD-SCOPED SECTION ============ */}
            {/* Hold the previous render while refetching — no skeleton flash. */}
            <section
              className={`mt-6 space-y-6 transition-opacity duration-200 ${
                isFetching ? "pointer-events-none opacity-60" : "opacity-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-500">{scopeLabel}</p>
                {isFetching && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="size-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                    Actualizando…
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <StatTile
                  label="Estudiantes activos"
                  value={stats.enrollments.active_students}
                  icon={<UsersIcon className="size-5" />}
                  to="/admin/estudiantes"
                />
                <StatTile
                  label="Cursos matriculados"
                  value={stats.enrollments.active_count}
                  icon={<BookOpenIcon className="size-5" />}
                  to={`/admin/cursos-matriculados?${scopeQuery}`}
                />
                <StatTile
                  label="Becados con matrícula"
                  value={stats.enrollments.active_becados}
                  icon={<AcademicCapIcon className="size-5" />}
                  to="/admin/becados"
                />
                <StatTile
                  label="Alquileres activos"
                  value={stats.instruments.active_loans}
                  icon={<GiClarinet className="size-5" />}
                  to="/admin/instrumentos/alquileres"
                  hint="estado actual"
                />
                <StatTile
                  label="Clases por semana"
                  value={stats.schedules.total_classes_per_week}
                  icon={<ClockIcon className="size-5" />}
                  to="/admin/calendario-de-cursos"
                />
                <StatTile
                  label="Profesores con cursos"
                  value={stats.professors.with_active_enrollments}
                  icon={<UserGroupIcon className="size-5" />}
                  to="/admin/profesores"
                />
              </div>

              <AlertStrip
                alerts={[
                  {
                    label: "Matrículas sin profesor",
                    count: stats.enrollments.missing_professor,
                    to: `/admin/cursos-matriculados?missing_professor=true&${scopeQuery}`,
                  },
                  {
                    label: "Matrículas sin horario",
                    count: stats.enrollments.missing_schedule,
                    to: `/admin/cursos-matriculados?missing_schedule=true&${scopeQuery}`,
                  },
                  {
                    label: "Pagos atrasados",
                    count: stats.payments.overdue,
                    to: "/admin/centro-de-pagos?overdue=true",
                  },
                ]}
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <ChartCard
                  title="Matrículas por carrera"
                  subtitle={scopeLabel}
                  className="lg:col-span-1"
                >
                  <HBarList
                    items={stats.enrollments.by_career.map((item) => ({
                      label: item.career,
                      value: item.count,
                    }))}
                  />
                </ChartCard>

                <ChartCard title="Estado de pagos" subtitle={scopeLabel}>
                  <DonutChart
                    centerLabel="pagos"
                    segments={[
                      {
                        label: "Completados",
                        value: stats.payments.completed,
                        color: STATUS.good,
                      },
                      {
                        label: "En espera",
                        value: stats.payments.pending,
                        color: STATUS.warning,
                      },
                      {
                        label: "Incompletos",
                        value: stats.payments.incomplete,
                        color: STATUS.serious,
                      },
                    ]}
                  />
                  {/* Atrasados overlaps "en espera" and "incompleto" (it is a
                      due-date condition, not a status), so it is a callout
                      rather than a slice — a slice would double-count. */}
                  {stats.payments.overdue > 0 && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm text-red-800">
                        <ClockIcon className="size-4 shrink-0" />
                        Atrasados
                      </span>
                      <span className="text-sm font-semibold text-red-800 tabular-nums">
                        {formatNumber(stats.payments.overdue)}
                      </span>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Estado de matrículas" subtitle={scopeLabel}>
                  <StackedBar
                    segments={[
                      {
                        label: "cursando",
                        value: stats.enrollments.by_status.cursando,
                        color: BRAND.bar,
                      },
                      {
                        label: "aprobado",
                        value: stats.enrollments.by_status.aprobado,
                        color: STATUS.good,
                      },
                      {
                        label: "reprobado",
                        value: stats.enrollments.by_status.reprobado,
                        color: STATUS.critical,
                      },
                      {
                        label: "retirado",
                        value: stats.enrollments.by_status.retirado,
                        color: STATUS.neutral,
                      },
                    ]}
                  />
                </ChartCard>
              </div>

              <ChartCard
                title="Clases por día de la semana"
                subtitle={`Horarios de matrículas activas · ${scopeLabel}`}
              >
                <MiniBarChart
                  items={stats.schedules.by_day.map((day) => ({
                    label: day.day_name.slice(0, 3),
                    fullLabel: day.day_name,
                    value: day.count,
                  }))}
                  emptyMessage="Aún no hay horarios asignados para este periodo"
                />
              </ChartCard>
            </section>

            {/* ============ GENERAL (UNFILTERED) SECTION ============ */}
            <section className="mt-10 space-y-6 border-t border-gray-200 pt-8">
              <SectionHeading
                title="Vista general"
                subtitle="Datos globales del sistema, sin filtro de año ni periodo"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction
                  label="Nuevo estudiante"
                  icon={<PlusIcon className="size-4" />}
                  to="/admin/estudiantes?action=new"
                />
                <QuickAction
                  label="Nueva matrícula"
                  icon={<PlusIcon className="size-4" />}
                  to="/admin/cursos-matriculados?action=new"
                />
                <QuickAction
                  label="Registrar pago"
                  icon={<PlusIcon className="size-4" />}
                  to="/admin/centro-de-pagos?action=new"
                />
                <QuickAction
                  label="Nuevo alquiler"
                  icon={<PlusIcon className="size-4" />}
                  to="/admin/instrumentos/alquileres?action=new"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <StatTile
                  label="Aulas"
                  value={stats.classrooms.total}
                  icon={<BuildingOffice2Icon className="size-5" />}
                  to="/admin/aulas"
                />
                <StatTile
                  label="Expedientes"
                  value={stats.users.total_students_all}
                  icon={<IdentificationIcon className="size-5" />}
                  to="/admin/estudiantes"
                  hint="estudiantes registrados"
                />
                <StatTile
                  label="Profesores"
                  value={stats.users.total_professors_all}
                  icon={<UserGroupIcon className="size-5" />}
                  to="/admin/profesores"
                />
                <StatTile
                  label="Cursos"
                  value={stats.courses.total_real}
                  icon={<ClipboardDocumentListIcon className="size-5" />}
                  to="/admin/cursos"
                  hint="sin contar matrículas"
                />
                <StatTile
                  label="Instrumentos"
                  value={stats.instruments.total}
                  icon={<MusicalNoteIcon className="size-5" />}
                  to="/admin/instrumentos/inventario"
                  hint="en inventario"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartCard
                  title="Matrículas por carrera"
                  subtitle="Histórico completo, todos los años"
                >
                  <HBarList
                    items={stats.enrollments.matriculas_by_career_all_time.map(
                      (item) => ({ label: item.career, value: item.count }),
                    )}
                    emptyMessage="Sin matrículas registradas"
                  />
                </ChartCard>

                <ChartCard
                  title="Tendencia de matrículas por año"
                  subtitle="Últimos 5 años"
                  action={
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarDaysIcon className="size-4" />
                      {selectedYear} seleccionado
                    </span>
                  }
                >
                  <YearTrendChart
                    data={stats.enrollments.by_year}
                    selectedYear={selectedYear}
                  />
                </ChartCard>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
