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
}

interface LoanUser {
  id: number;
  first_name: string;
  last_name: string;
}

interface InstrumentLoan {
  id: number;
  instrument: Instrument;
  loan_user: LoanUser;
  loan_date: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string | null;
  price: number | null;
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

interface InstrumentLoanEditDrawerProps {
  loanId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onLoanUpdated?: (updatedLoan: InstrumentLoan) => void;
  onLoanDeleted?: () => void;
}

interface InstrumentLoanResponse {
  instrument_loan: InstrumentLoan;
}

const InstrumentLoanEditDrawer: React.FC<InstrumentLoanEditDrawerProps> = ({
  loanId,
  isOpen,
  onClose,
  onLoanUpdated,
  onLoanDeleted,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [loan, setLoan] = useState<InstrumentLoan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [actualReturnDate, setActualReturnDate] = useState("");
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && loanId) {
      fetchLoanData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loanId]);

  const fetchLoanData = async () => {
    if (!loanId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<InstrumentLoanResponse>(
        "instruments/manage-instruments-loans",
        {
          params: {
            instrument_loan_id: loanId,
          },
        },
      );
      const loanData = response.data.instrument_loan;
      if (loanData) {
        setLoan(loanData);
        setExpectedReturnDate(loanData.expected_return_date || "");
        setActualReturnDate(loanData.actual_return_date || "");
        setPrice(loanData.price);
      } else {
        setError("Alquiler no encontrado");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar la información del alquiler",
      );
      console.error("Error fetching loan data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!loanId) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: any = {
        instrument_loan_id: loanId,
      };

      // Only include fields that have changed
      if (expectedReturnDate !== (loan?.expected_return_date || "")) {
        updateData.expected_return_date = expectedReturnDate || null;
      }
      if (actualReturnDate !== (loan?.actual_return_date || "")) {
        updateData.actual_return_date = actualReturnDate || null;
        // If actual_return_date is set, update status to "devuelto"
        if (actualReturnDate && loan?.status === "prestado") {
          updateData.status = "devuelto";
        }
      }
      if (price !== loan?.price) {
        updateData.price = price;
      }

      const response = await axiosPrivate.put<InstrumentLoanResponse>(
        "instruments/manage-instruments-loans",
        updateData,
      );

      // Update local state with response
      const updatedLoan = response.data.instrument_loan;
      if (updatedLoan) {
        setLoan(updatedLoan);
        setExpectedReturnDate(updatedLoan.expected_return_date || "");
        setActualReturnDate(updatedLoan.actual_return_date || "");
        setPrice(updatedLoan.price);

        // Notify parent component to update the list
        if (onLoanUpdated) {
          onLoanUpdated(updatedLoan);
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
      setError(errorMessage);
      console.error("Error saving loan data:", err);
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
    if (!loanId) return;

    setIsDeleting(true);
    try {
      await axiosPrivate.delete("instruments/manage-instruments-loans", {
        data: { instrument_loan_id: loanId },
      });
      setShowDeleteDialog(false);
      onClose();
      if (onLoanDeleted) {
        onLoanDeleted();
      }
    } catch (err: any) {
      console.error("Error deleting loan:", err);
      setError(err?.response?.data?.error || "Error al eliminar el alquiler");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const isLoanPrestado = loan?.status === "prestado";
  const isLoanDevuelto = loan?.status === "devuelto";

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-CR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("es-CR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
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
                          Información del Alquiler
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
                          Edita la información del alquiler.
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
                      <div className="px-4 py-12 sm:px-6">
                        <div className="text-center">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      </div>
                    ) : loan ? (
                      <div className="px-4 py-5 sm:px-6">
                        <div className="space-y-6">
                          {/* Instrument (Read-only) */}
                          <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-0 sm:py-0">
                            <div>
                              <label className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5">
                                Instrumento
                              </label>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-sm text-gray-900">
                                {loan.instrument.instrument_type.name}
                                {loan.instrument.serial_number &&
                                  ` - ${loan.instrument.serial_number}`}
                              </p>
                            </div>
                          </div>

                          {/* Loan User (Read-only) */}
                          <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-0 sm:py-0">
                            <div>
                              <label className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5">
                                Usuario
                              </label>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-sm text-gray-900">
                                {`${loan.loan_user.first_name} ${loan.loan_user.last_name}`}
                              </p>
                            </div>
                          </div>

                          {/* Loan Date (Read-only) */}
                          <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-0 sm:py-0">
                            <div>
                              <label className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5">
                                Fecha de préstamo
                              </label>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-sm text-gray-900">
                                {formatDate(loan.loan_date)}
                              </p>
                            </div>
                          </div>

                          {/* Expected Return Date (Editable) */}
                          <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-0 sm:py-0">
                            <div>
                              <label
                                htmlFor="expected_return_date"
                                className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                              >
                                Fecha de retorno esperada
                              </label>
                            </div>
                            <div className="sm:col-span-2">
                              <input
                                type="date"
                                id="expected_return_date"
                                name="expected_return_date"
                                value={
                                  expectedReturnDate
                                    ? expectedReturnDate.includes("T")
                                      ? expectedReturnDate.split("T")[0]
                                      : expectedReturnDate
                                    : ""
                                }
                                onChange={(e) =>
                                  setExpectedReturnDate(e.target.value)
                                }
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Price (Editable) */}
                          <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-0 sm:py-0">
                            <div>
                              <label
                                htmlFor="price"
                                className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                              >
                                Precio (por mes)
                              </label>
                            </div>
                            <div className="sm:col-span-2">
                              <div className="flex items-center">
                                <span className="mr-2 text-gray-500">₡</span>
                                <input
                                  type="number"
                                  id="price"
                                  name="price"
                                  value={price ?? ""}
                                  onChange={(e) =>
                                    setPrice(
                                      e.target.value
                                        ? parseInt(e.target.value, 10)
                                        : null,
                                    )
                                  }
                                  min="0"
                                  placeholder="0"
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Actual Return Date (Editable, only if status is "devuelto") */}
                          {isLoanDevuelto && (
                            <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-0 sm:py-0">
                              <div>
                                <label
                                  htmlFor="actual_return_date"
                                  className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                                >
                                  Fecha de retorno real
                                </label>
                              </div>
                              <div className="sm:col-span-2">
                                <input
                                  type="date"
                                  id="actual_return_date"
                                  name="actual_return_date"
                                  value={
                                    actualReturnDate
                                      ? actualReturnDate.includes("T")
                                        ? actualReturnDate.split("T")[0]
                                        : actualReturnDate
                                      : ""
                                  }
                                  onChange={(e) =>
                                    setActualReturnDate(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>
                          )}

                          {/* Status (Read-only) */}
                          <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-0 sm:py-0">
                            <div>
                              <label className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5">
                                Estado
                              </label>
                            </div>
                            <div className="sm:col-span-2">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                  loan.status === "prestado"
                                    ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                                    : "bg-green-50 text-green-700 ring-green-600/20"
                                }`}
                              >
                                {loan.status === "prestado"
                                  ? "Prestado"
                                  : "Devuelto"}
                              </span>
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
                                {formatDateTime(loan.created_at)}
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
                                {formatDateTime(loan.updated_at)}
                              </p>
                            </div>
                          </div>

                          {/* Created By */}
                          {loan.created_by && (
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
                                  {`${loan.created_by.first_name} ${loan.created_by.last_name}`}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Updated By */}
                          {loan.updated_by && (
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
                                  {`${loan.updated_by.first_name} ${loan.updated_by.last_name}`}
                                </p>
                              </div>
                            </div>
                          )}
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
                      ¿Estás seguro de que deseas guardar los cambios en este
                      alquiler?
                    </p>
                    {actualReturnDate && isLoanPrestado && (
                      <p className="mt-2 text-sm text-blue-600 font-semibold">
                        Nota: Al establecer la fecha de retorno real, el estado
                        cambiará a "devuelto" y el instrumento se marcará como
                        "libre".
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
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
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
                    {isLoanPrestado
                      ? "Confirmar eliminación"
                      : "Confirmar eliminación"}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {isLoanPrestado
                        ? `¿Estás seguro de que deseas eliminar este alquiler? El instrumento "${loan?.instrument.instrument_type.name}" será marcado como "libre" automáticamente. Esta acción es irreversible.`
                        : `¿Estás seguro de que deseas eliminar este alquiler? Esta acción es irreversible y no se puede deshacer.`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="inline-flex w-full justify-center rounded-md bg-red-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-900/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
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
                          className="size-6 text-primary"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          ¡Guardado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los cambios en el alquiler se han actualizado
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
          document.body,
        )}
    </>
  );
};

export default InstrumentLoanEditDrawer;
