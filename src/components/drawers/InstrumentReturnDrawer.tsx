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
  CheckCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

interface InstrumentReturnDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: number | null;
  onReturnRegistered?: () => void;
}

interface InstrumentLoanResponse {
  instrument_loan: {
    id: number;
    instrument: {
      id: number;
      instrument_type: {
        name: string;
      };
      serial_number: string | null;
    };
    loan_user: {
      first_name: string;
      last_name: string;
    };
  };
  message?: string;
}

interface Instrument {
  id: number;
  location: string | null;
}

const InstrumentReturnDrawer: React.FC<InstrumentReturnDrawerProps> = ({
  isOpen,
  onClose,
  loanId,
  onReturnRegistered,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [returnDate, setReturnDate] = useState("");
  const [location, setLocation] = useState("");
  const [previousLocation, setPreviousLocation] = useState<string | null>(null);
  const [isLoadingInstrument, setIsLoadingInstrument] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Fetch instrument details when drawer opens
  useEffect(() => {
    const fetchInstrumentDetails = async () => {
      if (isOpen && loanId) {
        setIsLoadingInstrument(true);
        try {
          // First, get the loan to get the instrument ID
          const loanResponse = await axiosPrivate.get<InstrumentLoanResponse>(
            "instruments/manage-instruments-loans",
            {
              params: {
                instrument_loan_id: loanId,
              },
            }
          );
          const instrumentId = loanResponse.data.instrument_loan.instrument.id;

          // Then fetch the instrument details to get the location
          const instrumentsResponse = await axiosPrivate.get<{
            results: Instrument[];
          }>("instruments/manage-instruments", {
            params: {
              page: 1,
              page_size: 1000,
            },
          });
          const foundInstrument = instrumentsResponse.data.results.find(
            (inst) => inst.id === instrumentId
          );
          if (foundInstrument) {
            const currentLocation = foundInstrument.location || "";
            setPreviousLocation(currentLocation);
            setLocation(currentLocation);
          }
        } catch (err) {
          console.error("Error fetching instrument details:", err);
          // Don't show error, just proceed without location
        } finally {
          setIsLoadingInstrument(false);
        }
      }
    };

    if (isOpen) {
      setReturnDate(getTodayDate());
      setErrors({});
      fetchInstrumentDetails();
    } else {
      // Reset form when drawer closes
      setReturnDate("");
      setLocation("");
      setPreviousLocation(null);
      setErrors({});
      setShowConfirmDialog(false);
    }
  }, [isOpen, loanId, axiosPrivate]);

  const handleSubmit = () => {
    if (!returnDate) {
      setErrors({ return_date: "La fecha de retorno es obligatoria" });
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!loanId) {
      setErrors({ submit: "ID de préstamo no válido" });
      setShowConfirmDialog(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosPrivate.post<InstrumentLoanResponse>(
        "instruments/register-return",
        {
          instrument_loan_id: loanId,
          actual_return_date: returnDate,
          location: location || null,
        }
      );

      setShowConfirmDialog(false);
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);

      // Notify parent component
      if (onReturnRegistered) {
        onReturnRegistered();
      }

      // Close drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Error registering return:", err);
      setShowConfirmDialog(false);

      // Set error message for display
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Error al registrar el retorno. Por favor, intenta de nuevo.";
      setErrors({ submit: errorMessage });

      // Clear error after 5 seconds
      setTimeout(() => {
        setErrors({});
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  // Check if form is valid
  const isSubmitDisabled = !returnDate || isSubmitting;

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
                            Registrar Retorno
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Registra el retorno del instrumento prestado.
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
                      {/* Return Date */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="return_date"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Fecha de retorno{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="date"
                            id="return_date"
                            name="return_date"
                            value={returnDate}
                            onChange={(e) => {
                              setReturnDate(e.target.value);
                              if (errors.return_date) {
                                setErrors({});
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.return_date
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.return_date && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.return_date}
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
                          {previousLocation && (
                            <p className="mt-1 text-xs text-gray-500">
                              Ubicación anterior:{" "}
                              {previousLocation || "No especificada"}
                            </p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            id="location"
                            name="location"
                            value={location}
                            onChange={(e) => {
                              setLocation(e.target.value);
                              if (errors.location) {
                                setErrors({});
                              }
                            }}
                            disabled={isLoadingInstrument}
                            placeholder={
                              isLoadingInstrument
                                ? "Cargando..."
                                : "Ingrese la nueva ubicación del instrumento"
                            }
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.location
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            } ${
                              isLoadingInstrument
                                ? "bg-gray-50 cursor-not-allowed"
                                : ""
                            }`}
                          />
                          {errors.location && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.location}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Email notification note */}
                      <div className="mx-4 mt-4 sm:mx-6">
                        <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                          <p className="text-sm text-gray-800">
                            <InformationCircleIcon
                              className="size-5 inline-block mr-1 text-primary"
                              aria-hidden="true"
                            />
                            Al registrar el retorno, se enviará un correo
                            electrónico al usuario notificando que el retorno ha
                            sido registrado exitosamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitDisabled}
                      className="ml-4 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Registrar retorno
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      {typeof document !== "undefined" &&
        createPortal(
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
                      <CalendarDaysIcon
                        aria-hidden="true"
                        className="size-6 text-gray-600"
                      />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <DialogTitle className="text-base font-semibold text-gray-900">
                        Confirmar registro de retorno
                      </DialogTitle>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          ¿Estás seguro de que deseas registrar el retorno del
                          instrumento con fecha{" "}
                          {returnDate
                            ? new Date(returnDate).toLocaleDateString("es-CR")
                            : ""}
                          ? Esta acción cambiará el estado del préstamo a
                          "devuelto" y liberará el instrumento.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={handleConfirmSubmit}
                      disabled={isSubmitting}
                      className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                    >
                      {isSubmitting ? "Registrando..." : "Confirmar"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                    >
                      Cancelar
                    </button>
                  </div>
                </DialogPanel>
              </div>
            </div>
          </Dialog>,
          document.body
        )}

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
                          className="size-6 text-green-600"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Retorno registrado exitosamente
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          El instrumento ha sido marcado como devuelto y está
                          disponible nuevamente.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowSuccessNotification(false)}
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

export default InstrumentReturnDrawer;
