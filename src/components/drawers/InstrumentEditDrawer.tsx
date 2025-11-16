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
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface InstrumentType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface Instrument {
  id: number;
  instrument_type: InstrumentType;
  serial_number: string | null;
  condition: string | null;
  status: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  updated_by: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
}

interface InstrumentEditDrawerProps {
  instrumentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onInstrumentUpdated?: (updatedInstrument: Instrument) => void;
  onInstrumentDeleted?: () => void;
}

interface InstrumentResponse {
  instrument: Instrument;
}

interface InstrumentsResponse {
  results: Instrument[];
  pagination: any;
}

const InstrumentEditDrawer: React.FC<InstrumentEditDrawerProps> = ({
  instrumentId,
  isOpen,
  onClose,
  onInstrumentUpdated,
  onInstrumentDeleted,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [serialNumber, setSerialNumber] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (isOpen && instrumentId) {
      fetchInstrumentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, instrumentId]);

  const fetchInstrumentData = async () => {
    if (!instrumentId) return;

    try {
      setIsLoading(true);
      setError(null);
      // Fetch the specific instrument by making a GET request
      // Since we need to find by ID, we'll fetch all and filter, or we could add a specific endpoint
      // For now, using a large page_size to get the instrument
      const response = await axiosPrivate.get<InstrumentsResponse>(
        "instruments/manage-instruments",
        {
          params: {
            page: 1,
            page_size: 1000, // Get enough to find our instrument
          },
        }
      );
      const foundInstrument = response.data.results.find(
        (inst) => inst.id === instrumentId
      );
      if (foundInstrument) {
        setInstrument(foundInstrument);
        setSerialNumber(foundInstrument.serial_number || "");
        setCondition(foundInstrument.condition || "");
        setLocation(foundInstrument.location || "");
      } else {
        setError("Instrumento no encontrado");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar la información del instrumento"
      );
      console.error("Error fetching instrument data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!instrumentId) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: any = {
        instrument_id: instrumentId,
      };

      // Only include fields that have changed
      if (serialNumber !== (instrument?.serial_number || "")) {
        updateData.serial_number = serialNumber || null;
      }
      if (condition !== (instrument?.condition || "")) {
        updateData.condition = condition || null;
      }
      if (location !== (instrument?.location || "")) {
        updateData.location = location || null;
      }

      const response = await axiosPrivate.put<InstrumentResponse>(
        "instruments/manage-instruments",
        updateData
      );

      // Update local state with response
      const updatedInstrument = response.data.instrument;
      if (updatedInstrument) {
        setInstrument(updatedInstrument);
        setSerialNumber(updatedInstrument.serial_number || "");
        setCondition(updatedInstrument.condition || "");
        setLocation(updatedInstrument.location || "");

        // Notify parent component to update the list
        if (onInstrumentUpdated) {
          onInstrumentUpdated(updatedInstrument);
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
      setError(err?.response?.data?.error || "Error al guardar los cambios");
      console.error("Error saving instrument data:", err);
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

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!instrumentId) return;

    setIsDeleting(true);
    try {
      await axiosPrivate.delete("instruments/manage-instruments", {
        data: { instrument_id: instrumentId },
      });
      setShowDeleteDialog(false);
      onClose();
      if (onInstrumentDeleted) {
        onInstrumentDeleted();
      }
    } catch (err: any) {
      console.error("Error deleting instrument:", err);
      setError(
        err?.response?.data?.error || "Error al eliminar el instrumento"
      );
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const isInstrumentRented = instrument?.status === "alquilado";

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
                          Información del Instrumento
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
                          Edita la información del instrumento.
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
                    ) : instrument ? (
                      <div className="divide-y divide-gray-200 px-4 sm:px-6 py-6">
                        <div className="space-y-3.5">
                          {/* Instrument Type (Read-only) */}
                          <div>
                            <label
                              htmlFor="instrument_type"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Tipo de instrumento
                            </label>
                            <div className="mt-2">
                              <input
                                id="instrument_type"
                                name="instrument_type"
                                type="text"
                                value={instrument.instrument_type.name}
                                disabled
                                className="block w-full rounded-md bg-gray-100 px-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* Serial Number (Editable) */}
                          <div>
                            <label
                              htmlFor="serial_number"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Número de serie
                            </label>
                            <div className="mt-2">
                              <input
                                id="serial_number"
                                name="serial_number"
                                type="text"
                                value={serialNumber}
                                onChange={(e) =>
                                  setSerialNumber(e.target.value)
                                }
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Condition (Editable) */}
                          <div>
                            <label
                              htmlFor="condition"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Condición
                            </label>
                            <div className="mt-2">
                              <input
                                id="condition"
                                name="condition"
                                type="text"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Status (Read-only) */}
                          <div>
                            <label
                              htmlFor="status"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Estado
                            </label>
                            <div className="mt-2">
                              <input
                                id="status"
                                name="status"
                                type="text"
                                value={
                                  instrument.status === "alquilado"
                                    ? "Alquilado"
                                    : "Libre"
                                }
                                disabled
                                className="block w-full rounded-md bg-gray-100 px-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* Location (Editable) */}
                          <div>
                            <label
                              htmlFor="location"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Ubicación
                            </label>
                            <div className="mt-2">
                              <input
                                id="location"
                                name="location"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Account Information */}
                          <div className="space-y-4 pt-4 border-t border-gray-200">
                            <h3 className="text-sm/6 font-medium text-gray-900">
                              Información adicional
                            </h3>

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
                                  {instrument.created_at
                                    ? new Date(
                                        instrument.created_at
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
                                  Última actualización
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {instrument.updated_at
                                    ? new Date(
                                        instrument.updated_at
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
                            {instrument.created_by && (
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
                                    {`${instrument.created_by.first_name} ${instrument.created_by.last_name}`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Updated By */}
                            {instrument.updated_by && (
                              <div className="flex items-start">
                                <div className="shrink-0">
                                  <ClockIcon
                                    className="size-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Actualizado por
                                  </p>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {`${instrument.updated_by.first_name} ${instrument.updated_by.last_name}`}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 justify-between border-t border-gray-200 bg-white px-4 py-4">
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      disabled={isSaving || isDeleting}
                      className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-xs ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Eliminar
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        disabled={isSaving || isDeleting}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={isSaving || isDeleting}
                        className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? "Cargando..." : "Guardar"}
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
                      ¿Estás seguro de que deseas guardar los cambios en el
                      instrumento? Esta acción actualizará los datos.
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
                          Los cambios en el instrumento se han actualizado
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={handleDeleteCancel}
        className="relative z-[100]"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />
        <div className="fixed inset-0 z-[100] w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-6 text-red-900"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    {isInstrumentRented
                      ? "No se puede eliminar"
                      : "Confirmar eliminación"}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {isInstrumentRented
                        ? `El instrumento "${instrument?.instrument_type.name}" está actualmente alquilado. Debes cancelar el alquiler antes de poder eliminarlo.`
                        : `¿Estás seguro de que deseas eliminar el instrumento "${instrument?.instrument_type.name}"? Esta acción es irreversible y no se puede deshacer.`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                {!isInstrumentRented && (
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="inline-flex w-full justify-center rounded-md bg-red-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-900/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  {isInstrumentRented ? "Entendido" : "Cancelar"}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default InstrumentEditDrawer;
