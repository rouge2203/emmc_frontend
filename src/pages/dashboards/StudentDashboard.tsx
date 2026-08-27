import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  AcademicCapIcon,
  ArrowRightIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import PeriodSelector from "../../components/PeriodSelector";
import TeacherWeekCalendar, {
  type WeekCalendarEvent,
} from "../../components/dashboard/TeacherWeekCalendar";
import { formatGrade } from "../../utils/grades";

interface NewsItem {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string | null;
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
  professor_name: string | null;
  enrollment_id: number;
  period: number;
  year: number;
}

interface Schedule {
  day: string;
  day_name: string;
  hour: string | null;
  end_hour: string | null;
  classroom: string | null;
}

interface AssignedCourse {
  id: number;
  name: string | null;
  code: string | null;
  career_name: string | null;
}

interface Enrollment {
  id: number;
  course_name: string | null;
  course_code: string | null;
  career_name: string | null;
  is_matricula: boolean;
  assigned_course: AssignedCourse | null;
  status: string;
  grade: number | null;
  week_duration: number;
  period: number;
  year: number;
  professor: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  schedules: Schedule[];
}

interface AvailablePeriod {
  period: number;
  year: number;
}

interface DashboardData {
  stats: {
    active_courses_count: number;
    past_courses_count: number;
    classes_per_week: number;
  };
  schedule_table: ScheduleTableItem[];
  active_enrollments: Enrollment[];
  past_enrollments: Enrollment[];
  available_periods: AvailablePeriod[];
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
  retirado: {
    label: "Retirado",
    className: "bg-gray-50 text-gray-600 ring-gray-500/10",
  },
};

const StudentDashboard = () => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [news, setNews] = useState<NewsItem[]>([]);

  // Local state for period selections in each section
  const [selectedActivePeriod, setSelectedActivePeriod] = useState<string>("");
  const [schedulePeriod, setSchedulePeriod] = useState<AvailablePeriod | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardResponse, newsResponse] = await Promise.all([
        axiosPrivate.get("courses/student-dashboard"),
        axiosPrivate.get("news/manage-news"),
      ]);
      setDashboardData(dashboardResponse.data);
      setNews(newsResponse.data.news || []);

      // Set default selected periods to the first available period
      if (dashboardResponse.data.available_periods?.length > 0) {
        const firstPeriod = dashboardResponse.data.available_periods[0];
        setSelectedActivePeriod(`${firstPeriod.period}-${firstPeriod.year}`);

        // The week opens on the most recent period, not the oldest one.
        const periods: AvailablePeriod[] =
          dashboardResponse.data.available_periods;
        const latest = [...periods].sort(
          (a, b) => a.year - b.year || a.period - b.period,
        )[periods.length - 1];
        setSchedulePeriod(latest);
      }
    } catch (err: unknown) {
      console.error("Error fetching student dashboard data:", err);
      setError("Error al cargar el dashboard del estudiante");
    } finally {
      setLoading(false);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter active enrollments by selected period
  const filteredActiveEnrollments = useMemo(() => {
    if (!dashboardData?.active_enrollments || !selectedActivePeriod) return [];
    const [period, year] = selectedActivePeriod.split("-").map(Number);
    return dashboardData.active_enrollments.filter(
      (e) => e.period === period && e.year === year && e.status === "cursando",
    );
  }, [dashboardData?.active_enrollments, selectedActivePeriod]);

  // Filter schedule table by selected period
  const filteredSchedule = useMemo(() => {
    if (!dashboardData?.schedule_table || !schedulePeriod) return [];
    return dashboardData.schedule_table.filter(
      (s) => s.period === schedulePeriod.period && s.year === schedulePeriod.year,
    );
  }, [dashboardData?.schedule_table, schedulePeriod]);

  // The week board only needs the professor here: the student is the viewer.
  const scheduleEvents = useMemo<WeekCalendarEvent[]>(
    () =>
      filteredSchedule.map((s) => ({
        id: s.id,
        day: s.day,
        day_name: s.day_name,
        day_order: s.day_order,
        hour: s.hour,
        end_hour: s.end_hour,
        classroom: s.classroom,
        course_name: s.course_name,
        course_code: s.course_code,
        professor_name: s.professor_name,
        enrollment_id: s.enrollment_id,
      })),
    [filteredSchedule],
  );

  // Get all past enrollments (not cursando)
  const allPastEnrollments = useMemo(() => {
    if (!dashboardData?.past_enrollments) return [];
    return dashboardData.past_enrollments.filter(
      (e) => e.status !== "cursando",
    );
  }, [dashboardData?.past_enrollments]);

  const availablePeriods = useMemo(
    () => dashboardData?.available_periods ?? [],
    [dashboardData?.available_periods],
  );

  // Get period options for selects
  const periodOptions = useMemo(() => {
    if (!dashboardData?.available_periods) return [];
    return dashboardData.available_periods.map((p) => ({
      value: `${p.period}-${p.year}`,
      label: `Periodo ${p.period === 1 ? "I" : "II"} - ${p.year}`,
    }));
  }, [dashboardData?.available_periods]);

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

  return (
    <div className="relative isolate overflow-hidden">
      <div className="space-y-16 py-6 xl:space-y-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NewspaperIcon className="h-6 w-6 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Noticias</h2>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <ul role="list" className="divide-y divide-gray-100">
              {news.length === 0 ? (
                <li className="px-6 py-10 text-center text-sm text-gray-500">
                  No hay noticias disponibles.
                </li>
              ) : (
                news.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-5 py-8 px-6 transition duration-300 hover:bg-gray-50 sm:flex-row sm:gap-x-8"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-full aspect-square rounded-xl bg-gray-50 object-cover sm:size-40 sm:flex-none"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-xl bg-gray-100 text-[11px] uppercase tracking-wide text-gray-400 flex items-center justify-center sm:size-40 sm:flex-none">
                        Sin imagen
                      </div>
                    )}
                    <div className="flex-auto">
                      <p className="text-lg font-semibold text-gray-900">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-3 text-base/7 text-gray-600 whitespace-pre-line">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base/7 font-semibold text-gray-900">
              Mis cursos activos
            </h2>
          </div>

          {periodOptions.length > 0 && (
            <div className="mt-6 max-w-xs">
              <label
                htmlFor="active-period-select"
                className="block text-sm/6 font-medium text-gray-900"
              >
                Periodo
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="active-period-select"
                  value={selectedActivePeriod}
                  onChange={(e) => setSelectedActivePeriod(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:text-sm/6"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                />
              </div>
            </div>
          )}

          {filteredActiveEnrollments.length === 0 ? (
            <div className="mt-6 py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-md">
              No tienes cursos activos en este periodo
            </div>
          ) : (
            <ul
              role="list"
              className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8"
            >
              {filteredActiveEnrollments.map((enrollment) => {
                const professorName = enrollment.professor
                  ? `${enrollment.professor.first_name || ""} ${
                      enrollment.professor.last_name || ""
                    }`.trim()
                  : "Profesor pendiente";
                // For matricula enrollments, show the assigned subject once set.
                const displayName =
                  enrollment.assigned_course?.name ||
                  enrollment.course_name ||
                  (enrollment.is_matricula ? "Matrícula" : "Curso sin nombre");
                const displayCode =
                  enrollment.assigned_course?.code || enrollment.course_code;
                const displayCareer =
                  enrollment.assigned_course?.career_name ||
                  enrollment.career_name;
                return (
                  <li
                    key={enrollment.id}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6">
                      <div
                        translate="no"
                        className="flex size-12 flex-none items-center justify-center rounded-lg bg-primary text-white font-semibold text-lg"
                      >
                        {displayName
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm/6 font-medium text-gray-900 truncate">
                          {displayName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {displayCode}
                          {enrollment.is_matricula &&
                            !enrollment.assigned_course &&
                            " · Matrícula"}
                        </div>
                      </div>
                      <Link
                        to={`/student/course/${enrollment.id}`}
                        className="flex items-center gap-x-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition group-hover:shadow-md"
                      >
                        Ir al curso
                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                    <dl className="-my-3 divide-y divide-gray-100 px-6 py-4 text-sm/6">
                      <div className="flex justify-between gap-x-4 py-3">
                        <dt className="text-gray-500">Profesor</dt>
                        <dd className="text-gray-700 text-right truncate max-w-40">
                          {professorName || "Sin asignar"}
                        </dd>
                      </div>
                      {displayCareer && (
                        <div className="flex justify-between gap-x-4 py-3">
                          <dt className="text-gray-500">Carrera</dt>
                          <dd className="text-gray-700 text-right truncate max-w-40">
                            {displayCareer}
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
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mx-auto max-w-2xl text-base font-semibold text-gray-900 lg:mx-0 lg:max-w-none">
              Horario semanal
            </h2>

            {availablePeriods.length > 0 && schedulePeriod && (
              <div className="mt-6">
                <PeriodSelector
                  idPrefix="schedule"
                  available={availablePeriods}
                  year={schedulePeriod.year}
                  period={schedulePeriod.period}
                  onChange={setSchedulePeriod}
                />
              </div>
            )}
          </div>
          <div className="mt-6 overflow-hidden border-t border-gray-100">
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <TeacherWeekCalendar
                  events={scheduleEvents}
                  audience="student"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base/7 font-semibold text-gray-900">
              Cursos pasados
            </h2>
          </div>
          {allPastEnrollments.length === 0 ? (
            <div className="mt-6 py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
              No tienes cursos pasados
            </div>
          ) : (
            <ul
              role="list"
              className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 xl:gap-x-8"
            >
              {allPastEnrollments.map((enrollment) => {
                const professorName = enrollment.professor
                  ? `${enrollment.professor.first_name || ""} ${
                      enrollment.professor.last_name || ""
                    }`.trim()
                  : "Profesor pendiente";
                return (
                  <li
                    key={enrollment.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    <div className="flex items-center gap-x-4 border-b border-gray-900/5 bg-gray-50 p-6">
                      <div
                        translate="no"
                        className="flex size-12 flex-none items-center justify-center rounded-lg bg-gray-900 text-white font-semibold text-lg"
                      >
                        {enrollment.course_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm/6 font-medium text-gray-900 truncate">
                          {enrollment.course_name || "Curso sin nombre"}
                        </div>
                        <div
                          translate="no"
                          className="text-xs text-gray-500 truncate"
                        >
                          {enrollment.course_code}
                        </div>
                      </div>
                      <Link
                        to={`/student/course/${enrollment.id}`}
                        className="flex items-center gap-x-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Ver
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    </div>
                    <dl className="-my-3 divide-y divide-gray-100 px-6 py-4 text-sm/6">
                      <div className="flex justify-between gap-x-4 py-3">
                        <dt className="text-gray-500">Profesor</dt>
                        <dd className="text-gray-700 text-right truncate max-w-40">
                          {professorName || "Sin asignar"}
                        </dd>
                      </div>
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
                      {enrollment.grade !== null && (
                        <div className="flex justify-between gap-x-4 py-3">
                          <dt className="text-gray-500">Nota Final</dt>
                          <dd className="text-gray-700 text-right font-medium">
                            {formatGrade(enrollment.grade)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-primary/5 via-white to-amber-50/40 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <AcademicCapIcon className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Consejo rapido
                </p>
                <p className="text-sm text-gray-600">
                  Revisa cada semana los recursos y tareas disponibles para no
                  perder contenido importante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
