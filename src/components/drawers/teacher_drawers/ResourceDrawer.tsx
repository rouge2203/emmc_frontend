import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
} from "@headlessui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  FolderIcon,
  PlusIcon,
  TrashIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";

interface Resource {
  id: number;
  week: number | null;
  title: string;
  description: string | null;
  resource_file_url: string | null;
  created_at: string | null;
}

interface ResourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceSaved?: () => void;
  enrollmentId: string | number;
  week: number | null;
  editingResource?: Resource | null;
  courseName?: string;
  studentName?: string;
}

const ResourceDrawer: React.FC<ResourceDrawerProps> = ({
  isOpen,
  onClose,
  onResourceSaved,
  enrollmentId,
  week,
  editingResource,
  courseName,
  studentName,
}) => {
  const axiosPrivate = useAxiosPrivate();
  // Week 0 is the "Programa del curso", not a numbered week. Compared with ===
  // because 0 is falsy: `week ? ... : ...` would label the programme as a week
  // and every real week correctly, i.e. it would get exactly this case wrong.
  const weekLabel =
    week === 0 ? "Programa del curso" : week === null ? "Sin semana" : `Semana ${week}`;
  const weekPhrase =
    week === 0
      ? "el programa del curso"
      : week === null
        ? "sin semana asignada"
        : `la semana ${week}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [successNotificationMessage, setSuccessNotificationMessage] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Initialize form when drawer opens or editingResource changes
  useEffect(() => {
    if (isOpen) {
      if (editingResource) {
        setFormTitle(editingResource.title);
        setFormDescription(editingResource.description || "");
        setExistingFileUrl(editingResource.resource_file_url);
      } else {
        setFormTitle("");
        setFormDescription("");
        setExistingFileUrl(null);
      }
      setSelectedFile(null);
    }
  }, [isOpen, editingResource]);

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setFormTitle("");
      setFormDescription("");
      setShowConfirmDialog(false);
      setErrorNotificationMessage("");
      setSelectedFile(null);
      setExistingFileUrl(null);
    }
  }, [isOpen]);

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

  const handleSaveClick = () => {
    if (!formTitle.trim()) return;
    setShowConfirmDialog(true);
  };

  const handleSaveCancel = () => {
    setShowConfirmDialog(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;

    setShowConfirmDialog(false);
    setIsSaving(true);

    try {
      let savedResourceId = editingResource?.id;

      if (editingResource) {
        await axiosPrivate.put("courses/teacher-resources", {
          resource_id: editingResource.id,
          week: week,
          title: formTitle,
          description: formDescription,
        });
      } else {
        const response = await axiosPrivate.post("courses/teacher-resources", {
          enrollment_id: enrollmentId,
          week: week,
          title: formTitle,
          description: formDescription,
        });
        savedResourceId = response.data.resource.id;
      }

      // Upload file if selected
      if (selectedFile && savedResourceId) {
        setIsUploadingFile(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("resource_id", savedResourceId.toString());

        await axiosPrivate.post("courses/teacher-resource-file", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setIsUploadingFile(false);
      }

      // Show success notification
      setSuccessNotificationMessage(
        editingResource
          ? "Recurso actualizado exitosamente"
          : "Recurso creado exitosamente"
      );
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);

      // Notify parent to refresh
      if (onResourceSaved) {
        onResourceSaved();
      }

      // Close drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Error saving resource:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al guardar el recurso"
      );
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsSaving(false);
      setIsUploadingFile(false);
    }
  };

  const handleDeleteExistingFile = async () => {
    if (!editingResource?.id) return;

    try {
      await axiosPrivate.delete("courses/teacher-resource-file", {
        data: { resource_id: editingResource.id },
      });
      setExistingFileUrl(null);
      setSuccessNotificationMessage("Archivo eliminado exitosamente");
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
      if (onResourceSaved) {
        onResourceSaved();
      }
    } catch (err: any) {
      console.error("Error deleting file:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al eliminar el archivo"
      );
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    }
  };

  const isSubmitDisabled = !formTitle.trim() || isSaving || isUploadingFile;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            {editingResource ? "Editar Recurso" : "Nuevo Recurso"}
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            {editingResource
                              ? "Modifica la información del recurso."
                              : "Completa la información para crear un nuevo recurso."}
                          </p>
                        </div>
                        <div className="flex h-7 items-center">
                          <button
                            type="button"
                            onClick={onClose}
                            className="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Info banner */}
                    <div className="px-4 sm:px-6 pt-6">
                      <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
                        <div className="flex">
                          <div className="shrink-0">
                            <FolderIcon
                              className="size-5 text-amber-600"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-amber-800">
                              {weekLabel}
                            </p>
                            {courseName && (
                              <p className="mt-1 text-xs text-amber-700">
                                Curso: {courseName}
                              </p>
                            )}
                            {studentName && (
                              <p className="mt-1 text-xs text-amber-700">
                                Estudiante: {studentName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0">
                      {/* Title */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="title"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Título <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="title"
                            name="title"
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                            placeholder="Ej: Material de lectura"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="description"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Descripción
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <textarea
                            id="description"
                            name="description"
                            rows={4}
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                            placeholder="Descripción del recurso..."
                          />
                        </div>
                      </div>

                      {/* File Upload */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5">
                            Archivo
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          {/* Existing file */}
                          {existingFileUrl && !selectedFile && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <PaperClipIcon className="size-5 text-gray-400" />
                                  <span className="text-sm text-gray-700">
                                    Archivo actual
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={existingFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-primary hover:text-primary/80"
                                  >
                                    Ver
                                  </a>
                                  <button
                                    type="button"
                                    onClick={handleDeleteExistingFile}
                                    className="text-sm font-medium text-red-600 hover:text-red-500"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

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
                                <button
                                  type="button"
                                  onClick={handleRemoveSelectedFile}
                                  className="text-sm font-medium text-red-600 hover:text-red-500"
                                >
                                  <TrashIcon className="size-5" />
                                </button>
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
                                {existingFileUrl
                                  ? "Reemplazar archivo"
                                  : "Sin archivo"}
                              </h3>
                              <p className="mt-1 text-sm text-gray-500">
                                {existingFileUrl
                                  ? "Selecciona un nuevo archivo para reemplazar el actual"
                                  : "Sube un archivo PDF, documento o imagen"}
                              </p>
                              <div className="mt-6">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  className="hidden"
                                  onChange={handleFileSelect}
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.mov"
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
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={isSubmitDisabled}
                        className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving || isUploadingFile ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleSaveCancel}
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
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-50 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 text-amber-800"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    {editingResource ? "Confirmar edición" : "Confirmar creación"}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {editingResource
                        ? `¿Estás seguro de que deseas guardar los cambios en el recurso "${formTitle}"?`
                        : `¿Estás seguro de que deseas crear el recurso "${formTitle}" para ${weekPhrase}?`}
                    </p>
                    {selectedFile && (
                      <p className="mt-2 text-sm text-gray-500">
                        Se subirá el archivo: <span className="font-medium">{selectedFile.name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isSaving ? "Guardando..." : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCancel}
                  disabled={isSaving}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Success Notification - Rendered via Portal outside Dialog */}
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
          document.body
        )}

      {/* Error Notification - Rendered via Portal outside Dialog */}
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
                          {errorNotificationMessage}
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
          document.body
        )}
    </>
  );
};

export default ResourceDrawer;
