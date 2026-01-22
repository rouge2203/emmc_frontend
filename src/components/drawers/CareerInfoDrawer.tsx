import React, { useEffect, useState } from "react";
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
  InformationCircleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { IoMdBook } from "react-icons/io";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface Career {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  created_by: { id: number; first_name: string; last_name: string } | null;
  created_at: string | null;
  updated_by: { id: number; first_name: string; last_name: string } | null;
  updated_at: string | null;
  courses_count: number;
}

interface CareerInfoDrawerProps {
  careerId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onCareerUpdated?: (updatedCareer: Career) => void;
}

interface CareerResponse {
  career: Career;
}

interface CareersResponse {
  careers: Career[];
}

const CareerInfoDrawer: React.FC<CareerInfoDrawerProps> = ({
  careerId,
  isOpen,
  onClose,
  onCareerUpdated,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [career, setCareer] = useState<Career | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (isOpen && careerId) {
      fetchCareerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, careerId]);

  const fetchCareerData = async () => {
    if (!careerId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<CareersResponse>(
        "courses/manage-careers"
      );
      const foundCareer = response.data.careers.find((c) => c.id === careerId);
      if (foundCareer) {
        setCareer(foundCareer);
        setName(foundCareer.name || "");
        setDescription(foundCareer.description || "");
        setImageUrl(foundCareer.image_url || "");
      } else {
        setError("Carrera no encontrada");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar la información de la cárrera"
      );
      console.error("Error fetching career data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!careerId) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: any = {
        career_id: careerId,
      };

      // Only include fields that have changed
      if (name !== (career?.name || "")) {
        updateData.name = name;
      }
      if (description !== (career?.description || "")) {
        updateData.description = description || null;
      }
      if (imageUrl !== (career?.image_url || "")) {
        updateData.image_url = imageUrl || null;
      }

      const response = await axiosPrivate.put<CareerResponse>(
        "courses/manage-careers",
        updateData
      );

      // Update local state with response
      const updatedCareer = response.data.career;
      if (updatedCareer) {
        setCareer(updatedCareer);
        setName(updatedCareer.name || "");
        setDescription(updatedCareer.description || "");
        setImageUrl(updatedCareer.image_url || "");

        // Notify parent component to update the list
        if (onCareerUpdated) {
          onCareerUpdated(updatedCareer);
        }
      }

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error || "Error al guardar los cambios";
      setErrorNotificationMessage(errorMessage);
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
      console.error("Error saving career data:", err);
      setShowConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-gray-900 px-4 py-20 sm:px-6">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-white">
                          Información de la Carrera
                        </DialogTitle>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            onClick={onClose}
                            className="relative rounded-md text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-300">
                          Edita la información de la carrera.
                        </p>
                      </div>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="mt-4 text-sm text-gray-600">
                            Cargando información...
                          </p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      </div>
                    ) : career ? (
                      <div className="divide-y divide-gray-200 px-4 sm:px-6 py-6">
                        <div className="space-y-3.5">
                          {/* Name */}
                          <div>
                            <label
                              htmlFor="name"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Nombre
                            </label>
                            <div className="mt-2">
                              <input
                                id="name"
                                name="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <label
                              htmlFor="description"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Descripción
                            </label>
                            <div className="mt-2">
                              <textarea
                                id="description"
                                name="description"
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Image URL */}
                          <div>
                            <label
                              htmlFor="image_url"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              URL de Imagen
                            </label>
                            <div className="mt-2">
                              <input
                                id="image_url"
                                name="image_url"
                                type="text"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://ejemplo.com/imagen.jpg"
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Account Information */}
                          <div className="space-y-4 pt-4 border-t border-gray-200">
                            <h3 className="text-sm/6 font-medium text-gray-900">
                              Información adicional
                            </h3>

                            {/* Courses Count */}
                            <div className="flex items-start">
                              <div className="shrink-0">
                                <IoMdBook
                                  className="size-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Cantidad de cursos
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {career.courses_count || 0}
                                </p>
                              </div>
                            </div>
                            {/* Created At */}
                            <div className="flex items-start">
                              <div className="shrink-0">
                                <CalendarDaysIcon
                                  className="size-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Fecha de creación
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {career.created_at
                                    ? new Date(
                                        career.created_at
                                      ).toLocaleString("es-CR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Created By */}
                            <div className="flex items-start">
                              <div className="shrink-0">
                                <ClockIcon
                                  className="size-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Creado por
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {career.created_by
                                    ? `${career.created_by.first_name} ${career.created_by.last_name}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Updated By */}
                            <div className="flex items-start">
                              <div className="shrink-0">
                                <ClockIcon
                                  className="size-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Última actualización por
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {career.updated_by
                                    ? `${career.updated_by.first_name} ${career.updated_by.last_name}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Updated At */}
                            <div className="flex items-start">
                              <div className="shrink-0">
                                <ClockIcon
                                  className="size-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Fecha de última actualización
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {career.updated_at
                                    ? new Date(
                                        career.updated_at
                                      ).toLocaleString("es-CR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveClick}
                      disabled={isSaving}
                      className="ml-4 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Cargando..." : "Guardar"}
                    </button>
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
        onClose={handleConfirmCancel}
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
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 text-gray-900"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar cambios
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas guardar los cambios en la
                      carrera? Esta acción actualizará los datos.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isSaving ? "Cargando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isSaving}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:ml-3 sm:w-auto"
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
                          className="size-6 text-primary"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          ¡Guardado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los cambios en la carrera se han actualizado
                          correctamente.
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
    </>
  );
};

export default CareerInfoDrawer;
