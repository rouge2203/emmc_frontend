import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
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
  MusicalNoteIcon,
  ClipboardDocumentCheckIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { GiMusicalNotes, GiMusicalScore } from "react-icons/gi";
import { BiCalendarEdit } from "react-icons/bi";
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
  is_exam: boolean;
  is_concert: boolean;
  created_at: string | null;
}

interface DailyWork {
  id: number | null;
  course_enrollment_id: number;
  [key: `week${number}_points`]: number | null;
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
  const [dailyWork, setDailyWork] = useState<DailyWork | null>(null);
  const [previewItem, setPreviewItem] = useState<
    | { type: "assignment"; data: Assignment }
    | { type: "resource"; data: Resource }
    | null
  >(null);
  const [dailyWorkInfoDialogOpen, setDailyWorkInfoDialogOpen] = useState(false);

  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseResponse, dailyWorkResponse] = await Promise.all([
        axiosPrivate.get(`courses/student-course/${enrollmentId}`),
        axiosPrivate.get(`courses/daily-work/${enrollmentId}`),
      ]);
      setCourseData(courseResponse.data);
      setDailyWork(dailyWorkResponse.data.daily_work);
    } catch (err: unknown) {
      console.error("Error fetching course data:", err);
      setError("Error al cargar los datos del curso");
    } finally {
      setLoading(false);
    }
  };

  const getDailyWorkGrade = (week: number): number | null => {
    if (!dailyWork) return null;
    const weekKey = `week${week}_points` as keyof DailyWork;
    return dailyWork[weekKey] as number | null;
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

  // Grade calculations
  const calculateDailyWorkPercentage = (): number => {
    if (!dailyWork || !courseData) return 0;
    const weekDuration = courseData.enrollment.week_duration;
    let totalPoints = 0;

    // Sum all weekly work points
    for (let i = 1; i <= weekDuration; i++) {
      const weekKey = `week${i}_points` as keyof DailyWork;
      const points = dailyWork[weekKey] as number | null;
      if (points !== null) {
        totalPoints += points;
      }
    }

    // Add points from "Asistencia a Recital 1" and "Asistencia a Recital 2"
    const asistenciaRecitals = courseData.assignments.filter(
      (a) =>
        a.is_concert &&
        (a.title === "Asistencia a Recital 1" ||
          a.title === "Asistencia a Recital 2"),
    );

    const asistenciaPoints = asistenciaRecitals.reduce(
      (sum, a) => sum + (a.grade ?? 0),
      0,
    );
    totalPoints += asistenciaPoints;

    // Max possible: all weeks (10 each) + 2 asistencia recitals (10 each)
    const maxPossible = weekDuration * 10 + 20;
    if (maxPossible === 0) return 0;

    // 50% of final grade: (points obtained / max possible points) * 50
    return (totalPoints / maxPossible) * 50;
  };

  const calculateExamPercentage = (): number => {
    if (!courseData) return 0;
    const examAssignment = courseData.assignments.find((a) => a.is_exam);
    if (
      !examAssignment ||
      examAssignment.grade === null ||
      examAssignment.points === null
    )
      return 0;
    // 40% of final grade
    return (examAssignment.grade / examAssignment.points) * 40;
  };

  const calculateConcertPercentage = (): number => {
    if (!courseData) return 0;

    // Only consider "Participación en Recital" assignment
    const participacionRecital = courseData.assignments.find(
      (a) => a.is_concert && a.title === "Participación en Recital",
    );

    if (!participacionRecital || participacionRecital.points === null) return 0;

    const grade = participacionRecital.grade ?? 0;
    const maxPoints = participacionRecital.points;

    if (maxPoints === 0) return 0;
    // 10% of final grade
    return (grade / maxPoints) * 10;
  };

  const calculateFinalGrade = (): number => {
    return (
      calculateDailyWorkPercentage() +
      calculateExamPercentage() +
      calculateConcertPercentage()
    );
  };

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

  // Regular assignments (not exam or concert) for weekly content
  const getAssignmentsForWeek = (week: number) =>
    assignments.filter((a) => a.week === week && !a.is_exam && !a.is_concert);
  const getResourcesForWeek = (week: number) =>
    resources.filter((r) => r.week === week);

  // Exam and concert assignments for "Evaluaciones del curso" section
  const evaluationAssignments = assignments.filter(
    (a) => a.is_exam || a.is_concert,
  );

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
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              Semana {week}
                            </h3>
                            {/* Trabajo Cotidiano Badge (view-only) */}
                            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-gray-200">
                              <BiCalendarEdit className="h-3 w-3" />
                              {getDailyWorkGrade(week) !== null ? (
                                <span className="text-green-700">
                                  {getDailyWorkGrade(week)}/10
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  Sin calificar
                                </span>
                              )}
                            </span>
                          </div>
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
                          className={`flex items-center justify-between gap-x-6 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-primary/40 hover:shadow-sm ${
                            assignment.is_concert
                              ? "bg-purple-50/50"
                              : assignment.is_exam
                              ? "bg-amber-50/50"
                              : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-x-3">
                              {(assignment.is_concert &&
                                assignment.title ===
                                  "Asistencia a Recital 1") ||
                              assignment.title === "Asistencia a Recital 2" ? (
                                <GiMusicalNotes className="size-5 text-purple-500 mt-0.5" />
                              ) : assignment.is_exam ? (
                                <MusicalNoteIcon className="h-5 w-5 text-purple-500 mt-0.5" />
                              ) : assignment.is_concert &&
                                assignment.title ===
                                  "Participación en Recital" ? (
                                <GiMusicalNotes className="size-5 text-purple-500 mt-0.5" />
                              ) : (
                                <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {assignment.title}
                                  </p>
                                  {assignment.is_concert && (
                                    <span className="inline-flex rounded-md bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                      Recital
                                    </span>
                                  )}
                                  {assignment.is_exam && (
                                    <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                      Examen
                                    </span>
                                  )}
                                </div>
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

        {/* Evaluaciones del curso Section - Exams and Concerts */}
        {evaluationAssignments.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                Evaluaciones del curso
              </h2>
            </div>
            <ul role="list" className="divide-y divide-gray-100">
              {evaluationAssignments.map((assignment) => (
                <li key={assignment.id} className="px-6 py-5">
                  <div className="flex items-center justify-between gap-x-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-x-3">
                        {assignment.is_concert &&
                        assignment.title === "Participación en Recital" ? (
                          <GiMusicalScore className="size-5 text-purple-500 mt-0.5" />
                        ) : assignment.is_exam ? (
                          <ClipboardDocumentCheckIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                        ) : (
                          <GiMusicalNotes className="size-5 text-purple-500 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {assignment.title}
                            </p>
                            {assignment.grade !== null ? (
                              <p className="mt-0.5 inline-flex rounded-md px-1.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                {assignment.grade}
                                {assignment.points !== null &&
                                  ` / ${assignment.points}`}{" "}
                                pts
                              </p>
                            ) : (
                              <p className="mt-0.5 inline-flex items-center rounded-md px-1.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-inset ring-yellow-600/20">
                                Sin calificar
                                {assignment.points !== null &&
                                  ` - ${assignment.points} pts`}
                              </p>
                            )}
                          </div>
                          {assignment.is_concert && (
                            <span className="inline-flex rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20">
                              Recital
                            </span>
                          )}
                          {assignment.is_exam && (
                            <span className="inline-flex rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20">
                              Examen
                            </span>
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
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Resumen y Calificación{" "}
              {enrollment.status === "cursando" ? "Parcial" : "Final"}
            </h2>
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              <AcademicCapIcon className="h-4 w-4" />
              {calculateFinalGrade().toFixed(1)}%
            </div>
          </div>

          {/* Grade Breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-4">
            <div className="shadow-md rounded-lg p-4">
              <dt className="text-sm font-medium text-blue-700 flex items-center gap-1">
                Trabajo Cotidiano (50%)
                <button
                  onClick={() => setDailyWorkInfoDialogOpen(true)}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700"
                  title="Información sobre Trabajo Cotidiano"
                >
                  <InformationCircleIcon className="w-3 h-3" />
                </button>
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-blue-900">
                {calculateDailyWorkPercentage().toFixed(1)}%
              </dd>
            </div>
            <div className="shadow-md rounded-lg p-4">
              <dt className="text-sm font-medium text-amber-700">
                Examen Final (40%)
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-amber-900">
                {calculateExamPercentage().toFixed(1)}%
              </dd>
            </div>
            <div className="shadow-md rounded-lg p-4">
              <dt className="text-sm font-medium text-purple-700">
                Participación en Recital (10%)
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-purple-900">
                {calculateConcertPercentage().toFixed(1)}%
              </dd>
            </div>
            <div className="shadow-md rounded-lg p-4">
              <dt className="text-sm font-medium text-green-700">
                Calificación Final
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-green-900">
                {calculateFinalGrade().toFixed(1)}
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

      {/* Daily Work Info Dialog */}
      <Dialog
        open={dailyWorkInfoDialogOpen}
        onClose={() => setDailyWorkInfoDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel className="relative w-full transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setDailyWorkInfoDialogOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    className="size-6 text-blue-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Trabajo Cotidiano (50%)
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-700">
                      El{" "}
                      <span className="font-semibold">Trabajo Cotidiano</span>{" "}
                      representa el 50% de tu calificación final y se calcula
                      sumando:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-semibold">•</span>
                        <span>
                          Los puntos de{" "}
                          <span className="font-semibold">
                            todas las semanas
                          </span>{" "}
                          del curso (máximo 10 puntos por semana)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-semibold">•</span>
                        <span>
                          Los puntos de{" "}
                          <span className="font-semibold">
                            Asistencia a Recital 1
                          </span>{" "}
                          (máximo 10 puntos)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-semibold">•</span>
                        <span>
                          Los puntos de{" "}
                          <span className="font-semibold">
                            Asistencia a Recital 2
                          </span>{" "}
                          (máximo 10 puntos)
                        </span>
                      </li>
                    </ul>
                    <p className="mt-3 text-sm text-gray-600 italic">
                      Nota: Las asistencias a recitales se encuentran en la
                      sección "Evaluaciones del curso".
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setDailyWorkInfoDialogOpen(false)}
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 sm:ml-3 sm:w-auto"
                >
                  Entendido
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
