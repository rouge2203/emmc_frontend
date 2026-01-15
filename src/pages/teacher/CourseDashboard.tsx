import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
} from "@heroicons/react/24/outline";
import AssignmentDrawer from "../../components/drawers/teacher_drawers/AssignmentDrawer";
import ResourceDrawer from "../../components/drawers/teacher_drawers/ResourceDrawer";

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

  // Drawer states
  const [assignmentDrawerOpen, setAssignmentDrawerOpen] = useState(false);
  const [resourceDrawerOpen, setResourceDrawerOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);

  // Form states
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null
  );
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(
    null
  );

  // Form fields for dialogs
  const [formGrade, setFormGrade] = useState<number | string>("");
  const [formCommentGrade, setFormCommentGrade] = useState("");
  const [formFinalGrade, setFormFinalGrade] = useState<number | string>("");
  const [formObservation, setFormObservation] = useState("");
  const [formStatus, setFormStatus] = useState<"aprobado" | "reprobado">(
    "aprobado"
  );

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    type: "assignment" | "resource";
    id: number;
    title: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `courses/teacher-course/${enrollmentId}`
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

  const openAssignmentDrawer = (week: number, assignment?: Assignment) => {
    setSelectedWeek(week);
    setEditingAssignment(assignment || null);
    setAssignmentDrawerOpen(true);
  };

  const openResourceDrawer = (week: number, resource?: Resource) => {
    setSelectedWeek(week);
    setEditingResource(resource || null);
    setResourceDrawerOpen(true);
  };

  const openGradeDialog = (assignment: Assignment) => {
    setGradingAssignment(assignment);
    setFormGrade(assignment.grade ?? "");
    setFormCommentGrade(assignment.comment_grade || "");
    setGradeDialogOpen(true);
  };

  const openFinalizeDialog = () => {
    setFormFinalGrade(courseData?.enrollment.grade ?? "");
    setFormObservation(courseData?.enrollment.professor_observation || "");
    setFormStatus("aprobado");
    setFinalizeDialogOpen(true);
  };

  const openDeleteDialog = (
    type: "assignment" | "resource",
    id: number,
    title: string
  ) => {
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
    if (!gradingAssignment) return;
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
    (_, i) => i + 1
  );

  const getAssignmentsForWeek = (week: number) =>
    assignments.filter((a) => a.week === week);
  const getResourcesForWeek = (week: number) =>
    resources.filter((r) => r.week === week);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
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
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Contenido del Curso
            </h2>
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
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAssignmentDrawer(week)}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Tarea
                      </button>
                      <button
                        onClick={() => openResourceDrawer(week)}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
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
                            <p className="text-sm font-semibold text-gray-900">
                              {assignment.title}
                            </p>
                            {assignment.grade !== null ? (
                              <p className="mt-0.5 inline-flex rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                {assignment.grade}
                                {assignment.points !== null &&
                                  ` / ${assignment.points}`}{" "}
                                pts
                              </p>
                            ) : (
                              <p className="mt-0.5 inline-flex rounded-md bg-yellow-50 px-1.5 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                                Sin calificar
                                {assignment.points !== null &&
                                  ` (${assignment.points} pts)`}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* {assignment.description && (
                          <p className="mt-1 text-xs text-gray-500 pl-8 line-clamp-2">
                            {assignment.description}
                          </p>
                        )} */}
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
                        {assignment.grade === null && (
                          <button
                            onClick={() => openGradeDialog(assignment)}
                            className="rounded-md bg-primary px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
                          >
                            Calificar
                          </button>
                        )}
                        <Link
                          to={`/teacher/assignment/${assignment.id}`}
                          className=" hidden sm:block rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Ver
                        </Link>
                        <Menu as="div" className="relative">
                          <Menu.Button className="block rounded-md p-2 text-gray-500 hover:text-gray-900">
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </Menu.Button>

                          <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/teacher/assignment/${assignment.id}`
                                    )
                                  }
                                  className={`${
                                    active ? "bg-gray-50" : ""
                                  } block w-full px-3 py-1 text-left text-sm text-gray-900`}
                                >
                                  Ver
                                </button>
                              )}
                            </Menu.Item>
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
                                  onClick={() => openGradeDialog(assignment)}
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
                                      assignment.title
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
                        {/* {resource.description && (
                          <p className="mt-1 text-xs text-gray-500 pl-8 line-clamp-2">
                            {resource.description}
                          </p>
                        )} */}
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
                        <Link
                          to={`/teacher/resource/${resource.id}`}
                          className="hidden sm:block rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Ver
                        </Link>
                        <Menu as="div" className="relative">
                          <Menu.Button className="block rounded-md p-2 text-gray-500 hover:text-gray-900">
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </Menu.Button>
                          <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() =>
                                    navigate(`/teacher/resource/${resource.id}`)
                                  }
                                  className={`${
                                    active ? "bg-gray-50" : ""
                                  } block w-full px-3 py-1 text-left text-sm text-gray-900`}
                                >
                                  Ver
                                </button>
                              )}
                            </Menu.Item>
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
                                      resource.title
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

        {/* Final Grade Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500">
                Tareas Totales
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.total_assignments}
              </dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500">
                Puntos Obtenidos
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.total_points_obtained} / {stats.total_points_available}
              </dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500">Nota Final</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {enrollment.grade ?? "--"}
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
                        className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                        placeholder={
                          gradingAssignment?.points !== null
                            ? `0-${gradingAssignment?.points}`
                            : "Puntos obtenidos"
                        }
                      />
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
                  disabled={submitting}
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
                        Estado Final
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(
                            e.target.value as "aprobado" | "reprobado"
                          )
                        }
                        className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                      >
                        <option value="aprobado">Aprobado</option>
                        <option value="reprobado">Reprobado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm/6 font-medium text-gray-900">
                        Nota Final (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formFinalGrade}
                        onChange={(e) => setFormFinalGrade(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                        placeholder="0-100"
                      />
                    </div>
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
                  disabled={submitting}
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
                        "{deletingItem?.title}"
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
    </div>
  );
}
