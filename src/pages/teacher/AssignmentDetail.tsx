import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
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
  CheckCircleIcon,
  XMarkIcon,
  XCircleIcon,
  PaperClipIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import {
  formatGrade,
  isPartialGradeInput,
  parseGradeInput,
  validateGrade,
} from "../../utils/grades";

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
  is_exam: boolean;
  is_concert: boolean;
}

interface Enrollment {
  id: number;
  course_name: string | null;
  course_code: string | null;
  student_name: string | null;
  student_email: string | null;
}

export default function AssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  // Edit dialog states
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Grade dialog state
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [formGrade, setFormGrade] = useState<string>("");
  const [formGradeError, setFormGradeError] = useState<string | null>(null);
  const [formCommentGrade, setFormCommentGrade] = useState<string>("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [successNotificationMessage, setSuccessNotificationMessage] = useState("");
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");

  const fetchAssignment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `courses/teacher-assignments?assignment_id=${assignmentId}`
      );
      setAssignment(response.data.assignment);
      setEnrollment(response.data.enrollment);
    } catch (err: unknown) {
      console.error("Error fetching assignment:", err);
      setError("Error al cargar la tarea. Intente volver y acceder de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  const openEditDialog = (
    field: string,
    currentValue: string | number | null
  ) => {
    setEditField(field);
    setEditValue(currentValue?.toString() || "");
  };

  const closeEditDialog = () => {
    setEditField(null);
    setEditValue("");
  };

  const openGradeDialog = () => {
    if (!assignment) return;
    setFormGrade(formatGrade(assignment.grade, ""));
    setFormCommentGrade(assignment.comment_grade || "");
    setFormGradeError(null);
    setGradeDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!assignment || !editField) return;
    setSubmitting(true);

    try {
      const updateData: Record<string, unknown> = {
        assignment_id: assignment.id,
      };

      if (editField === "title") {
        updateData.title = editValue;
      } else if (editField === "description") {
        updateData.description = editValue;
      } else if (editField === "week") {
        updateData.week = editValue ? Number(editValue) : null;
      } else if (editField === "date") {
        updateData.date = editValue || null;
      } else if (editField === "points") {
        updateData.points = editValue ? Number(editValue) : null;
      }

      await axiosPrivate.put("courses/teacher-assignments", updateData);
      closeEditDialog();
      setSuccessNotificationMessage("Campo actualizado exitosamente");
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 3000);
      fetchAssignment();
    } catch (err) {
      console.error("Error updating assignment:", err);
      setErrorNotificationMessage("Error al actualizar el campo");
      setShowErrorNotification(true);
      setTimeout(() => setShowErrorNotification(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGrade = async () => {
    if (!assignment) return;

    const kind = assignment.is_concert
      ? "el recital"
      : assignment.is_exam
        ? "el examen"
        : "la tarea";
    const validationError = validateGrade(
      formGrade,
      assignment.points ?? 100,
      `${kind} "${assignment.title}"`
    );
    if (validationError) {
      setFormGradeError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await axiosPrivate.put("courses/teacher-assignments", {
        assignment_id: assignment.id,
        grade: parseGradeInput(formGrade),
        comment_grade: formCommentGrade,
      });
      setGradeDialogOpen(false);
      setFormGradeError(null);
      setSuccessNotificationMessage("Calificación guardada exitosamente");
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 3000);
      fetchAssignment();
    } catch (err) {
      console.error("Error saving grade:", err);
      setErrorNotificationMessage("Error al guardar la calificación");
      setShowErrorNotification(true);
      setTimeout(() => setShowErrorNotification(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadFile = async () => {
    if (!assignment || !selectedFile) return;
    setIsUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("assignment_id", assignment.id.toString());

      await axiosPrivate.post("courses/teacher-assignment-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccessNotificationMessage("Archivo subido exitosamente");
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 3000);
      fetchAssignment();
    } catch (err: any) {
      console.error("Error uploading file:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al subir el archivo"
      );
      setShowErrorNotification(true);
      setTimeout(() => setShowErrorNotification(false), 5000);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!assignment) return;

    try {
      await axiosPrivate.delete("courses/teacher-assignment-file", {
        data: { assignment_id: assignment.id },
      });
      setSuccessNotificationMessage("Archivo eliminado exitosamente");
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 3000);
      fetchAssignment();
    } catch (err: any) {
      console.error("Error deleting file:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al eliminar el archivo"
      );
      setShowErrorNotification(true);
      setTimeout(() => setShowErrorNotification(false), 5000);
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      title: "Título",
      description: "Descripción",
      week: "Semana",
      date: "Fecha de Entrega",
      points: "Puntos Disponibles",
    };
    return labels[field] || field;
  };

  const getFieldType = (field: string) => {
    if (field === "week" || field === "points") return "number";
    if (field === "date") return "date";
    if (field === "description") return "textarea";
    return "text";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-full bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Detalle de Tarea
            </h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <p className="text-gray-600 text-lg">
                {error || "Tarea no encontrada"}
              </p>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Detalle de Tarea
              </h1>
              {enrollment && (
                <p className="text-sm text-gray-500">
                  {enrollment.course_code} - {enrollment.student_name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Information */}
        <div className="px-4 sm:px-0">
          <h3 className="text-base/7 font-semibold text-gray-900">
            Información de la Tarea
          </h3>
          <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
            Detalles y configuración de la tarea.
          </p>
        </div>
        <div className="mt-6 border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            {/* Title */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">Título</dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow">{assignment.title}</span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog("title", assignment.title)}
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>

            {/* Week */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">Semana</dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow">
                  {assignment.week ?? "No especificada"}
                </span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog("week", assignment.week)}
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>

            {/* Date */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">
                Fecha de Entrega
              </dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow">
                  {assignment.date
                    ? new Date(assignment.date).toLocaleDateString("es", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "No especificada"}
                </span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog("date", assignment.date)}
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>

            {/* Description */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">
                Descripción
              </dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow whitespace-pre-wrap">
                  {assignment.description || "Sin descripción"}
                </span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      openEditDialog("description", assignment.description)
                    }
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>

            {/* Points */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">
                Puntos Disponibles
              </dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow">
                  {formatGrade(assignment.points, "No especificados")}
                </span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog("points", assignment.points)}
                    className={` ${assignment.is_exam ? "hidden" : assignment.is_concert ? "hidden" : "rounded-md bg-white font-medium text-primary hover:text-primary/80"}`}
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>

            {/* Attachments */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">
                Archivo Adjunto
              </dt>
              <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                {assignment.assignment_file_url ? (
                  <ul
                    role="list"
                    className="divide-y divide-gray-100 rounded-md border border-gray-200"
                  >
                    <li className="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">
                      <div className="flex w-0 flex-1 items-center">
                        <PaperClipIcon className="size-5 shrink-0 text-gray-400" />
                        <div className="ml-4 flex min-w-0 flex-1 gap-2">
                          <span className="truncate font-medium text-gray-900">
                            Archivo de tarea
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex shrink-0 space-x-4">
                        <a
                          href={assignment.assignment_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                        >
                          Descargar
                        </a>
                        <span className="text-gray-200" aria-hidden="true">
                          |
                        </span>
                        <button
                          type="button"
                          onClick={handleDeleteFile}
                          className="rounded-md bg-white font-medium text-red-600 hover:text-red-500"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  </ul>
                ) : (
                  <div>
                    {/* Selected file preview */}
                    {selectedFile && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <PaperClipIcon className="size-5 text-green-600" />
                            <span className="text-sm text-green-700 truncate max-w-[200px]">
                              {selectedFile.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleUploadFile}
                              disabled={isUploadingFile}
                              className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                            >
                              {isUploadingFile ? "Subiendo..." : "Subir"}
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveSelectedFile}
                              className="text-sm font-medium text-red-600 hover:text-red-500"
                            >
                              <TrashIcon className="size-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* File upload area */}
                    {!selectedFile && (
                      <div className="text-center rounded-lg border border-dashed border-gray-300 px-6 py-10">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          aria-hidden="true"
                          className="mx-auto size-12 text-gray-400"
                        >
                          <path
                            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">
                          Sin archivo
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Sube un archivo PDF, documento o imagen
                        </p>
                        <div className="mt-6">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <PlusIcon className="mr-1.5 -ml-0.5 size-5" />
                            Seleccionar archivo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Grade Section */}
        <div className="mt-10 px-4 sm:px-0">
          <h3 className="text-base/7 font-semibold text-gray-900">
            Calificación
          </h3>
          <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
            Nota y comentarios sobre el desempeño del estudiante.
          </p>
        </div>
        <div className="mt-6 border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            {/* Grade */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">Puntos Obtenidos</dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow">
                  {assignment.grade !== null ? (
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-lg font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                      {`${formatGrade(assignment.grade)}${
                        assignment.points !== null
                          ? ` / ${formatGrade(assignment.points)}`
                          : ""
                      }`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-sm font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                      Sin calificar
                    </span>
                  )}
                </span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={openGradeDialog}
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    {assignment.grade !== null ? "Actualizar" : "Calificar"}
                  </button>
                </span>
              </dd>
            </div>

            {/* Comment Grade */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">
                Comentario
              </dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow whitespace-pre-wrap">
                  {assignment.comment_grade || "Sin comentario"}
                </span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={openGradeDialog}
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Created At */}
        {assignment.created_at && (
          <div className="mt-6 text-sm text-gray-500">
            Creada el{" "}
            {new Date(assignment.created_at).toLocaleDateString("es", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* Edit Field Dialog */}
      <Dialog
        open={editField !== null}
        onClose={closeEditDialog}
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
                  onClick={closeEditDialog}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div>
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold text-gray-900"
                >
                  Actualizar {getFieldLabel(editField || "")}
                </DialogTitle>
                <div className="mt-4">
                  {getFieldType(editField || "") === "textarea" ? (
                    <textarea
                      rows={4}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                      placeholder={`Ingrese ${getFieldLabel(
                        editField || ""
                      ).toLowerCase()}`}
                    />
                  ) : (
                    <input
                      type={getFieldType(editField || "")}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                      placeholder={`Ingrese ${getFieldLabel(
                        editField || ""
                      ).toLowerCase()}`}
                      min={editField === "week" ? 1 : undefined}
                    />
                  )}
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSaveField}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={closeEditDialog}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

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
                    {assignment.title}
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-start text-sm/6 font-medium text-gray-900">
                        {assignment.points !== null
                          ? `Puntos obtenidos (máximo ${formatGrade(assignment.points)})`
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
                      <label className="block text-start text-sm/6 font-medium text-gray-900">
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
                          className="size-6 text-green-400"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          {successNotificationMessage || "Guardado exitosamente"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los cambios se han guardado correctamente.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowSuccessNotification(false)}
                          className="inline-flex hover:cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                        >
                          <span className="sr-only">Cerrar</span>
                          <XMarkIconSolid aria-hidden="true" className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body
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
                        <p className="text-sm font-medium text-gray-900">Error</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {errorNotificationMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowErrorNotification(false)}
                          className="inline-flex hover:cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                        >
                          <span className="sr-only">Cerrar</span>
                          <XMarkIconSolid aria-hidden="true" className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
