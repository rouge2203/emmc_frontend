import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Dialog,
  Menu,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from "@headlessui/react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  FolderIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  DocumentArrowDownIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { BiCalendarEdit } from "react-icons/bi";
import { GiMusicalNotes, GiMusicalScore } from "react-icons/gi";
import AssignmentDrawer from "../../components/drawers/teacher_drawers/AssignmentDrawer";
import ResourceDrawer from "../../components/drawers/teacher_drawers/ResourceDrawer";
import { FaExclamation } from "react-icons/fa";

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
  retirado: {
    label: "Retirado",
    className: "bg-gray-50 text-gray-600 ring-gray-500/10",
  },
};

export default function EnrollmentGrades() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [dailyWork, setDailyWork] = useState<DailyWork | null>(null);

  // Drawer states
  const [assignmentDrawerOpen, setAssignmentDrawerOpen] = useState(false);
  const [resourceDrawerOpen, setResourceDrawerOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [dailyWorkDialogOpen, setDailyWorkDialogOpen] = useState(false);
  const [selectedDailyWorkWeek, setSelectedDailyWorkWeek] = useState<
    number | null
  >(null);
  const [formDailyWorkGrade, setFormDailyWorkGrade] = useState<string>("");
  const [dailyWorkInfoDialogOpen, setDailyWorkInfoDialogOpen] = useState(false);

  // Form states
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null,
  );
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(
    null,
  );

  // Form fields for dialogs
  const [formGrade, setFormGrade] = useState<number | string>("");
  const [formCommentGrade, setFormCommentGrade] = useState("");
  const [formFinalGrade, setFormFinalGrade] = useState<number | string>("");
  const [formObservation, setFormObservation] = useState("");
  const [formStatus, setFormStatus] = useState<"aprobado" | "reprobado">(
    "aprobado",
  );

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    type: "assignment" | "resource";
    id: number;
    title: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Read-only mode when status is not "cursando"
  const isReadOnly = courseData?.enrollment.status !== "cursando";

  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseResponse, dailyWorkResponse] = await Promise.all([
        axiosPrivate.get(`courses/admin-course/${enrollmentId}`),
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

  useEffect(() => {
    if (enrollmentId) {
      fetchCourseData();
    }
  }, [enrollmentId]);

  const openAssignmentDrawer = (week: number, assignment?: Assignment) => {
    if (isReadOnly) return;
    setSelectedWeek(week);
    setEditingAssignment(assignment || null);
    setAssignmentDrawerOpen(true);
  };

  const openResourceDrawer = (week: number, resource?: Resource) => {
    if (isReadOnly) return;
    setSelectedWeek(week);
    setEditingResource(resource || null);
    setResourceDrawerOpen(true);
  };

  const openGradeDialog = (assignment: Assignment) => {
    if (isReadOnly) return;
    setGradingAssignment(assignment);
    setFormGrade(assignment.grade ?? "");
    setFormCommentGrade(assignment.comment_grade || "");
    setGradeDialogOpen(true);
  };

  const openFinalizeDialog = () => {
    const finalGrade = calculateFinalGrade();
    setFormFinalGrade(finalGrade.toFixed(1));
    setFormObservation(courseData?.enrollment.professor_observation || "");
    setFormStatus(finalGrade >= 70 ? "aprobado" : "reprobado");
    setFinalizeDialogOpen(true);
  };

  const openDailyWorkDialog = (week: number) => {
    setSelectedDailyWorkWeek(week);
    const weekKey = `week${week}_points` as keyof DailyWork;
    const currentValue = dailyWork?.[weekKey];
    setFormDailyWorkGrade(
      currentValue !== null && currentValue !== undefined
        ? String(currentValue)
        : "",
    );
    setDailyWorkDialogOpen(true);
  };

  const handleSaveDailyWork = async () => {
    if (selectedDailyWorkWeek === null || isReadOnly) return;
    setSubmitting(true);

    try {
      const weekKey = `week${selectedDailyWorkWeek}_points`;
      await axiosPrivate.put(`courses/daily-work/${enrollmentId}`, {
        [weekKey]:
          formDailyWorkGrade === "" ? null : Number(formDailyWorkGrade),
      });
      setDailyWorkDialogOpen(false);
      const response = await axiosPrivate.get(
        `courses/daily-work/${enrollmentId}`,
      );
      setDailyWork(response.data.daily_work);
    } catch (err) {
      console.error("Error saving daily work:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignAllDailyWorkPoints = async () => {
    if (!courseData || isReadOnly) return;
    setSubmitting(true);

    try {
      const weekDuration = courseData.enrollment.week_duration;
      const allWeeksData: Record<string, number> = {};
      for (let i = 1; i <= weekDuration; i++) {
        allWeeksData[`week${i}_points`] = 10;
      }

      await axiosPrivate.put(
        `courses/daily-work/${enrollmentId}`,
        allWeeksData,
      );
      const response = await axiosPrivate.get(
        `courses/daily-work/${enrollmentId}`,
      );
      setDailyWork(response.data.daily_work);
    } catch (err) {
      console.error("Error assigning all daily work points:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getDailyWorkGrade = (week: number): number | null => {
    if (!dailyWork) return null;
    const weekKey = `week${week}_points` as keyof DailyWork;
    return dailyWork[weekKey] as number | null;
  };

  const openDeleteDialog = (
    type: "assignment" | "resource",
    id: number,
    title: string,
  ) => {
    if (isReadOnly) return;
    setDeletingItem({ type, id, title });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setSubmitting(true);

    try {
      if (deletingItem.type === "assignment") {
        await axiosPrivate.delete("courses/teacher-assignments", {
          data: { assignment_id: deletingItem.id },
        });
      } else {
        await axiosPrivate.delete("courses/teacher-resources", {
          data: { resource_id: deletingItem.id },
        });
      }
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchCourseData();
    } catch (err) {
      console.error("Error deleting item:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!gradingAssignment || isReadOnly) return;
    setSubmitting(true);

    try {
      await axiosPrivate.put("courses/teacher-assignments", {
        assignment_id: gradingAssignment.id,
        grade: formGrade === "" ? null : Number(formGrade),
        comment_grade: formCommentGrade,
      });
      setGradeDialogOpen(false);
      fetchCourseData();
    } catch (err) {
      console.error("Error saving grade:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setSubmitting(true);

    try {
      await axiosPrivate.put(`courses/teacher-finalize/${enrollmentId}`, {
        grade: formFinalGrade === "" ? null : Number(formFinalGrade),
        professor_observation: formObservation,
        status: formStatus,
      });
      setFinalizeDialogOpen(false);
      fetchCourseData();
    } catch (err) {
      console.error("Error finalizing enrollment:", err);
    } finally {
      setSubmitting(false);
    }
  };

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

    // Add points from every "Asistencia a Recital N" item
    const asistenciaRecitals = courseData.assignments.filter(
      (a) => a.is_concert && /^Asistencia a Recital \d+$/.test(a.title),
    );

    const asistenciaPoints = asistenciaRecitals.reduce(
      (sum, a) => sum + (a.grade ?? 0),
      0,
    );
    totalPoints += asistenciaPoints;

    // Max possible: all weeks (10 each) + each asistencia recital (10 each)
    const maxPossible = weekDuration * 10 + asistenciaRecitals.length * 10;
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
            onClick={() => navigate("/admin/cursos-matriculados")}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { enrollment, assignments, resources, stats } = courseData;
  const weeks = Array.from(
    { length: enrollment.week_duration },
    (_, i) => i + 1,
  );

  // Show read-only banner if status is not "cursando"
  const showReadOnlyBanner = isReadOnly;

  const getAssignmentsForWeek = (week: number) =>
    assignments.filter((a) => a.week === week && !a.is_exam && !a.is_concert);
  const getResourcesForWeek = (week: number) =>
    resources.filter((r) => r.week === week);

  const evaluationAssignments = assignments.filter(
    (a) => a.is_exam || a.is_concert,
  );

  const professorName = enrollment.professor
    ? `${enrollment.professor.first_name || ""} ${
        enrollment.professor.last_name || ""
      }`.trim()
    : "Sin profesor asignado";

  return (
    <div className="min-h-full bg-gray-50">
      {/* Admin Notice Banner */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Vista de Administrador:</span>{" "}
              Esta es una vista del portal del profesor para calificar al
              estudiante.{" "}
              {isReadOnly
                ? "Este curso está finalizado, solo puedes ver la información."
                : "Puedes realizar todas las acciones que el profesor puede hacer."}{" "}
              El estudiante ve la misma información pero sin opciones de
              edición.
            </p>
          </div>
        </div>
      </div>

      {/* Read-only Banner */}
      {showReadOnlyBanner && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <InformationCircleIcon className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Modo de solo lectura:</span>{" "}
                Este curso tiene el estado "
                {statusLabels[enrollment.status]?.label || enrollment.status}".
                Solo puedes ver la información, no puedes realizar
                modificaciones.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/cursos-matriculados")}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                {enrollment.course.name}
              </h1>
              <p className="text-sm text-gray-500">
                {enrollment.course.code} - {enrollment.student.first_name}{" "}
                {enrollment.student.last_name}
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Enrollment Info Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500">Estudiante</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {enrollment.student.first_name} {enrollment.student.last_name}
            </dd>
            <dd className="text-sm text-gray-500">
              {enrollment.student.email}
            </dd>
          </div>
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
            <dt className="text-sm font-medium text-gray-500">Evaluaciones</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {stats.graded_assignments} / {stats.total_assignments}
            </dd>
            <dd className="text-sm text-gray-500">calificadas</dd>
          </div>
        </div>

        {/* Schedules */}
        {enrollment.schedules.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Horario
            </h2>
            <div className="flex flex-wrap gap-4">
              {enrollment.schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg"
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

        {/* Weeks List */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Contenido del Curso
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Las tareas son evaluadas solo como referencia para el estudiante.
              Los puntos que afectan la nota final son los de "Trabajo
              Cotidiano" junto a cada semana.
            </p>
          </div>
          <ul role="list" className="divide-y divide-gray-100">
            {weeks.map((week) => {
              const weekAssignments = getAssignmentsForWeek(week);
              const weekResources = getResourcesForWeek(week);
              const hasContent =
                weekAssignments.length > 0 || weekResources.length > 0;

              return (
                <li key={week} className="px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold">
                        {week}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Semana {week}
                      </h3>
                      <button
                        onClick={() => openDailyWorkDialog(week)}
                        disabled={isReadOnly}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border border-gray-300 ${
                          isReadOnly
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <BiCalendarEdit
                          className={`size-4 ${
                            getDailyWorkGrade(week) !== null
                              ? "text-green-700"
                              : "text-amber-600"
                          }`}
                        />
                        {getDailyWorkGrade(week) !== null ? (
                          <span className="text-green-700">
                            {getDailyWorkGrade(week)}/10
                          </span>
                        ) : (
                          <span className="text-black">Calificar semana</span>
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAssignmentDrawer(week)}
                        disabled={isReadOnly}
                        className={`inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 ${
                          isReadOnly
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <PlusIcon className="h-4 w-4" />
                        Tarea
                      </button>
                      <button
                        onClick={() => openResourceDrawer(week)}
                        disabled={isReadOnly}
                        className={`inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 ${
                          isReadOnly
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <PlusIcon className="h-4 w-4" />
                        Recurso
                      </button>
                    </div>
                  </div>

                  {!hasContent && (
                    <p className="text-sm text-gray-500 italic">
                      Sin contenido para esta semana
                    </p>
                  )}

                  {/* Assignments */}
                  {weekAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-x-6 py-4 border-t border-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-x-3">
                          <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5" />
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
                                  <FaExclamation className="size-3 mr-0" />{" "}
                                  Pendiente calificar -{" "}
                                  {assignment.points !== null &&
                                    `${assignment.points} pts`}
                                </p>
                              )}
                            </div>
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
                        {assignment.grade === null && !isReadOnly && (
                          <button
                            onClick={() => openGradeDialog(assignment)}
                            className="rounded-md bg-primary px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
                          >
                            Calificar
                          </button>
                        )}
                        <Menu as="div" className="relative">
                          <Menu.Button className="block rounded-md p-2 text-gray-500 hover:text-gray-900">
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </Menu.Button>
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                            {!isReadOnly && (
                              <>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() =>
                                        openAssignmentDrawer(week, assignment)
                                      }
                                      className={`${
                                        active ? "bg-gray-50" : ""
                                      } block w-full px-3 py-1 text-left text-sm text-gray-900`}
                                    >
                                      Editar
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() =>
                                        openGradeDialog(assignment)
                                      }
                                      className={`${
                                        active ? "bg-gray-50" : ""
                                      } block w-full px-3 py-1 text-left text-sm text-gray-900`}
                                    >
                                      Calificar
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() =>
                                        openDeleteDialog(
                                          "assignment",
                                          assignment.id,
                                          assignment.title,
                                        )
                                      }
                                      className={`${
                                        active ? "bg-gray-50" : ""
                                      } block w-full px-3 py-1 text-left text-sm text-red-600`}
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Items>
                        </Menu>
                      </div>
                    </div>
                  ))}

                  {/* Resources */}
                  {weekResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between gap-x-6 py-4 border-t border-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-x-3">
                          <FolderIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {resource.title}
                            </p>
                            <p className="mt-0.5 inline-flex rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
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
                        <Menu as="div" className="relative">
                          <Menu.Button className="block rounded-md p-2 text-gray-500 hover:text-gray-900">
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </Menu.Button>
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                            {!isReadOnly && (
                              <>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() =>
                                        openResourceDrawer(week, resource)
                                      }
                                      className={`${
                                        active ? "bg-gray-50" : ""
                                      } block w-full px-3 py-1 text-left text-sm text-gray-900`}
                                    >
                                      Editar
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() =>
                                        openDeleteDialog(
                                          "resource",
                                          resource.id,
                                          resource.title,
                                        )
                                      }
                                      className={`${
                                        active ? "bg-gray-50" : ""
                                      } block w-full px-3 py-1 text-left text-sm text-red-600`}
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Items>
                        </Menu>
                      </div>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Evaluaciones del curso Section */}
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
                        assignment.title != "Participación en Recital" ? (
                          <GiMusicalNotes className="size-5 text-purple-500 mt-0.5" />
                        ) : assignment.is_exam ? (
                          <ClipboardDocumentCheckIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                        ) : (
                          <GiMusicalScore className="size-5 text-purple-500 mt-0.5" />
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
                                <FaExclamation className="size-3 mr-0" />{" "}
                                Pendiente calificar -{" "}
                                {assignment.points !== null &&
                                  `${assignment.points} pts`}
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
                      {assignment.grade === null && !isReadOnly && (
                        <button
                          onClick={() => openGradeDialog(assignment)}
                          className="rounded-md bg-primary px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
                        >
                          Calificar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Asignar puntos de Trabajo Cotidiano
                  </p>
                  <p className="text-xs text-gray-500">
                    Asigna automáticamente 10 puntos a todas las semanas del
                    curso
                  </p>
                </div>
                <button
                  onClick={handleAssignAllDailyWorkPoints}
                  disabled={submitting || isReadOnly}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BiCalendarEdit className="h-4 w-4" />
                  {submitting ? "Asignando..." : "Asignar puntos"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Final Grade Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Resumen y Calificación Final
            </h2>
            {enrollment.status === "cursando" && (
              <button
                onClick={openFinalizeDialog}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
              >
                <AcademicCapIcon className="h-5 w-5" />
                Finalizar Curso
              </button>
            )}
          </div>

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
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500">
                Observación del Profesor
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {enrollment.professor_observation}
              </dd>
            </div>
          )}
        </div>
      </div>

      {/* Drawers and Dialogs */}
      <AssignmentDrawer
        isOpen={assignmentDrawerOpen}
        onClose={() => setAssignmentDrawerOpen(false)}
        onAssignmentSaved={fetchCourseData}
        enrollmentId={enrollmentId || ""}
        week={selectedWeek}
        editingAssignment={editingAssignment}
        courseName={enrollment.course.name}
        studentName={`${enrollment.student.first_name} ${enrollment.student.last_name}`}
      />

      <ResourceDrawer
        isOpen={resourceDrawerOpen}
        onClose={() => setResourceDrawerOpen(false)}
        onResourceSaved={fetchCourseData}
        enrollmentId={enrollmentId || ""}
        week={selectedWeek}
        editingResource={editingResource}
        courseName={enrollment.course.name}
        studentName={`${enrollment.student.first_name} ${enrollment.student.last_name}`}
      />

      {/* Grade Dialog */}
      <Dialog
        open={gradeDialogOpen}
        onClose={() => setGradeDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 shadow-xl">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setGradeDialogOpen(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:size-10">
                  <CheckCircleIcon className="size-6 text-green-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Calificar Tarea
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500">
                    {gradingAssignment?.title}
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-start text-sm font-medium text-gray-900">
                        Puntos Obtenidos
                        {gradingAssignment?.points !== null &&
                          ` (máx. ${gradingAssignment?.points})`}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={gradingAssignment?.points ?? undefined}
                        value={formGrade}
                        onChange={(e) => setFormGrade(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-1.5 text-sm"
                        placeholder={
                          gradingAssignment?.points !== null
                            ? `0-${gradingAssignment?.points}`
                            : "Puntos obtenidos"
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Comentario
                      </label>
                      <textarea
                        rows={3}
                        value={formCommentGrade}
                        onChange={(e) => setFormCommentGrade(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="Comentario sobre la calificación..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting || isReadOnly}
                  onClick={handleSaveGrade}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {submitting ? "Guardando..." : "Guardar Calificación"}
                </button>
                <button
                  type="button"
                  onClick={() => setGradeDialogOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Finalize Dialog */}
      <Dialog
        open={finalizeDialogOpen}
        onClose={() => setFinalizeDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 shadow-xl">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setFinalizeDialogOpen(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:size-10">
                  <AcademicCapIcon className="size-6 text-yellow-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Finalizar Curso
                  </DialogTitle>
                  <div className="mt-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
                    <p className="text-sm text-yellow-800">
                      Esta acción cambiará el estado del estudiante a Aprobado o
                      Reprobado.
                    </p>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Calificación Final (calculada automáticamente)
                      </label>
                      <input
                        type="text"
                        value={formFinalGrade}
                        disabled
                        className="mt-1 block w-full rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Basada en: 50% Trabajo Cotidiano + 40% Examen + 10%
                        Participación en Recital
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Estado Final (basado en nota ≥ 70)
                      </label>
                      <div
                        className={`mt-1 block w-full rounded-md px-3 py-1.5 text-sm font-semibold cursor-not-allowed ${
                          formStatus === "aprobado"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formStatus === "aprobado" ? "Aprobado" : "Reprobado"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900">
                        Observación del Profesor
                      </label>
                      <textarea
                        rows={3}
                        value={formObservation}
                        onChange={(e) => setFormObservation(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="Observaciones finales..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalize}
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:ml-3 sm:w-auto ${
                    formStatus === "aprobado"
                      ? "bg-green-600 hover:bg-green-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {submitting
                    ? "Guardando..."
                    : `Marcar como ${
                        formStatus === "aprobado" ? "Aprobado" : "Reprobado"
                      }`}
                </button>
                <button
                  type="button"
                  onClick={() => setFinalizeDialogOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingItem(null);
        }}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 shadow-xl">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon className="size-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Eliminar{" "}
                    {deletingItem?.type === "assignment" ? "Tarea" : "Recurso"}
                  </DialogTitle>
                  <p className="mt-2 text-sm text-gray-500">
                    ¿Estás seguro de que deseas eliminar{" "}
                    <span className="font-medium text-gray-900">
                      "{deletingItem?.title}"
                    </span>
                    ?
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
                >
                  {submitting ? "Eliminando..." : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeletingItem(null);
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Daily Work Info Dialog */}
      <Dialog
        open={dailyWorkInfoDialogOpen}
        onClose={() => setDailyWorkInfoDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 shadow-xl">
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
                      representa el 50% de la calificación final y se calcula
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
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-semibold">•</span>
                        <span>
                          Los puntos de{" "}
                          <span className="font-semibold">
                            Asistencia a Recital 3
                          </span>{" "}
                          (máximo 10 puntos)
                        </span>
                      </li>
                    </ul>
                    <p className="mt-3 text-sm text-gray-600 italic">
                      Nota: Las asistencias a recitales se califican en la
                      sección "Evaluaciones del curso".
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse">
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

      {/* Daily Work Dialog */}
      <Dialog
        open={dailyWorkDialogOpen}
        onClose={() => setDailyWorkDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 shadow-xl">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setDailyWorkDialogOpen(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
                  <BiCalendarEdit className="size-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Trabajo Cotidiano - Semana {selectedDailyWorkWeek}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500">
                    Califica el trabajo cotidiano del estudiante (máximo 10
                    puntos)
                  </p>
                  <div className="mt-4">
                    <label className="block text-start text-sm font-medium text-gray-900">
                      Puntos (0-10)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formDailyWorkGrade}
                      onChange={(e) => setFormDailyWorkGrade(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-1.5 text-sm"
                      placeholder="0-10"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting || isReadOnly}
                  onClick={handleSaveDailyWork}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setDailyWorkDialogOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
