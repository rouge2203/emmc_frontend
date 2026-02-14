import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  UsersIcon,
  AcademicCapIcon,
  MusicalNoteIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { PiGuitar, PiStudent } from "react-icons/pi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";

interface DashboardStats {
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
  };
  enrollments: {
    active_count: number;
    active_students: number;
    by_status: {
      cursando: number;
      aprobado: number;
      reprobado: number;
    };
    by_period: {
      1: number;
      2: number;
      3: number;
    };
    by_year: { year: number; count: number }[];
    by_career: { career: string; count: number }[];
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
  courses: {
    total: number;
    total_careers: number;
  };
}

const AdminDashboard = () => {
  const axiosPrivate = useAxiosPrivate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedPeriod, setSelectedPeriod] = useState<number | "">("");

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedYear, selectedPeriod]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("year", selectedYear.toString());
      if (selectedPeriod) {
        params.append("period", selectedPeriod.toString());
      }
      const response = await axiosPrivate.get(
        `admin-dashboard/stats?${params.toString()}`,
      );
      setStats(response.data);
      if (
        response.data.filters.available_years &&
        response.data.filters.available_years.length > 0 &&
        !response.data.filters.available_years.includes(selectedYear)
      ) {
        setSelectedYear(response.data.filters.available_years[0]);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Error al cargar los datos del dashboard</p>
      </div>
    );
  }

  const maxEnrollmentByPeriod = Math.max(
    stats.enrollments.by_period[1],
    stats.enrollments.by_period[2],
    stats.enrollments.by_period[3],
    1,
  );

  const maxClassesByDay = Math.max(
    ...stats.schedules.by_day.map((d) => d.count),
    1,
  );

  const maxEnrollmentByYear = Math.max(
    ...stats.enrollments.by_year.map((y) => y.count),
    1,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header with Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Panel de Administracion
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Resumen general del sistema
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
              >
                {stats.filters.available_years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={selectedPeriod}
                onChange={(e) =>
                  setSelectedPeriod(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
              >
                <option value="">Todos los periodos</option>
                <option value="1">Periodo I</option>
                <option value="2">Periodo II</option>
                <option value="3">Periodo III</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          <StatCard
            title="Estudiantes"
            value={stats.users.total_students}
            icon={<PiStudent className="h-6 w-6" />}
            color="indigo"
            link="/admin/estudiantes"
          />
          <StatCard
            title="Profesores"
            value={stats.users.total_professors}
            icon={<LiaChalkboardTeacherSolid className="h-6 w-6" />}
            color="green"
            link="/admin/profesores"
          />
          <StatCard
            title="Matriculas Activas"
            value={stats.enrollments.active_count}
            icon={<AcademicCapIcon className="h-6 w-6" />}
            color="blue"
            link="/admin/cursos-matriculados"
          />
          <StatCard
            title="Instrumentos"
            value={stats.instruments.total}
            icon={<PiGuitar className="h-6 w-6" />}
            color="amber"
            link="/admin/instrumentos/inventario"
          />
          <StatCard
            title="Prestamos Activos"
            value={stats.instruments.active_loans}
            icon={<MusicalNoteIcon className="h-6 w-6" />}
            color="purple"
            link="/admin/instrumentos/alquileres"
          />
          <StatCard
            title="Clases/Semana"
            value={stats.schedules.total_classes_per_week}
            icon={<CalendarDaysIcon className="h-6 w-6" />}
            color="cyan"
            link="/admin/calendario-de-cursos"
          />
        </div>

        {/* Alerts Section */}
        {(stats.enrollments.missing_professor > 0 ||
          stats.enrollments.missing_schedule > 0 ||
          stats.instruments.overdue_loans > 0 ||
          stats.payments.overdue > 0) && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-amber-800">
                Alertas que requieren atencion
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.enrollments.missing_professor > 0 && (
                <AlertItem
                  label="Matriculas sin profesor"
                  value={stats.enrollments.missing_professor}
                  link="/admin/cursos-matriculados?missing_professor=true"
                />
              )}
              {stats.enrollments.missing_schedule > 0 && (
                <AlertItem
                  label="Matriculas sin horario"
                  value={stats.enrollments.missing_schedule}
                  link="/admin/cursos-matriculados?missing_schedule=true"
                />
              )}
              {stats.instruments.overdue_loans > 0 && (
                <AlertItem
                  label="Prestamos vencidos"
                  value={stats.instruments.overdue_loans}
                  link="/admin/instrumentos/alquileres"
                />
              )}
              {stats.payments.overdue > 0 && (
                <AlertItem
                  label="Pagos atrasados"
                  value={stats.payments.overdue}
                  link="/admin/centro-de-pagos"
                />
              )}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Enrollments by Period */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Matriculas por Periodo ({selectedYear})
              </h3>
              <Link
                to="/admin/cursos-matriculados"
                className="text-sm text-primary hover:text-primary"
              >
                Ver todas
              </Link>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((period) => (
                <div key={period}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Periodo {period}</span>
                    <span className="font-medium">
                      {
                        stats.enrollments.by_period[
                          period as keyof typeof stats.enrollments.by_period
                        ]
                      }{" "}
                      matriculas
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          (stats.enrollments.by_period[
                            period as keyof typeof stats.enrollments.by_period
                          ] /
                            maxEnrollmentByPeriod) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Status breakdown */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Estado de matriculas
              </h4>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-gray-600">
                    Cursando: {stats.enrollments.by_status.cursando}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-gray-600">
                    Aprobado: {stats.enrollments.by_status.aprobado}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-gray-600">
                    Reprobado: {stats.enrollments.by_status.reprobado}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Classes by Day */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Clases por Dia de la Semana
              </h3>
              <Link
                to="/admin/calendario-de-cursos"
                className="text-sm text-primary hover:text-primary"
              >
                Ver calendario
              </Link>
            </div>
            <div className="space-y-3">
              {stats.schedules.by_day.map((day) => (
                <div key={day.day}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 w-24">{day.day_name}</span>
                    <span className="font-medium">{day.count} clases</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-cyan-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${(day.count / maxClassesByDay) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instrument Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Instrumentos
              </h3>
              <Link
                to="/admin/instrumentos/inventario"
                className="text-sm text-primary hover:text-primary"
              >
                Ver inventario
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {stats.instruments.available}
                </p>
                <p className="text-sm text-green-600">Disponibles</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">
                  {stats.instruments.rented}
                </p>
                <p className="text-sm text-amber-600">En prestamo</p>
              </div>
            </div>
            {stats.instruments.by_type.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Por tipo de instrumento
                </h4>
                <div className="space-y-2">
                  {stats.instruments.by_type.slice(0, 5).map((item) => (
                    <div
                      key={item.type}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">{item.type}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Professor Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Profesores</h3>
              <Link
                to="/admin/profesores"
                className="text-sm text-primary hover:text-primary"
              >
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats.professors.total}
                </p>
                <p className="text-sm text-primary">Total registrados</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {stats.professors.with_active_enrollments}
                </p>
                <p className="text-sm text-green-600">Con cursos activos</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <p>
                {stats.professors.total > 0
                  ? Math.round(
                      (stats.professors.with_active_enrollments /
                        stats.professors.total) *
                        100,
                    )
                  : 0}
                % de los profesores tienen cursos asignados en el periodo
                seleccionado.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enrollment Trends */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Tendencia de Matriculas por Ano
                </h3>
              </div>
            </div>
            <div className="space-y-3">
              {stats.enrollments.by_year.map((item) => (
                <div key={item.year}>
                  <div className="flex justify-between text-sm mb-1">
                    <span
                      className={`${
                        item.year === selectedYear
                          ? "font-bold text-primary"
                          : "text-gray-600"
                      }`}
                    >
                      {item.year}
                    </span>
                    <span className="font-medium">{item.count} matriculas</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        item.year === selectedYear
                          ? "bg-primary"
                          : "bg-gray-400"
                      }`}
                      style={{
                        width: `${(item.count / maxEnrollmentByYear) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">Pagos</h3>
              </div>
              <Link
                to="/admin/centro-de-pagos"
                className="text-sm text-primary hover:text-primary"
              >
                Ver todos
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-sm text-gray-600">Completados</span>
                </div>
                <span className="font-medium">{stats.payments.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-sm text-gray-600">Pendientes</span>
                </div>
                <span className="font-medium">{stats.payments.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-sm text-gray-600">Incompletos</span>
                </div>
                <span className="font-medium">{stats.payments.incomplete}</span>
              </div>
              {stats.payments.overdue > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Atrasados</span>
                  </div>
                  <span className="font-medium text-red-600">
                    {stats.payments.overdue}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enrollments by Career */}
        {stats.enrollments.by_career.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Matriculas por Carrera ({selectedYear})
              </h3>
              <Link
                to="/admin/catedra"
                className="text-sm text-primary hover:text-primary"
              >
                Ver carreras
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {stats.enrollments.by_career.map((item) => (
                <div
                  key={item.career}
                  className="bg-gray-50 rounded-lg p-4 text-center"
                >
                  <p className="text-xl font-bold text-gray-900">
                    {item.count}
                  </p>
                  <p
                    className="text-sm text-gray-600 truncate"
                    title={item.career}
                  >
                    {item.career}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Acciones Rapidas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickActionButton
              label="Nuevo Estudiante"
              icon={<PiStudent className="h-5 w-5" />}
              link="/admin/estudiantes"
              color="indigo"
            />
            <QuickActionButton
              label="Nueva Matricula"
              icon={<AcademicCapIcon className="h-5 w-5" />}
              link="/admin/cursos-matriculados"
              color="blue"
            />
            <QuickActionButton
              label="Registrar Pago"
              icon={<BanknotesIcon className="h-5 w-5" />}
              link="/admin/centro-de-pagos"
              color="green"
            />
            <QuickActionButton
              label="Nuevo Prestamo"
              icon={<PiGuitar className="h-5 w-5" />}
              link="/admin/instrumentos/alquileres"
              color="amber"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  icon,
  color,
  link,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  link: string;
}) => {
  const colorClasses: Record<
    string,
    { bg: string; text: string; iconBg: string }
  > = {
    indigo: {
      bg: "bg-indigo-50",
      text: "text-primary",
      iconBg: "bg-primary",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      iconBg: "bg-green-100",
    },
    blue: { bg: "bg-blue-50", text: "text-blue-700", iconBg: "bg-blue-100" },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      iconBg: "bg-amber-100",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      iconBg: "bg-purple-100",
    },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-700", iconBg: "bg-cyan-100" },
  };

  const colors = colorClasses[color] || colorClasses.indigo;

  return (
    <Link
      to={link}
      className={`${colors.bg} rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="flex items-center gap-3">
        <div className={`${colors.iconBg} ${colors.text} p-2 rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
          <p className="text-xs text-gray-600">{title}</p>
        </div>
      </div>
    </Link>
  );
};

// Alert Item Component
const AlertItem = ({
  label,
  value,
  link,
}: {
  label: string;
  value: number;
  link: string;
}) => (
  <Link
    to={link}
    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
  >
    <span className="text-sm text-amber-800">{label}</span>
    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-sm font-medium">
      {value}
    </span>
  </Link>
);

// Quick Action Button Component
const QuickActionButton = ({
  label,
  icon,
  link,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  link: string;
  color: string;
}) => {
  const colorClasses: Record<string, string> = {
    indigo: "bg-primary hover:bg-primary",
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    amber: "bg-amber-600 hover:bg-amber-700",
  };

  return (
    <Link
      to={link}
      className={`${
        colorClasses[color] || colorClasses.indigo
      } text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-colors`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
};

export default AdminDashboard;
