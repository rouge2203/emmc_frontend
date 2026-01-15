import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  FolderIcon,
  ChevronDownIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import ContentPreviewDrawer from "../../components/drawers/student_drawers/ContentPreviewDrawer";

interface Schedule {
  id: number;
  day: string;
  day_name: string;
  hour: string | null;
  end_hour: string | null;
  classroom: string | null;
}

interface Assignment {
  id: number;
  week: number | null;
  date: string | null;
  title: string;
  description: string | null;
  points: number | null;
  grade: number | null;
  comment_grade: string | null;
  assignment_file_url: string | null;
  created_at: string | null;
}

interface Resource {
  id: number;
  week: number | null;
  title: string;
  description: string | null;
  resource_file_url: string | null;
  created_at: string | null;
}

interface CourseData {
  enrollment: {
    id: number;
    course: {
      id: number;
      name: string;
      code: string;
      description: string | null;
    };
    career_name: string | null;
    student: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
    professor: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    period: number;
    year: number;
    week_duration: number;
    price: number;
    status: string;
    grade: number | null;
    professor_observation: string | null;
    schedules: Schedule[];
  };
  assignments: Assignment[];
  resources: Resource[];
  stats: {
    total_assignments: number;
    graded_assignments: number;
    average_grade: number | null;
    total_points_obtained: number;
    total_points_available: number;
  };
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

export default function CourseDashboard() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [previewItem, setPreviewItem] = useState<{
    type: "assignment" | "resource";
    data: Assignment | Resource;
  } | null>(null);

  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `courses/student-course/${enrollmentId}`
      );
      setCourseData(response.data);
    } catch (err: unknown) {
      console.error("Error fetching course data:", err);
      setError("Error al cargar los datos del curso");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enrollmentId) {
      fetchCourseData();
    }
  }, [enrollmentId]);

  const weeks = useMemo(() => {
    const duration = courseData?.enrollment.week_duration ?? 0;
    return Array.from({ length: Math.max(duration, 1) }, (_, i) => i + 1);
  }, [courseData?.enrollment.week_duration]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600 text-lg">
            {error || "Curso no encontrado"}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { enrollment, assignments, resources, stats } = courseData;

  const getAssignmentsForWeek = (week: number) =>
    assignments.filter((a) => a.week === week);
  const getResourcesForWeek = (week: number) =>
    resources.filter((r) => r.week === week);

  const professorName = enrollment.professor
    ? `${enrollment.professor.first_name || ""} ${
        enrollment.professor.last_name || ""
      }`.trim()
    : "Profesor pendiente";

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                {enrollment.course.name}
              </h1>
              <p className="text-sm text-gray-500">
                {enrollment.course.code} - {professorName}
              </p>
            </div>
            <div
              className={`rounded-md px-3 py-1 text-sm font-medium ring-1 ring-inset ${
                statusLabels[enrollment.status]?.className ||
                "bg-gray-50 text-gray-600 ring-gray-500/10"
              }`}
            >
              {statusLabels[enrollment.status]?.label || enrollment.status}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500">Profesor</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {professorName}
            </dd>
            <dd className="text-sm text-gray-500">
              {enrollment.professor?.email || "Sin correo"}
            </dd>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500">Periodo</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              Periodo {enrollment.period} - {enrollment.year}
            </dd>
            <dd className="text-sm text-gray-500">
              {enrollment.week_duration} semanas
            </dd>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500">Progreso</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {stats.graded_assignments} / {stats.total_assignments}
            </dd>
            <dd className="text-sm text-gray-500">tareas calificadas</dd>
          </div>
        </div>

        {enrollment.schedules.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Horario
            </h2>
            <div className="flex flex-wrap gap-4">
              {enrollment.schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">{schedule.day_name}</span>
                  <span className="text-gray-500">
                    {schedule.hour}
                    {schedule.end_hour && ` - ${schedule.end_hour}`}
                  </span>
                  {schedule.classroom && (
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                      {schedule.classroom}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Contenido del curso
            </h2>
            <span className="text-xs font-medium text-gray-500">
              Expande cada semana para ver tareas y recursos
            </span>
          </div>
          <ul role="list" className="divide-y divide-gray-100">
            {weeks.map((week) => {
              const weekAssignments = getAssignmentsForWeek(week);
              const weekResources = getResourcesForWeek(week);
              const hasContent =
                weekAssignments.length > 0 || weekResources.length > 0;

              return (
                <li key={week} className="px-6 py-5">
                  <Disclosure>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold">
                          {week}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            Semana {week}
                          </h3>
                          <p className="text-xs text-gray-500 flex flex-wrap items-center gap-4">
                            <span className="inline-flex items-center gap-1">
                              <DocumentTextIcon className="h-4 w-4 text-blue-500/80" />
                              {weekAssignments.length} tareas
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <FolderIcon className="h-4 w-4 text-amber-500/80" />
                              {weekResources.length} recursos
                            </span>
                          </p>
                        </div>
                      </div>
                      <DisclosureButton className="group inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        Ver contenido
                        <ChevronDownIcon className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
                      </DisclosureButton>
                    </div>
                    <DisclosurePanel
                      transition
                      className="mt-4 space-y-4 data-closed:opacity-0 data-closed:-translate-y-2 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
                    >
                      {!hasContent && (
                        <p className="text-sm text-gray-500 italic">
                          No hay contenido para esta semana.
                        </p>
                      )}

                      {weekAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between gap-x-6 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-primary/40 hover:shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-x-3">
                              <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {assignment.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {assignment.grade !== null ? (
                                    <span className="inline-flex rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                      {assignment.grade}
                                      {assignment.points !== null &&
                                        ` / ${assignment.points}`}{" "}
                                      pts
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-md bg-yellow-50 px-1.5 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                                      Sin calificar
                                      {assignment.points !== null &&
                                        ` (${assignment.points} pts)`}
                                    </span>
                                  )}
                                  {assignment.comment_grade && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                      <ChatBubbleLeftRightIcon className="h-3 w-3" />
                                      Comentario
                                    </span>
                                  )}
                                </div>
                                {assignment.comment_grade && (
                                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                                    {assignment.comment_grade}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-none items-center gap-x-2">
                            {assignment.assignment_file_url && (
                              <a
                                href={assignment.assignment_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-white p-2 text-gray-500 hover:text-gray-700 ring-1 ring-inset ring-gray-300"
                              >
                                <DocumentArrowDownIcon className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() =>
                                setPreviewItem({
                                  type: "assignment",
                                  data: assignment,
                                })
                              }
                              className="rounded-md bg-primary/10 px-2.5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                      ))}

                      {weekResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between gap-x-6 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-amber-300/60 hover:shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-x-3">
                              <FolderIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {resource.title}
                                </p>
                                <p className="mt-1 inline-flex rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                  Recurso
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-none items-center gap-x-2">
                            {resource.resource_file_url && (
                              <a
                                href={resource.resource_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-white p-2 text-gray-500 hover:text-gray-700 ring-1 ring-inset ring-gray-300"
                              >
                                <DocumentArrowDownIcon className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() =>
                                setPreviewItem({
                                  type: "resource",
                                  data: resource,
                                })
                              }
                              className="rounded-md bg-amber-100 px-2.5 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-200"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                      ))}
                    </DisclosurePanel>
                  </Disclosure>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Resumen y calificacion
            </h2>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              <AcademicCapIcon className="h-4 w-4" />
              {enrollment.grade ?? "--"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500">
                Tareas totales
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.total_assignments}
              </dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500">
                Puntos obtenidos
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.total_points_obtained} / {stats.total_points_available}
              </dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500">Promedio</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.average_grade ?? "--"}
              </dd>
            </div>
          </div>

          {enrollment.professor_observation && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <dt className="text-sm font-medium text-gray-500">
                Observacion del profesor
              </dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                {enrollment.professor_observation}
              </dd>
            </div>
          )}
        </div>
      </div>

      <ContentPreviewDrawer
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        item={previewItem}
      />
    </div>
  );
}
