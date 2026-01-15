import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
} from "@headlessui/react";
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import * as Yup from "yup";

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

interface InstrumentCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInstrumentCreated?: (newInstrument: Instrument) => void;
  instrumentTypes: InstrumentType[];
  defaultInstrumentTypeId?: number | null;
}

interface InstrumentResponse {
  instrument: Instrument;
}

const validationSchema = Yup.object({
  instrument_type_id: Yup.number()
    .required("El tipo de instrumento es obligatorio")
    .positive("Debe seleccionar un tipo de instrumento"),
  serial_number: Yup.string().nullable(),
  condition: Yup.string().nullable(),
  status: Yup.string().nullable(),
  location: Yup.string().nullable(),
});

const InstrumentCreateDrawer: React.FC<InstrumentCreateDrawerProps> = ({
  isOpen,
  onClose,
  onInstrumentCreated,
  instrumentTypes,
  defaultInstrumentTypeId,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [instrumentTypeId, setInstrumentTypeId] = useState<number | null>(
    null
  );
  const [serialNumber, setSerialNumber] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("libre");
  const [location, setLocation] = useState("");

  // Set default instrument type when drawer opens or defaultInstrumentTypeId changes
  useEffect(() => {
    if (isOpen && defaultInstrumentTypeId) {
      setInstrumentTypeId(defaultInstrumentTypeId);
    } else if (!isOpen) {
      // Reset form when drawer closes
      setInstrumentTypeId(null);
      setSerialNumber("");
      setCondition("");
      setStatus("libre");
      setLocation("");
      setErrors({});
    }
  }, [isOpen, defaultInstrumentTypeId]);

  // Validate form
  const validateForm = async () => {
    try {
      await validationSchema.validate(
        {
          instrument_type_id: instrumentTypeId,
          serial_number: serialNumber || null,
          condition: condition || null,
          status: status || null,
          location: location || null,
        },
        { abortEarly: false }
      );
      setErrors({});
      return true;
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        validationError.inner.forEach((error) => {
          if (error.path) {
            newErrors[error.path] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Handle input changes
  const handleInstrumentTypeChange = (value: string) => {
    const id = value ? parseInt(value) : null;
    setInstrumentTypeId(id);
    if (errors.instrument_type_id) {
      setErrors({ ...errors, instrument_type_id: "" });
    }
  };

  const handleSerialNumberChange = (value: string) => {
    setSerialNumber(value);
    if (errors.serial_number) {
      setErrors({ ...errors, serial_number: "" });
    }
  };

  const handleConditionChange = (value: string) => {
    setCondition(value);
    if (errors.condition) {
      setErrors({ ...errors, condition: "" });
    }
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    if (errors.status) {
      setErrors({ ...errors, status: "" });
    }
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    if (errors.location) {
      setErrors({ ...errors, location: "" });
    }
  };

  // Handle create click
  const handleCreateClick = async () => {
    const isValid = await validateForm();
    if (isValid) {
      setShowConfirmDialog(true);
    }
  };

  // Handle actual creation
  const handleCreate = async () => {
    if (!instrumentTypeId) return;

    setIsCreating(true);
    try {
      const createData = {
        instrument_type_id: instrumentTypeId,
        serial_number: serialNumber.trim() || null,
        condition: condition.trim() || null,
        status: status || "libre",
        location: location.trim() || null,
      };

      const response = await axiosPrivate.post<InstrumentResponse>(
        "instruments/manage-instruments",
        createData
      );

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);

      // Notify parent component
      if (onInstrumentCreated && response.data?.instrument) {
        onInstrumentCreated(response.data.instrument);
      }

      // Reset form
      setInstrumentTypeId(null);
      setSerialNumber("");
      setCondition("");
      setStatus("libre");
      setLocation("");
      setErrors({});

      // Close drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Error creating instrument:", err);
      setShowConfirmDialog(false);

      // Set error message for notification
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Error al crear el instrumento. Por favor, intenta de nuevo.";

      setErrorNotificationMessage(errorMessage);
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  // Check if required fields are filled and valid
  const isSubmitDisabled = !instrumentTypeId || isCreating;

  const selectedInstrumentType = instrumentTypes.find(
    (type) => type.id === instrumentTypeId
  );

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
                            Registrar Unidad
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Completa la información para registrar un nuevo
                            instrumento en el inventario.
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

                    {/* Error message */}
                    {errors.submit && (
                      <div className="mx-4 mt-4 sm:mx-6">
                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                          <p className="text-sm text-red-800">
                            {errors.submit}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Form fields */}
                    <div className="space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0">
                      {/* Instrument Type */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="instrument_type"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Tipo de instrumento{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mt-2 grid grid-cols-1">
                            <select
                              id="instrument_type"
                              name="instrument_type"
                              value={instrumentTypeId || ""}
                              onChange={(e) =>
                                handleInstrumentTypeChange(e.target.value)
                              }
                              className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.instrument_type_id
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                            >
                              <option value="">Seleccione un tipo</option>
                              {instrumentTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                            <svg
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              data-slot="icon"
                              aria-hidden="true"
                              className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                            >
                              <path
                                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                                clipRule="evenodd"
                                fillRule="evenodd"
                              />
                            </svg>
                          </div>
                          {errors.instrument_type_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.instrument_type_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Serial Number */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="serial_number"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Número de serie
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="serial_number"
                            name="serial_number"
                            type="text"
                            value={serialNumber}
                            onChange={(e) =>
                              handleSerialNumberChange(e.target.value)
                            }
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.serial_number
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                            placeholder="Ej: SN123456"
                          />
                          {errors.serial_number && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.serial_number}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Condition */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="condition"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Condición
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="condition"
                            name="condition"
                            type="text"
                            value={condition}
                            onChange={(e) =>
                              handleConditionChange(e.target.value)
                            }
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.condition
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                            placeholder="Ej: Excelente, Bueno, Regular"
                          />
                          {errors.condition && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.condition}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="status"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Estado
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mt-2 grid grid-cols-1">
                            <select
                              id="status"
                              name="status"
                              value={status}
                              onChange={(e) => handleStatusChange(e.target.value)}
                              className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.status
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                            >
                              <option value="libre">Libre</option>
                              <option value="alquilado">Alquilado</option>
                            </select>
                            <svg
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              data-slot="icon"
                              aria-hidden="true"
                              className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                            >
                              <path
                                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                                clipRule="evenodd"
                                fillRule="evenodd"
                              />
                            </svg>
                          </div>
                          {errors.status && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.status}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="location"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Ubicación
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="location"
                            name="location"
                            type="text"
                            value={location}
                            onChange={(e) =>
                              handleLocationChange(e.target.value)
                            }
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.location
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                            placeholder="Ej: Sala A, Almacén B"
                          />
                          {errors.location && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.location}
                            </p>
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
                        onClick={handleCreateClick}
                        disabled={isSubmitDisabled}
                        className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreating ? "Creando..." : "Crear"}
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
        onClose={handleCancel}
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
                    Confirmar creación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas registrar el instrumento{" "}
                      {selectedInstrumentType
                        ? `"${selectedInstrumentType.name}"`
                        : ""}
                      ?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isCreating ? "Creando..." : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCreating}
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
                          ¡Instrumento registrado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          El instrumento se ha agregado al inventario
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
                          Error al crear
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

export default InstrumentCreateDrawer;

