import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
} from "@headlessui/react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  FolderIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import { GiMusicalNotes, GiMusicalScore } from "react-icons/gi";
import { BiCalendarEdit } from "react-icons/bi";
import AssignmentDrawer from "../../components/drawers/teacher_drawers/AssignmentDrawer";
import ResourceDrawer from "../../components/drawers/teacher_drawers/ResourceDrawer";
import EvaluationDetails, {
  type EvaluationDraft,
} from "../../components/EvaluationDetails";
import CourseProgram, {
  COURSE_PROGRAM_MAX_FILE_BYTES,
  COURSE_PROGRAM_WEEK,
} from "../../components/CourseProgram";
import { FaExclamation } from "react-icons/fa";
import {
  formatGrade,
  isPartialGradeInput,
  parseGradeInput,
  validateGrade,
} from "../../utils/grades";

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
    is_matricula: boolean;
    assigned_course: {
      id: number;
      name: string;
      code: string;
      career_name: string | null;
    } | null;
    student: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
    period: number;
    year: number;
    week_duration: number;
    price: number;
    status: string;
    grade: number | null;
    professor_observation: string | null;
    // Optional: a backend that predates the "Programa del curso" field simply
    // omits it, and this page must still render (see CLAUDE.md deploy order).
    course_program?: string | null;
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

/**
 * The message the API sent for a failed request, or `fallback`.
 *
 * Axios errors are `unknown` to TypeScript; this narrows one instead of
 * spreading `any` through every catch block.
 */
function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { error?: unknown } } })
    ?.response?.data?.error;
  return typeof detail === "string" && detail ? detail : fallback;
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

export default function CourseDashboard() {
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
  const [formDailyWorkError, setFormDailyWorkError] = useState<string | null>(
    null,
  );
  const [dailyWorkInfoDialogOpen, setDailyWorkInfoDialogOpen] = useState(false);

  // "Programa del curso" (week 0). `programSaving` keeps its own flag so the
  // block's buttons disable without touching the page-wide `submitting`.
  const [programSaving, setProgramSaving] = useState(false);
  // Which evaluación has its details open. One at a time: the panel is tall,
  // and collapsed rows already show the grade.
  const [openEvaluationId, setOpenEvaluationId] = useState<number | null>(null);
  const [evaluationSaving, setEvaluationSaving] = useState(false);

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
  const [formGradeError, setFormGradeError] = useState<string | null>(null);
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

  // Assign-subject (for matricula enrollments)
  const [assignCourseDialogOpen, setAssignCourseDialogOpen] = useState(false);
  const [assignCourseSearch, setAssignCourseSearch] = useState("");
  const [assignCourseOptions, setAssignCourseOptions] = useState<
    { id: number; code: string; name: string; is_matricula: boolean }[]
  >([]);

  // Notification states
  // Anything the teacher still has to grade before the course can be closed.
  const [missingGrades, setMissingGrades] = useState<string[]>([]);

  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  // Read-only mode when status is not "cursando"
  const isReadOnly = courseData?.enrollment.status !== "cursando";

  /**
   * One toast at a time, with a single owned dismiss timer. Two saves within
   * five seconds used to let the first timer hide the second message.
   */
  const showSuccessToast = () => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setShowErrorNotification(false);
    setShowSuccessNotification(true);
    notificationTimer.current = setTimeout(() => {
      setShowSuccessNotification(false);
    }, 5000);
  };

  const showErrorToast = () => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setShowSuccessNotification(false);
    setShowErrorNotification(true);
    notificationTimer.current = setTimeout(() => {
      setShowErrorNotification(false);
    }, 5000);
  };

  useEffect(
    () => () => {
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
    },
    [],
  );

  /**
   * Reloads the course. `silent` keeps the page on screen instead of blanking
   * it to a spinner — saving a grade should never make the content flash.
   */
  const fetchCourseData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [courseResponse, dailyWorkResponse] = await Promise.all([
        axiosPrivate.get(`courses/teacher-course/${enrollmentId}`),
        axiosPrivate.get(`courses/daily-work/${enrollmentId}`),
      ]);
      setCourseData(courseResponse.data);
      setDailyWork(dailyWorkResponse.data.daily_work);
    } catch (err: unknown) {
      console.error("Error fetching course data:", err);
      if (!silent) setError("Error al cargar los datos del curso");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (enrollmentId) {
      fetchCourseData();
    }
  }, [enrollmentId]);

  // Load the course catalog (non-matricula subjects) for the assign-subject dialog
  useEffect(() => {
    if (!assignCourseDialogOpen && !finalizeDialogOpen) return;
    const controller = new AbortController();
    const fetchOptions = async () => {
      try {
        const response = await axiosPrivate.get(
          "courses/list-courses-for-enrollment",
          {
            params: assignCourseSearch ? { search: assignCourseSearch } : {},
            signal: controller.signal,
          },
        );
        setAssignCourseOptions(
          (response.data.courses || []).filter(
            (c: { is_matricula: boolean }) => !c.is_matricula,
          ),
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Error fetching courses:", err);
        }
      }
    };
    fetchOptions();
    return () => controller.abort();
  }, [assignCourseDialogOpen, finalizeDialogOpen, assignCourseSearch]);

  // Keep the finalize checklist honest while the dialog is open.
  useEffect(() => {
    if (!finalizeDialogOpen) return;
    setMissingGrades(getMissingGrades());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizeDialogOpen, courseData, dailyWork]);

  const openAssignmentDrawer = (week: number, assignment?: Assignment) => {
    if (isReadOnly) return;
    setSelectedWeek(week);
    setEditingAssignment(assignment || null);
    setAssignmentDrawerOpen(true);
  };

  // `week` is assigned straight through, never coerced: week 0 is the
  // "Programa del curso" and `week || something` would turn it into "sin semana".
  const openResourceDrawer = (week: number, resource?: Resource) => {
    if (isReadOnly) return;
    setSelectedWeek(week);
    setEditingResource(resource || null);
    setResourceDrawerOpen(true);
  };

  const openGradeDialog = (assignment: Assignment) => {
    if (isReadOnly) return;
    setGradingAssignment(assignment);
    setFormGrade(
      assignment.grade === null ? "" : formatGrade(assignment.grade, ""),
    );
    setFormCommentGrade(assignment.comment_grade || "");
    setFormGradeError(null);
    setGradeDialogOpen(true);
  };

  const handleSaveProgram = async (programText: string) => {
    if (isReadOnly) return;
    setProgramSaving(true);

    try {
      const response = await axiosPrivate.put(
        `courses/teacher-course-program/${enrollmentId}`,
        { course_program: programText },
      );
      // The API normalises an empty programme to null; mirror what it stored.
      const savedProgram: string | null =
        response.data?.enrollment?.course_program ?? null;

      // Update local state instead of refetching, so the page never blanks.
      setCourseData((current) =>
        current
          ? {
              ...current,
              enrollment: {
                ...current.enrollment,
                course_program: savedProgram,
              },
            }
          : current,
      );

      setNotificationMessage("Programa del curso guardado correctamente");
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error saving course program:", err);
      setNotificationMessage(
        apiErrorMessage(err, "Error al guardar el programa del curso"),
      );
      showErrorToast();
      // Rethrown so CourseProgram keeps its editor — and the teacher's text —
      // open instead of closing it over a save that never landed.
      throw err;
    } finally {
      setProgramSaving(false);
    }
  };

  /**
   * Attaches a file to the programme: a Resources row filed under week 0, then
   * the upload itself. `COURSE_PROGRAM_WEEK` is passed as-is — a falsy 0 that
   * must survive all the way to the request body.
   */
  const handleAddProgramFile = async (file: File) => {
    if (isReadOnly) return;

    // The server rejects this too; refusing here saves the teacher the upload.
    if (file.size > COURSE_PROGRAM_MAX_FILE_BYTES) {
      setNotificationMessage(
        "El archivo supera el límite de 10 MB. Elige un archivo más liviano.",
      );
      showErrorToast();
      return;
    }

    setProgramSaving(true);

    try {
      const response = await axiosPrivate.post("courses/teacher-resources", {
        enrollment_id: enrollmentId,
        week: COURSE_PROGRAM_WEEK,
        title: file.name,
      });

      const resourceId: number | undefined = response.data?.resource?.id;
      if (resourceId === undefined) {
        throw new Error("La respuesta del servidor no incluyó el recurso.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("resource_id", String(resourceId));
      await axiosPrivate.post("courses/teacher-resource-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchCourseData(true);

      setNotificationMessage(`"${file.name}" se adjuntó al programa del curso`);
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error attaching program file:", err);
      setNotificationMessage(
        apiErrorMessage(err, "No se pudo adjuntar el archivo al programa"),
      );
      showErrorToast();
    } finally {
      setProgramSaving(false);
    }
  };

  const openFinalizeDialog = () => {
    // Calculate final grade and auto-set status
    const finalGrade = calculateFinalGrade();
    setMissingGrades(getMissingGrades());
    setFormFinalGrade(finalGrade.toFixed(1));
    setFormObservation(courseData?.enrollment.professor_observation || "");
    setFormStatus(finalGrade >= 70 ? "aprobado" : "reprobado");
    // The finalize dialog's subject <select> has no search box, so a term left
    // over from the banner picker would silently shorten its list.
    setAssignCourseSearch("");
    setFinalizeDialogOpen(true);
  };

  const openDailyWorkDialog = (week: number) => {
    if (isReadOnly) return;
    setSelectedDailyWorkWeek(week);
    const weekKey = `week${week}_points` as keyof DailyWork;
    const currentValue = dailyWork?.[weekKey];
    setFormDailyWorkGrade(
      currentValue !== null && currentValue !== undefined
        ? formatGrade(currentValue, "")
        : "",
    );
    setFormDailyWorkError(null);
    setDailyWorkDialogOpen(true);
  };

  const handleSaveDailyWork = async () => {
    if (selectedDailyWorkWeek === null || isReadOnly) return;

    const validationError = validateGrade(
      formDailyWorkGrade,
      10,
      `la semana ${selectedDailyWorkWeek}`,
    );
    if (validationError) {
      setFormDailyWorkError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const weekKey = `week${selectedDailyWorkWeek}_points`;
      const gradeValue = parseGradeInput(formDailyWorkGrade);
      await axiosPrivate.put(`courses/daily-work/${enrollmentId}`, {
        [weekKey]: gradeValue,
      });

      // Update local state instead of refetching
      if (dailyWork) {
        setDailyWork({
          ...dailyWork,
          [weekKey]: gradeValue,
        });
      }

      setDailyWorkDialogOpen(false);
      setFormDailyWorkError(null);
      // `selectedDailyWorkWeek` and `formDailyWorkGrade` are deliberately NOT
      // cleared. The dialog stays mounted for its leave animation, so blanking
      // them makes React delete a text node inside the still-visible title —
      // which throws outright if a translator has reparented it. The next
      // openDailyWorkDialog re-seeds both anyway.

      // Show success notification
      setNotificationMessage(
        `Trabajo cotidiano de la semana ${selectedDailyWorkWeek} actualizado correctamente`,
      );
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error saving daily work:", err);
      setNotificationMessage(apiErrorMessage(err, "Error al guardar el trabajo cotidiano"));
      showErrorToast();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignAllDailyWorkPoints = async () => {
    if (!courseData || isReadOnly) return;
    setSubmitting(true);

    try {
      // Build object with all weeks set to 10 points
      const weekDuration = courseData.enrollment.week_duration;
      const allWeeksData: Record<string, number> = {};
      for (let i = 1; i <= weekDuration; i++) {
        allWeeksData[`week${i}_points`] = 10;
      }

      await axiosPrivate.put(
        `courses/daily-work/${enrollmentId}`,
        allWeeksData,
      );

      // Update local state instead of refetching
      if (dailyWork) {
        const updatedDailyWork = { ...dailyWork };
        for (let i = 1; i <= weekDuration; i++) {
          updatedDailyWork[`week${i}_points` as keyof DailyWork] = 10;
        }
        setDailyWork(updatedDailyWork);
      }

      // Show success notification
      setNotificationMessage(
        `Se asignaron 10 puntos a todas las semanas del trabajo cotidiano`,
      );
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error assigning all daily work points:", err);
      setNotificationMessage(apiErrorMessage(err, "Error al asignar los puntos"));
      showErrorToast();
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
      // `deletingItem` stays set while the dialog animates out.
      await fetchCourseData(true);

      setNotificationMessage(`"${deletingItem.title}" se eliminó correctamente`);
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error deleting item:", err);
      setNotificationMessage(apiErrorMessage(err, "No se pudo eliminar el elemento"));
      showErrorToast();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEvaluation = (assignmentId: number) =>
    setOpenEvaluationId((current) =>
      current === assignmentId ? null : assignmentId,
    );

  /** Saves every field of one evaluación in a single request. */
  const handleSaveEvaluation = async (
    assignment: Assignment,
    draft: EvaluationDraft,
  ) => {
    if (isReadOnly) return;
    setEvaluationSaving(true);

    try {
      const payload = {
        assignment_id: assignment.id,
        title: draft.title.trim(),
        // "" clears the field; 0 is a real week, so compare explicitly.
        week: draft.week.trim() === "" ? null : Number(draft.week),
        date: draft.date || null,
        // `points` is deliberately absent: the panel shows it read-only, so
        // sending it back would be the UI asserting a value it cannot change.
        // grade / comment_grade are absent on purpose: they are edited through
        // the "Calificar" dialog, not this panel.
        description: draft.description,
      };
      await axiosPrivate.put("courses/teacher-assignments", payload);

      // Local state only — the page must not blank while a panel is open.
      if (courseData) {
        setCourseData({
          ...courseData,
          assignments: courseData.assignments.map((a) =>
            a.id === assignment.id
              ? {
                  ...a,
                  title: payload.title,
                  week: payload.week,
                  date: payload.date,
                  description: payload.description,
                }
              : a,
          ),
        });
      }

      setNotificationMessage(`"${payload.title}" se guardó correctamente`);
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error saving evaluation:", err);
      setNotificationMessage(
        apiErrorMessage(err, "No se pudo guardar la evaluación"),
      );
      showErrorToast();
      throw err;
    } finally {
      setEvaluationSaving(false);
    }
  };

  const handleAttachEvaluationFile = async (
    assignment: Assignment,
    file: File,
  ) => {
    if (isReadOnly) return;
    setEvaluationSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assignment_id", String(assignment.id));
      await axiosPrivate.post("courses/teacher-assignment-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchCourseData(true);
      setNotificationMessage(`"${file.name}" se adjuntó a la evaluación`);
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error attaching evaluation file:", err);
      setNotificationMessage(apiErrorMessage(err, "No se pudo adjuntar el archivo"));
      showErrorToast();
    } finally {
      setEvaluationSaving(false);
    }
  };

  const handleRemoveEvaluationFile = async (assignment: Assignment) => {
    if (isReadOnly) return;
    setEvaluationSaving(true);
    try {
      await axiosPrivate.delete("courses/teacher-assignment-file", {
        data: { assignment_id: assignment.id },
      });
      await fetchCourseData(true);
      setNotificationMessage("Se quitó el archivo de la evaluación");
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error removing evaluation file:", err);
      setNotificationMessage(apiErrorMessage(err, "No se pudo quitar el archivo"));
      showErrorToast();
    } finally {
      setEvaluationSaving(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!gradingAssignment) return;

    const kind = gradingAssignment.is_concert
      ? "el recital"
      : gradingAssignment.is_exam
        ? "el examen"
        : "la tarea";
    const validationError = validateGrade(
      String(formGrade),
      gradingAssignment.points ?? 100,
      `${kind} "${gradingAssignment.title}"`,
    );
    if (validationError) {
      setFormGradeError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const gradeValue = parseGradeInput(String(formGrade));
      await axiosPrivate.put("courses/teacher-assignments", {
        assignment_id: gradingAssignment.id,
        grade: gradeValue,
        comment_grade: formCommentGrade,
      });

      // Update local state instead of refetching
      if (courseData) {
        setCourseData({
          ...courseData,
          assignments: courseData.assignments.map((a) =>
            a.id === gradingAssignment.id
              ? { ...a, grade: gradeValue, comment_grade: formCommentGrade }
              : a,
          ),
        });
      }

      setGradeDialogOpen(false);
      setFormGradeError(null);
      // Nothing the still-animating dialog renders is cleared here — same
      // text-node reason as handleSaveDailyWork.

      // Show success notification
      setNotificationMessage(
        `Calificación de "${gradingAssignment.title}" guardada correctamente`,
      );
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error saving grade:", err);
      setNotificationMessage(apiErrorMessage(err, "Error al guardar la calificación"));
      showErrorToast();
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
      await fetchCourseData(true);

      setNotificationMessage("El curso se cerró correctamente");
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error finalizing enrollment:", err);
      // The server is the last word on what is still ungraded; if it sends a
      // list back, show it in the dialog rather than a toast that vanishes.
      const missing = (
        err as { response?: { data?: { missing?: unknown } } }
      )?.response?.data?.missing;
      if (Array.isArray(missing) && missing.length > 0) {
        setMissingGrades(missing as string[]);
      }
      setNotificationMessage(apiErrorMessage(err, "Error al cerrar la calificación"));
      showErrorToast();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignCourse = async (assignedCourseId: number | null) => {
    setSubmitting(true);
    try {
      await axiosPrivate.post(
        `courses/teacher-assign-course/${enrollmentId}`,
        { assigned_course_id: assignedCourseId },
      );
      setAssignCourseDialogOpen(false);
      setAssignCourseSearch("");
      await fetchCourseData(true);

      setNotificationMessage(
        assignedCourseId === null
          ? "Se quitó la asignatura del estudiante"
          : "Asignatura guardada correctamente",
      );
      showSuccessToast();
    } catch (err: unknown) {
      console.error("Error assigning course:", err);
      setNotificationMessage(apiErrorMessage(err, "Error al asignar la asignatura"));
      showErrorToast();
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

  /**
   * Everything the teacher still has to grade before the course can close.
   * Mirrors `missing_grade_items` in the API so the finalize dialog can list
   * it without a round trip.
   */
  const getMissingGrades = (): string[] => {
    if (!courseData) return [];
    const missing: string[] = [];

    const weekCount = Math.min(courseData.enrollment.week_duration, 22);
    for (let i = 1; i <= weekCount; i++) {
      if (getDailyWorkGrade(i) === null) {
        missing.push(`Trabajo cotidiano \u2014 Semana ${i}`);
      }
    }

    for (const assignment of courseData.assignments) {
      if (assignment.grade !== null) continue;
      if (assignment.is_concert || assignment.is_exam) {
        missing.push(
          `${assignment.is_concert ? "Recital" : "Examen"} \u2014 ${assignment.title}`,
        );
        continue;
      }
      // A plain tarea only appears under its own week. One filed outside the
      // course's weeks cannot be opened, so it must not block the close.
      if (assignment.week === null || assignment.week < 1 || assignment.week > weekCount) {
        continue;
      }
      missing.push(`Tarea \u2014 ${assignment.title}`);
    }

    return missing;
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
  const weeks = Array.from(
    { length: enrollment.week_duration },
    (_, i) => i + 1,
  );

  // Show read-only banner if status is not "cursando"
  const showReadOnlyBanner = isReadOnly;

  // Regular assignments (not exam or concert) for weekly content
  const getAssignmentsForWeek = (week: number) =>
    assignments.filter((a) => a.week === week && !a.is_exam && !a.is_concert);
  // `weeks` above is 1..week_duration, so the strict `=== week` here is also what
  // keeps the programme's week-0 resources out of every numbered week.
  const getResourcesForWeek = (week: number) =>
    resources.filter((r) => r.week === week);

  // "Programa del curso" attachments, selected with an explicit `=== 0`:
  // `resources.filter((r) => !r.week)` would swallow `null` too, and
  // `r.week &&` would hide every one of them.
  const programFiles = resources.filter(
    (r) => r.week === COURSE_PROGRAM_WEEK,
  );

  // Exam and concert assignments for "Evaluaciones del curso" section
  const evaluationAssignments = assignments.filter(
    (a) => a.is_exam || a.is_concert,
  );

  // Row actions. Labels show from `sm` up; below that the icon plus its
  // sr-only label carries the meaning, so nothing hides behind a menu.
  const rowAction =
    "inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:px-2.5";
  const rowActionDanger =
    "inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50 sm:px-2.5";
  const rowActionPrimary =
    "inline-flex items-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:px-2.5";

  // Why the course cannot be closed yet, or null when it can be.
  const needsAssignedCourse =
    enrollment.is_matricula && !enrollment.assigned_course;
  const finalizeBlockedReason = needsAssignedCourse
    ? "Elige la asignatura del estudiante antes de cerrar la calificación."
    : missingGrades.length > 0
      ? "Faltan calificaciones por registrar."
      : null;

  return (
    <div className="min-h-full bg-gray-50">
      {/* Read-only Banner */}
      {showReadOnlyBanner && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <InformationCircleIcon className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Modo de solo lectura:</span>{" "}
                Este curso tiene el estado "
                {enrollment.status === "aprobado"
                  ? "Aprobado"
                  : enrollment.status === "reprobado"
                    ? "Reprobado"
                    : enrollment.status}
                ". Solo puedes ver la información, no puedes realizar
                modificaciones.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 hover:bg-gray-100 shrink-0"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {enrollment.assigned_course?.name || enrollment.course.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {enrollment.assigned_course?.code || enrollment.course.code} -{" "}
                {enrollment.student.first_name} {enrollment.student.last_name}
              </p>
            </div>
            <div
              className={`shrink-0 rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium ring-1 ring-inset ${
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
        {/* Matricula: assign the actual subject */}
        {enrollment.is_matricula && (
          <div
            className={`mb-8 rounded-lg border px-4 py-4 ${
              enrollment.assigned_course
                ? "border-green-200 bg-green-50"
                : "border-yellow-200 bg-yellow-50"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {enrollment.assigned_course ? (
                  <p className="text-green-800">
                    Asignatura del estudiante:{" "}
                    <span className="font-semibold">
                      {`${enrollment.assigned_course.name} (${enrollment.assigned_course.code})`}
                    </span>
                  </p>
                ) : (
                  <p className="text-yellow-800">
                    Esta es una matrícula. Elige la asignatura del estudiante
                    antes de cerrar la calificación.
                  </p>
                )}
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setAssignCourseSearch("");
                    setAssignCourseDialogOpen(true);
                  }}
                  className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  {enrollment.assigned_course
                    ? "Cambiar asignatura"
                    : "Elegir asignatura"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Enrollment Info Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500">Estudiante</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900 ">
              {enrollment.student.first_name} {enrollment.student.last_name}
            </dd>
            <dd className="text-sm text-gray-500">
              {enrollment.student.email}
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
            <dt className="text-sm font-medium text-gray-500">Tareas</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {stats.graded_assignments} / {stats.total_assignments}
            </dd>
            <dd className="text-sm text-gray-500">calificadas</dd>
          </div>
          {/* <div className="bg-white rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500">Promedio</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {stats.average_grade ?? "--"}
            </dd>
            <dd className="text-sm text-gray-500">de tareas</dd>
          </div> */}
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
          <div className="px-6 py-4 border-b  border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Contenido del Curso
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Las tareas son evaluadas solo como referencia para el estudiante.
              Los puntos que afectan la nota final son los de "Trabajo
              Cotidiano" junto a cada semana.
            </p>
          </div>

          {/* Programa del curso — week 0, above "Semana 1" and outside the
              numbered weeks below. */}
          <div className="border-b border-gray-200">
            <CourseProgram
              text={enrollment.course_program ?? null}
              files={programFiles}
              readOnly={isReadOnly}
              saving={programSaving}
              onSaveText={handleSaveProgram}
              onAddFile={handleAddProgramFile}
              onEditFile={(file) => {
                const resource = resources.find((r) => r.id === file.id);
                if (resource) openResourceDrawer(COURSE_PROGRAM_WEEK, resource);
              }}
              onDeleteFile={(file) =>
                openDeleteDialog("resource", file.id, file.title)
              }
            />
          </div>

          <ul role="list" className="divide-y divide-gray-100">
            {weeks.map((week) => {
              const weekAssignments = getAssignmentsForWeek(week);
              const weekResources = getResourcesForWeek(week);
              const hasContent =
                weekAssignments.length > 0 || weekResources.length > 0;

              return (
                <li key={week} className="px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold">
                        {week}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Semana {week}
                      </h3>
                      {/* Trabajo Cotidiano Button */}
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
                            {`${formatGrade(getDailyWorkGrade(week))}/10`}
                          </span>
                        ) : (
                          <span className="text-black">Calificar semana</span>
                        )}
                      </button>
                    </div>
                    {!isReadOnly && (
                      <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                        <button
                          onClick={() => openAssignmentDrawer(week)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:flex-none"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Tarea
                        </button>
                        <button
                          onClick={() => openResourceDrawer(week)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:flex-none"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Recurso
                        </button>
                      </div>
                    )}
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
                      className="flex items-center justify-between gap-x-3 sm:gap-x-6 py-4 border-t border-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-x-3">
                          {assignment.is_concert ? (
                            <GiMusicalNotes className="size-5 shrink-0 text-purple-500 mt-0.5" />
                          ) : assignment.is_exam ? (
                            <ClipboardDocumentCheckIcon className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                          ) : (
                            <GiMusicalScore className="size-5 shrink-0 text-blue-500 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {assignment.title}
                              </p>
                              {assignment.grade !== null ? (
                                <p className="inline-flex rounded-md px-1.5 py-0.5 sm:py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                  {`${formatGrade(assignment.grade)}${
                                    assignment.points !== null
                                      ? ` / ${formatGrade(assignment.points)}`
                                      : ""
                                  } pts`}
                                </p>
                              ) : (
                                <p className="inline-flex items-center rounded-md px-1.5 py-0.5 sm:py-1 text-xs font-medium text-amber-600 ring-1 ring-inset ring-yellow-600/20">
                                  <FaExclamation className="size-3 mr-0" />{" "}
                                  <span className="hidden sm:inline">Pendiente calificar - </span>
                                  <span className="sm:hidden">Pend. - </span>
                                  {assignment.points !== null &&
                                    ` ${assignment.points} pts`}
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
                      <div className="flex flex-none items-center gap-x-1 sm:gap-x-2">
                        {assignment.assignment_file_url && (
                          <a
                            href={assignment.assignment_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={rowAction}
                          >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only">
                              Descargar
                            </span>
                          </a>
                        )}
                        {!isReadOnly && (
                          <button
                            onClick={() => openGradeDialog(assignment)}
                            className={rowActionPrimary}
                          >
                            <ClipboardDocumentCheckIcon className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only">
                              {assignment.grade === null
                                ? "Calificar"
                                : "Editar nota"}
                            </span>
                          </button>
                        )}
                        <Link
                          to={`/teacher/assignment/${assignment.id}`}
                          className={rowAction}
                        >
                          Detalles
                        </Link>
                        {!assignment.is_concert && !isReadOnly && (
                          <button
                            onClick={() =>
                              openAssignmentDrawer(week, assignment)
                            }
                            className={rowAction}
                            title="Editar tarea"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </button>
                        )}
                        {!assignment.is_concert &&
                          !assignment.is_exam &&
                          !isReadOnly && (
                            <button
                              onClick={() =>
                                openDeleteDialog(
                                  "assignment",
                                  assignment.id,
                                  assignment.title,
                                )
                              }
                              className={rowActionDanger}
                              title="Eliminar tarea"
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </button>
                          )}
                      </div>
                    </div>
                  ))}

                  {/* Resources */}
                  {weekResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between gap-x-3 sm:gap-x-6 py-4 border-t border-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-x-3">
                          <FolderIcon className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {resource.title}
                            </p>
                            <p className="mt-0.5 inline-flex rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                              Recurso
                            </p>
                          </div>
                        </div>
                        {/* {resource.description && (
                          <p className="mt-1 text-xs text-gray-500 pl-8 line-clamp-2">
                            {resource.description}
                          </p>
                        )} */}
                      </div>
                      <div className="flex flex-none items-center gap-x-1 sm:gap-x-2">
                        {resource.resource_file_url && (
                          <a
                            href={resource.resource_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={rowAction}
                          >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only">
                              Descargar
                            </span>
                          </a>
                        )}
                        <Link
                          to={`/teacher/resource/${resource.id}`}
                          className={rowAction}
                        >
                          Detalles
                        </Link>
                        {!isReadOnly && (
                          <button
                            onClick={() => openResourceDrawer(week, resource)}
                            className={rowAction}
                            title="Editar recurso"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </button>
                        )}
                        {!isReadOnly && (
                          <button
                            onClick={() =>
                              openDeleteDialog(
                                "resource",
                                resource.id,
                                resource.title,
                              )
                            }
                            className={rowActionDanger}
                            title="Eliminar recurso"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
                <li key={assignment.id} className="px-4 sm:px-6 py-5">
                  <div className="flex items-center justify-between gap-x-3 sm:gap-x-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-x-3">
                        {assignment.is_concert &&
                        assignment.title != "Participación en Recital" ? (
                          <GiMusicalNotes className="size-5 shrink-0 text-purple-500 mt-0.5" />
                        ) : assignment.is_exam ? (
                          <ClipboardDocumentCheckIcon className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                        ) : (
                          <GiMusicalScore className="h-5 w-5 shrink-0 text-purple-500 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {assignment.title}
                            </p>
                            {assignment.grade !== null ? (
                              <p className="inline-flex rounded-md px-1.5 py-0.5 sm:py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                {`${formatGrade(assignment.grade)}${
                                  assignment.points !== null
                                    ? ` / ${formatGrade(assignment.points)}`
                                    : ""
                                } pts`}
                              </p>
                            ) : (
                              <p className="inline-flex items-center rounded-md px-1.5 py-0.5 sm:py-1 text-xs font-medium text-amber-600 ring-1 ring-inset ring-yellow-600/20">
                                <FaExclamation className="size-3 mr-0" />{" "}
                                <span className="hidden sm:inline">Pendiente calificar - </span>
                                <span className="sm:hidden">Pend. - </span>
                                {assignment.points !== null &&
                                  ` ${assignment.points} pts`}
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
                    <div className="flex flex-none items-center gap-x-1 sm:gap-x-2">
                      {assignment.assignment_file_url && (
                        <a
                          href={assignment.assignment_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={rowAction}
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only">
                            Descargar
                          </span>
                        </a>
                      )}
                      {!isReadOnly && (
                        <button
                          onClick={() => openGradeDialog(assignment)}
                          className={rowActionPrimary}
                        >
                          <ClipboardDocumentCheckIcon className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only">
                            {assignment.grade === null
                              ? "Calificar"
                              : "Editar nota"}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleEvaluation(assignment.id)}
                        aria-expanded={openEvaluationId === assignment.id}
                        aria-controls={`evaluacion-${assignment.id}`}
                        className={rowAction}
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">
                          Instrucciones
                        </span>
                        <ChevronDownIcon
                          aria-hidden="true"
                          className={`h-4 w-4 transition-transform ${
                            openEvaluationId === assignment.id
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {openEvaluationId === assignment.id && (
                    <div id={`evaluacion-${assignment.id}`}>
                      <EvaluationDetails
                        assignment={assignment}
                        readOnly={isReadOnly}
                        saving={evaluationSaving}
                        onSave={(draft) => handleSaveEvaluation(assignment, draft)}
                        onAttachFile={(file) =>
                          handleAttachEvaluationFile(assignment, file)
                        }
                        onRemoveFile={() =>
                          handleRemoveEvaluationFile(assignment)
                        }
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Assign All Daily Work Points Button */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Resumen y Calificación Final
            </h2>
            {enrollment.status === "cursando" && (
              <button
                onClick={openFinalizeDialog}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
              >
                <AcademicCapIcon className="h-5 w-5" />
                Finalizar Curso
              </button>
            )}
          </div>

          {/* Grade Breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 mb-4">
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

      {/* Assignment Drawer */}
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

      {/* Resource Drawer */}
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
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed  inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative w-full transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setGradeDialogOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:size-10">
                  <CheckCircleIcon
                    className="size-6 text-green-600"
                    aria-hidden="true"
                  />
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
                      <label className=" block text-start text-sm/6 font-medium text-gray-900">
                        {gradingAssignment?.points != null
                          ? `Puntos obtenidos (máximo ${formatGrade(gradingAssignment.points)})`
                          : "Puntos obtenidos"}
                      </label>
                      {/* text, not number: a number input drops the comma. */}
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={formGrade}
                        onChange={(e) => {
                          const next = e.target.value.replace(".", ",");
                          if (!isPartialGradeInput(next)) return;
                          setFormGrade(next);
                          setFormGradeError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveGrade();
                        }}
                        aria-invalid={formGradeError ? true : undefined}
                        className={`mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                          formGradeError
                            ? "outline-red-400 focus-visible:outline-red-500"
                            : "outline-gray-300 focus-visible:outline-gray-900"
                        }`}
                        placeholder="Por ejemplo: 7,5"
                      />
                      {formGradeError && (
                        <p className="mt-1.5 text-start text-sm text-red-600">
                          {formGradeError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm/6 text-start font-medium text-gray-900">
                        Comentario
                      </label>
                      <textarea
                        rows={3}
                        value={formCommentGrade}
                        onChange={(e) => setFormCommentGrade(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                        placeholder="Comentario sobre la calificación..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting || isReadOnly}
                  onClick={handleSaveGrade}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {submitting ? "Guardando..." : "Guardar Calificación"}
                </button>
                <button
                  type="button"
                  onClick={() => setGradeDialogOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
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
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setFinalizeDialogOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:size-10">
                  <AcademicCapIcon
                    className="size-6 text-yellow-600"
                    aria-hidden="true"
                  />
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
                      Esta acción es solo para el final del periodo y cambiará
                      el estado del estudiante a Aprobado o Reprobado.
                    </p>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm/6 font-medium text-gray-900">
                        Calificación Final (calculada automáticamente)
                      </label>
                      <input
                        type="text"
                        value={formFinalGrade}
                        disabled
                        className="mt-1 block w-full rounded-md bg-gray-100 px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 cursor-not-allowed sm:text-sm/6 font-semibold"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Basada en: 50% Trabajo Cotidiano + 40% Examen + 10%
                        Participación en Recital
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm/6 font-medium text-gray-900">
                        Estado Final (basado en nota ≥ 70)
                      </label>
                      <div
                        className={`mt-1 block w-full rounded-md px-3 py-1.5 text-base font-semibold cursor-not-allowed sm:text-sm/6 ${
                          formStatus === "aprobado"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formStatus === "aprobado" ? "Aprobado" : "Reprobado"}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {Number(formFinalGrade) >= 70
                          ? "El estudiante aprueba con nota mayor o igual a 70"
                          : "El estudiante reprueba con nota menor a 70"}
                      </p>
                    </div>
                    {enrollment.is_matricula && (
                      <div>
                        <label
                          htmlFor="finalize-assigned-course"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Asignatura del estudiante
                        </label>
                        <select
                          id="finalize-assigned-course"
                          value={enrollment.assigned_course?.id ?? ""}
                          disabled={submitting}
                          onChange={(e) =>
                            handleAssignCourse(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                          className={`mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 sm:text-sm/6 ${
                            enrollment.assigned_course
                              ? "outline-gray-300"
                              : "outline-red-400"
                          }`}
                        >
                          <option value="">Sin asignatura</option>
                          {enrollment.assigned_course &&
                            !assignCourseOptions.some(
                              (c) => c.id === enrollment.assigned_course!.id,
                            ) && (
                              <option value={enrollment.assigned_course.id}>
                                {`${enrollment.assigned_course.name} (${enrollment.assigned_course.code})`}
                              </option>
                            )}
                          {assignCourseOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {`${c.name} (${c.code})`}
                            </option>
                          ))}
                        </select>
                        <p
                          className={`mt-1 text-xs ${
                            enrollment.assigned_course
                              ? "text-gray-500"
                              : "text-red-600"
                          }`}
                        >
                          {enrollment.assigned_course
                            ? "Puedes cambiarla aquí o desde el aviso al inicio de la página."
                            : "Elige la asignatura antes de cerrar la calificación."}
                        </p>
                      </div>
                    )}

                    {missingGrades.length > 0 && (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3">
                        <p className="text-sm font-semibold text-red-800">
                          {missingGrades.length === 1
                            ? "Falta 1 calificación por registrar"
                            : `Faltan ${missingGrades.length} calificaciones por registrar`}
                        </p>
                        <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm text-red-700">
                          {missingGrades.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span aria-hidden="true">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm/6 font-medium text-gray-900">
                        Observación del Profesor
                      </label>
                      <textarea
                        rows={3}
                        value={formObservation}
                        onChange={(e) => setFormObservation(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                        placeholder="Observaciones finales sobre el desempeño del estudiante..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting || finalizeBlockedReason !== null}
                  title={finalizeBlockedReason ?? undefined}
                  onClick={handleFinalize}
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto ${
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
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Assign Subject Dialog (matricula) */}
      <Dialog
        open={assignCourseDialogOpen}
        onClose={() => setAssignCourseDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setAssignCourseDialogOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <DialogTitle
                as="h3"
                className="text-base font-semibold text-gray-900"
              >
                Asignatura del estudiante
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500">
                Elige la asignatura que este estudiante cursa bajo su matrícula.
              </p>
              <div className="mt-4">
                <input
                  type="text"
                  value={assignCourseSearch}
                  onChange={(e) => setAssignCourseSearch(e.target.value)}
                  placeholder="Buscar por código o nombre..."
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                />
                <ul className="mt-2 max-h-64 overflow-auto divide-y divide-gray-100 rounded-md border border-gray-200">
                  {assignCourseOptions.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-gray-500">
                      No hay asignaturas que coincidan.
                    </li>
                  ) : (
                    assignCourseOptions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleAssignCourse(c.id)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="font-medium text-gray-900">
                            {c.name}
                          </span>
                          <span className="text-xs text-gray-500">{c.code}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                {courseData?.enrollment.assigned_course && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAssignCourse(null)}
                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-xs ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50 sm:ml-3 sm:w-auto"
                  >
                    Quitar asignatura
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAssignCourseDialogOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cerrar
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
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon
                    className="size-6 text-red-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Eliminar{" "}
                    {deletingItem?.type === "assignment" ? "Tarea" : "Recurso"}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas eliminar{" "}
                      <span className="font-medium text-gray-900">
                        {`"${deletingItem?.title ?? ""}"`}
                      </span>
                      ? Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {submitting ? "Eliminando..." : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeletingItem(null);
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
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
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative w-full transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
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

      {/* Daily Work Dialog */}
      <Dialog
        open={dailyWorkDialogOpen}
        onClose={() => setDailyWorkDialogOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative w-full transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setDailyWorkDialogOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
                  <BiCalendarEdit
                    className="size-6 text-blue-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    {/* One interpolated string, not two children: React then
                        rewrites the text node in place instead of deleting
                        one, which is what crashed under a translator. */}
                    {`Trabajo Cotidiano - Semana ${selectedDailyWorkWeek ?? ""}`}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500">
                    Califica el trabajo cotidiano del estudiante. Máximo 10
                    puntos, con un decimal: 7,5.
                  </p>
                  <div className="mt-4">
                    <label className="block text-start text-sm/6 font-medium text-gray-900">
                      Puntos (0 a 10)
                    </label>
                    {/* type="text", not "number": a number input silently
                        discards the comma teachers type for decimals. */}
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={formDailyWorkGrade}
                      onChange={(e) => {
                        const next = e.target.value.replace(".", ",");
                        if (!isPartialGradeInput(next)) return;
                        setFormDailyWorkGrade(next);
                        setFormDailyWorkError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveDailyWork();
                      }}
                      aria-invalid={formDailyWorkError ? true : undefined}
                      className={`mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                        formDailyWorkError
                          ? "outline-red-400 focus-visible:outline-red-500"
                          : "outline-gray-300 focus-visible:outline-gray-900"
                      }`}
                      placeholder="Por ejemplo: 7,5"
                    />
                    {formDailyWorkError && (
                      <p className="mt-1.5 text-sm text-red-600">
                        {formDailyWorkError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting || isReadOnly}
                  onClick={handleSaveDailyWork}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setDailyWorkDialogOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Success Notification */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showSuccessNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-6 text-primary"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          ¡Éxito!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {notificationMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSuccessNotification(false);
                          }}
                          className="inline-flex hover:cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                        >
                          <span className="sr-only">Cerrar</span>
                          <XMarkIconSolid
                            aria-hidden="true"
                            className="size-5"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body,
        )}

      {/* Error Notification */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showErrorNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <XCircleIcon
                          aria-hidden="true"
                          className="size-6 text-red-600"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Error
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {notificationMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowErrorNotification(false);
                          }}
                          className="inline-flex hover:cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                        >
                          <span className="sr-only">Cerrar</span>
                          <XMarkIconSolid
                            aria-hidden="true"
                            className="size-5"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
