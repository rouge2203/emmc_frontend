import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop, Transition } from "@headlessui/react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  ArrowLeftIcon,
  XMarkIcon,
  PaperClipIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

interface Resource {
  id: number;
  week: number | null;
  title: string;
  description: string | null;
  resource_file_url: string | null;
  created_at: string | null;
}

interface Enrollment {
  id: number;
  course_name: string | null;
  course_code: string | null;
  student_name: string | null;
  student_email: string | null;
}

export default function ResourceDetail() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<Resource | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  // Edit dialog states
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);

  // Notification states
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  const fetchResource = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosPrivate.get(
        `courses/teacher-resources?resource_id=${resourceId}`
      );
      setResource(response.data.resource);
      setEnrollment(response.data.enrollment);
    } catch (err: unknown) {
      console.error("Error fetching resource:", err);
      setError("Error al cargar el recurso. Intente volver y acceder de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resourceId) {
      fetchResource();
    }
  }, [resourceId]);

  const openEditDialog = (field: string, currentValue: string | number | null) => {
    setEditField(field);
    setEditValue(currentValue?.toString() || "");
  };

  const closeEditDialog = () => {
    setEditField(null);
    setEditValue("");
  };

  const handleSaveField = async () => {
    if (!resource || !editField) return;
    setSubmitting(true);

    try {
      const updateData: Record<string, unknown> = {
        resource_id: resource.id,
      };

      if (editField === "title") {
        updateData.title = editValue;
      } else if (editField === "description") {
        updateData.description = editValue;
      } else if (editField === "week") {
        updateData.week = editValue ? Number(editValue) : null;
      }

      await axiosPrivate.put("courses/teacher-resources", updateData);
      closeEditDialog();
      fetchResource();
      showNotification("success", "Campo actualizado correctamente");
    } catch (err) {
      console.error("Error updating resource:", err);
      showNotification("error", "Error al actualizar el campo");
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

  const handleUploadFile = async () => {
    if (!resource || !selectedFile) return;
    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("resource_id", resource.id.toString());

      await axiosPrivate.post("courses/teacher-resource-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      fetchResource();
      showNotification("success", "Archivo subido correctamente");
    } catch (err) {
      console.error("Error uploading file:", err);
      showNotification("error", "Error al subir el archivo");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!resource) return;
    setDeletingFile(true);

    try {
      await axiosPrivate.delete("courses/teacher-resource-file", {
        data: { resource_id: resource.id },
      });

      fetchResource();
      showNotification("success", "Archivo eliminado correctamente");
    } catch (err) {
      console.error("Error deleting file:", err);
      showNotification("error", "Error al eliminar el archivo");
    } finally {
      setDeletingFile(false);
    }
  };

  const handleCancelSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      title: "Titulo",
      description: "Descripcion",
      week: "Semana",
    };
    return labels[field] || field;
  };

  const getFieldType = (field: string) => {
    if (field === "week") return "number";
    if (field === "description") return "textarea";
    return "text";
  };

  // Notification Portal Component
  const NotificationPortal = () => {
    return createPortal(
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
        style={{ zIndex: 9999 }}
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          <Transition show={notification.show}>
            <div
              className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5 transition data-[closed]:data-[enter]:translate-y-2 data-[enter]:transform data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-100 data-[enter]:ease-out data-[leave]:ease-in data-[closed]:data-[enter]:sm:translate-x-2 data-[closed]:data-[enter]:sm:translate-y-0`}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="shrink-0">
                    {notification.type === "success" ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-400" />
                    ) : (
                      <XCircleIcon className="h-6 w-6 text-red-400" />
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.type === "success" ? "Exito" : "Error"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {notification.message}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setNotification((prev) => ({ ...prev, show: false }))
                      }
                      className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>,
      document.body
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !resource) {
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
            <h1 className="text-xl font-bold text-gray-900">Detalle de Recurso</h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <p className="text-gray-600 text-lg">{error || "Recurso no encontrado"}</p>
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
      <NotificationPortal />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <FolderIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Detalle de Recurso</h1>
              {enrollment && (
                <p className="text-sm text-gray-500">
                  {enrollment.course_code} - {enrollment.student_name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Resource Information */}
        <div className="px-4 sm:px-0">
          <h3 className="text-base/7 font-semibold text-gray-900">Informacion del Recurso</h3>
          <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
            Detalles y configuracion del recurso.
          </p>
        </div>
        <div className="mt-6 border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            {/* Title */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">Titulo</dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow">{resource.title}</span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog("title", resource.title)}
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
                <span className="grow">{resource.week ?? "No especificada"}</span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog("week", resource.week)}
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>

            {/* Description */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">Descripcion</dt>
              <dd className="mt-1 flex text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="grow whitespace-pre-wrap">
                  {resource.description || "Sin descripcion"}
                </span>
                <span className="ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog("description", resource.description)}
                    className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                  >
                    Actualizar
                  </button>
                </span>
              </dd>
            </div>

            {/* Attachments */}
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm/6 font-medium text-gray-900">Archivo Adjunto</dt>
              <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                {resource.resource_file_url ? (
                  <ul role="list" className="divide-y divide-gray-100 rounded-md border border-gray-200">
                    <li className="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">
                      <div className="flex w-0 flex-1 items-center">
                        <PaperClipIcon className="size-5 shrink-0 text-gray-400" />
                        <div className="ml-4 flex min-w-0 flex-1 gap-2">
                          <span className="truncate font-medium text-gray-900">
                            Archivo de recurso
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex shrink-0 space-x-4">
                        <a
                          href={resource.resource_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-white font-medium text-primary hover:text-primary/80"
                        >
                          Descargar
                        </a>
                        <span className="text-gray-200">|</span>
                        <button
                          type="button"
                          onClick={handleDeleteFile}
                          disabled={deletingFile}
                          className="rounded-md bg-white font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                        >
                          {deletingFile ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </li>
                  </ul>
                ) : (
                  <div className="space-y-4">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.mov"
                      onChange={handleFileSelect}
                    />

                    {/* File upload area */}
                    {!selectedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 cursor-pointer hover:border-gray-400 transition-colors"
                      >
                        <div className="text-center">
                          <FolderIcon className="mx-auto size-12 text-gray-300" />
                          <div className="mt-4 flex text-sm/6 text-gray-600">
                            <span className="relative cursor-pointer rounded-md bg-white font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary/80">
                              Seleccionar archivo
                            </span>
                          </div>
                          <p className="text-xs/5 text-gray-600 mt-1">
                            PDF, DOC, XLS, PPT, imagenes, audio, video
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <PaperClipIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCancelSelectedFile}
                              disabled={uploadingFile}
                              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 ring-1 ring-inset ring-gray-300"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleUploadFile}
                              disabled={uploadingFile}
                              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                            >
                              {uploadingFile ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <ArrowUpTrayIcon className="h-4 w-4" />
                                  Subir archivo
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Created At */}
        {resource.created_at && (
          <div className="mt-6 text-sm text-gray-500">
            Creado el{" "}
            {new Date(resource.created_at).toLocaleDateString("es", {
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
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
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
                <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
                  Actualizar {getFieldLabel(editField || "")}
                </DialogTitle>
                <div className="mt-4">
                  {getFieldType(editField || "") === "textarea" ? (
                    <textarea
                      rows={4}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                      placeholder={`Ingrese ${getFieldLabel(editField || "").toLowerCase()}`}
                    />
                  ) : (
                    <input
                      type={getFieldType(editField || "")}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                      placeholder={`Ingrese ${getFieldLabel(editField || "").toLowerCase()}`}
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
    </div>
  );
}
