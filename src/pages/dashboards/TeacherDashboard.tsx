import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  AcademicCapIcon,
  UsersIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface Schedule {
  day: string;
  day_name: string;
  hour: string | null;
  end_hour: string | null;
  classroom: string | null;
}

interface ScheduleTableItem {
  id: number;
  day: string;
  day_name: string;
  day_order: number;
  hour: string | null;
  end_hour: string | null;
  classroom: string | null;
  course_name: string | null;
  course_code: string | null;
  student_name: string | null;
  student_id: number | null;
  enrollment_id: number;
}

interface Enrollment {
  id: number;
  course_name: string | null;
  course_code: string | null;
  career_name: string | null;
  student_id: number | null;
  student_name: string | null;
  student_email: string | null;
  status: string;
  grade: number | null;
  week_duration: number;
  schedules: Schedule[];
}

interface DashboardData {
  period: number;
  year: number;
  stats: {
    courses_count: number;
    students_count: number;
    classes_per_week: number;
  };
  schedule_table: ScheduleTableItem[];
  enrollments: Enrollment[];
}

const statusLabels: Record<string, { label: string; className: string }> = {
  cursando: {
    label: "Cursando",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  aprobado: {
    label: "Aprobado",
    className: "bg-green-50 text-green-700 ring-green-600/20",
  },
  reprobado: {
    label: "Reprobado",
    className: "bg-red-50 text-red-700 ring-red-600/10",
  },
};

const TeacherDashboard = () => {
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );

  // Get current period and year from URL params
  const searchParams = new URLSearchParams(location.search);
  const currentPeriod = searchParams.get("period") || "1";
  const currentYear = searchParams.get("year") || "2026";

  const periodLabel =
    currentPeriod === "1" ? "Periodo I" : `Periodo ${currentPeriod}`;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosPrivate.get(
          `courses/teacher-dashboard?period=${currentPeriod}&year=${currentYear}`
        );
        setDashboardData(response.data);
      } catch (err: unknown) {
        console.error("Error fetching dashboard data:", err);
        setError("Error al cargar los datos del dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentPeriod, currentYear, axiosPrivate]);

  // Group schedule by day
  const groupScheduleByDay = (schedules: ScheduleTableItem[]) => {
    const grouped: Record<string, ScheduleTableItem[]> = {};
    schedules.forEach((schedule) => {
      if (!grouped[schedule.day_name]) {
        grouped[schedule.day_name] = [];
      }
      grouped[schedule.day_name].push(schedule);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const groupedSchedule = dashboardData?.schedule_table
    ? groupScheduleByDay(dashboardData.schedule_table)
    : {};

  return (
    <div className="relative isolate overflow-hidden">
      {/* Secondary navigation header */}
      <header className="pt-6 pb-4 sm:pb-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8">
          <h1 className="text-base/7 font-semibold text-gray-900">
            Resumen de Cuatrimestre
          </h1>
          <div className="order-last flex w-full gap-x-8 text-sm/6 font-semibold sm:order-0 sm:w-auto sm:border-l sm:border-gray-200 sm:pl-6 sm:text-sm/7">
            <span className="text-primary">
              {periodLabel} - {currentYear}
            </span>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="border-b border-b-gray-900/10 lg:border-t lg:border-t-gray-900/5">
        <dl className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:px-2 xl:px-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-10 sm:px-6 lg:border-t-0 xl:px-8">
            <dt className="text-sm/6 font-medium text-gray-500 flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5 text-gray-400" />
              Mis Cursos
            </dt>
            <dd className="w-full flex-none text-3xl/10 font-medium tracking-tight text-gray-900">
              {dashboardData?.stats.courses_count || 0}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-10 sm:border-l sm:px-6 lg:border-t-0 xl:px-8">
            <dt className="text-sm/6 font-medium text-gray-500 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-gray-400" />
              Estudiantes
            </dt>
            <dd className="w-full flex-none text-3xl/10 font-medium tracking-tight text-gray-900">
              {dashboardData?.stats.students_count || 0}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-10 sm:px-6 lg:border-t-0 lg:border-l xl:px-8">
            <dt className="text-sm/6 font-medium text-gray-500 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
              Clases por Semana
            </dt>
            <dd className="w-full flex-none text-3xl/10 font-medium tracking-tight text-gray-900">
              {dashboardData?.stats.classes_per_week || 0}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-16 py-16 xl:space-y-20">
        

        {/* Course enrollments list */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="flex items-center justify-between">
              <h2 className="text-base/7 font-semibold text-gray-900">
                Mis Estudiantes
              </h2>
            </div>
            {dashboardData?.enrollments.length === 0 ? (
              <div className="mt-6 py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                No tienes estudiantes asignados para este periodo
              </div>
            ) : (
              <ul
                role="list"
                className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8"
              >
                {dashboardData?.enrollments.map((enrollment) => (
                  <li
                    key={enrollment.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md"
                  >
                    <div className="flex items-center gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6">
                      <div className="flex size-12 flex-none items-center justify-center rounded-lg bg-primary text-white font-semibold text-lg">
                        {enrollment.student_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm/6 font-medium text-gray-900 truncate">
                          {enrollment.student_name || "Sin nombre"}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {enrollment.course_code}
                        </div>
                      </div>
                      <Link
                        to={`/teacher/course/${enrollment.id}`}
                        className="flex items-center gap-x-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                      >
                        Ver
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    </div>
                    <dl className="-my-3 divide-y divide-gray-100 px-6 py-4 text-sm/6">
                      <div className="flex justify-between gap-x-4 py-3">
                        <dt className="text-gray-500">Curso</dt>
                        <dd className="text-gray-700 text-right">
                          {enrollment.course_name}
                        </dd>
                      </div>
                      {enrollment.career_name && (
                        <div className="flex justify-between gap-x-4 py-3">
                          <dt className="text-gray-500">Carrera</dt>
                          <dd className="text-gray-700 text-right truncate max-w-32">
                            {enrollment.career_name}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-x-4 py-3">
                        <dt className="text-gray-500">Estado</dt>
                        <dd className="flex items-start gap-x-2">
                          <div
                            className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              statusLabels[enrollment.status]?.className ||
                              "bg-gray-50 text-gray-600 ring-gray-500/10"
                            }`}
                          >
                            {statusLabels[enrollment.status]?.label ||
                              enrollment.status}
                          </div>
                        </dd>
                      </div>
                      {enrollment.schedules.length > 0 && (
                        <div className="flex justify-between gap-x-4 py-3">
                          <dt className="text-gray-500">Horario</dt>
                          <dd className="text-gray-700 text-right">
                            {enrollment.schedules.map((s, i) => (
                              <div key={i} className="text-xs">
                                {s.day_name} {s.hour}
                                {s.end_hour && ` - ${s.end_hour}`}
                              </div>
                            ))}
                          </dd>
                        </div>
                      )}
                      {enrollment.grade !== null && (
                        <div className="flex justify-between gap-x-4 py-3">
                          <dt className="text-gray-500">Nota Final</dt>
                          <dd className="font-medium text-gray-900">
                            {enrollment.grade}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Schedule table */}
        <div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mx-auto max-w-2xl text-base font-semibold text-gray-900 lg:mx-0 lg:max-w-none">
              Horario Semanal
            </h2>
          </div>
          <div className="mt-6 overflow-hidden border-t border-gray-100">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
                {Object.keys(groupedSchedule).length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No hay clases programadas para este periodo
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="sr-only">
                      <tr>
                        <th>Hora</th>
                        <th className="hidden sm:table-cell">Curso</th>
                        <th>Detalles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedSchedule).map(
                        ([dayName, schedules]) => (
                          <>
                            <tr
                              key={dayName}
                              className="text-sm/6 text-gray-900"
                            >
                              <th
                                scope="colgroup"
                                colSpan={3}
                                className="relative isolate py-2 font-semibold"
                              >
                                {dayName}
                                <div className="absolute inset-y-0 right-full -z-10 w-screen border-b border-gray-200 bg-gray-50"></div>
                                <div className="absolute inset-y-0 left-0 -z-10 w-screen border-b border-gray-200 bg-gray-50"></div>
                              </th>
                            </tr>
                            {schedules.map((schedule) => (
                              <tr key={schedule.id}>
                                <td className="relative py-5 pr-6">
                                  <div className="flex gap-x-6">
                                    <CalendarDaysIcon className="hidden h-6 w-5 flex-none text-gray-400 sm:block" />
                                    <div className="flex-auto">
                                      <div className="flex items-start gap-x-3">
                                        <div className="text-sm/6 font-medium text-gray-900">
                                          {schedule.hour || "Sin hora"}{" "}
                                          {schedule.end_hour &&
                                            `- ${schedule.end_hour}`}
                                        </div>
                                        {schedule.classroom && (
                                          <div className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                            {schedule.classroom}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute right-full bottom-0 h-px w-screen bg-gray-100"></div>
                                  <div className="absolute bottom-0 left-0 h-px w-screen bg-gray-100"></div>
                                </td>
                                <td className="hidden py-5 pr-6 sm:table-cell">
                                  <div className="text-sm/6 text-gray-900">
                                    {schedule.course_name}
                                  </div>
                                  <div className="mt-1 text-xs/5 text-gray-500">
                                    {schedule.course_code}
                                  </div>
                                </td>
                                <td className="py-5 text-right">
                                  <div className="text-sm/6 text-gray-900">
                                    {schedule.student_name}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
