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
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface EnrollmentPreview {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  course_name: string;
  course_code: string;
}

interface PreviewResponse {
  matching_count: number;
  enrollments: EnrollmentPreview[];
}

interface BulkCustomPaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentsCreated?: () => void;
  availableYears: number[];
}

const BulkCustomPaymentDrawer: React.FC<BulkCustomPaymentDrawerProps> = ({
  isOpen,
  onClose,
  onPaymentsCreated,
  availableYears,
}) => {
  const axiosPrivate = useAxiosPrivate();

  // Filter fields
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [filterEnrollmentStatus, setFilterEnrollmentStatus] =
    useState<string>("");

  // Preview data
  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [matchingEnrollments, setMatchingEnrollments] = useState<
    EnrollmentPreview[]
  >([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Form fields
  const [paymentType, setPaymentType] = useState<string>("enrollment");
  const [amount, setAmount] = useState<number>(0);
  const [lateDue, setLateDue] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setFilterYear("");
      setFilterPeriod("");
      setFilterEnrollmentStatus("");
      setPaymentType("enrollment");
      setAmount(0);
      setLateDue("");
      setNote("");
      setMatchingCount(0);
      setMatchingEnrollments([]);
      setError(null);
    }
  }, [isOpen]);

  // Debounced preview fetch
  useEffect(() => {
    if (!filterYear) {
      setMatchingCount(0);
      setMatchingEnrollments([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchPreview();
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [filterYear, filterPeriod, filterEnrollmentStatus]);

  const fetchPreview = async () => {
    if (!filterYear) return;

    try {
      setIsLoadingPreview(true);
      setError(null);

      const params: any = { year: filterYear };
      if (filterPeriod) params.period = filterPeriod;
      if (filterEnrollmentStatus)
        params.enrollment_status = filterEnrollmentStatus;

      const response = await axiosPrivate.get<PreviewResponse>(
        "payments/bulk-custom-payments",
        { params }
      );

      setMatchingCount(response.data.matching_count);
      setMatchingEnrollments(response.data.enrollments);
    } catch (err: any) {
      console.error("Error fetching preview:", err);
      setError(err?.response?.data?.error || "Error al cargar la vista previa");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const payload: any = {
        year: filterYear,
        amount,
        late_due: lateDue,
        note,
        payment_type: paymentType,
      };
      if (filterPeriod) payload.period = filterPeriod;
      if (filterEnrollmentStatus)
        payload.enrollment_status = filterEnrollmentStatus;

      const response = await axiosPrivate.post(
        "payments/bulk-custom-payments",
        payload
      );

      setCreatedCount(response.data.payments_created);
      setShowConfirmDialog(false);
      setShowSuccessNotification(true);

      if (onPaymentsCreated) {
        onPaymentsCreated();
      }

      setTimeout(() => {
        setShowSuccessNotification(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Error creating payments:", err);
      setError(err?.response?.data?.error || "Error al crear los pagos");
      setShowConfirmDialog(false);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid =
    filterYear && amount > 0 && lateDue && matchingCount > 0 && paymentType;

  const formatCurrency = (value: number) => {
    return `₡${value?.toLocaleString() || 0}`;
  };

  const getPeriodLabel = (period: string) => {
    if (period === "1") return "I";
    if (period === "2") return "II";
    if (period === "3") return "III";
    return "Todos";
  };

  const getStatusLabel = (s: string) => {
    if (s === "cursando") return "Cursando";
    if (s === "aprobado") return "Aprobado";
    if (s === "reprobado") return "Reprobado";
    if (s === "retirado") return "Retirado";
    return "Todos";
  };

  const getPaymentTypeLabel = (t: string) => {
    if (t === "enrollment") return "Mensualidad";
    if (t === "extra") return "Extra";
    return t;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const [year, month, day] = dateString.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("es-CR", {
        year: "numeric",
        month: "short",
        day: "numeric",
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
                className="pointer-events-auto w-screen max-w-lg transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <div className="relative flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-gray-900 px-4 py-20 sm:px-6">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-white">
                          Crear Pagos Masivos
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
                          Crear pagos para usuarios con matrículas activas.
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                      <div className="space-y-6">
                        {/* Section: Enrollment Filters */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            Filtros de Matrícula
                          </h4>

                          <div className="space-y-4">
                            {/* Year */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="bulkYear"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5 flex items-center gap-1"
                              >
                                <CalendarIcon className="h-4 w-4" />
                                Año
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="sm:col-span-2">
                                <div className="grid grid-cols-1">
                                  <select
                                    id="bulkYear"
                                    value={filterYear}
                                    onChange={(e) =>
                                      setFilterYear(e.target.value)
                                    }
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  >
                                    <option value="">Seleccionar año</option>
                                    {availableYears.map((year) => (
                                      <option key={year} value={year}>
                                        {year}
                                      </option>
                                    ))}
                                  </select>
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
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
                              </div>
                            </div>

                            {/* Period */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="bulkPeriod"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5 flex items-center gap-1"
                              >
                                <CalendarDaysIcon className="h-4 w-4" />
                                Período
                              </label>
                              <div className="sm:col-span-2">
                                <div className="grid grid-cols-1">
                                  <select
                                    id="bulkPeriod"
                                    value={filterPeriod}
                                    onChange={(e) =>
                                      setFilterPeriod(e.target.value)
                                    }
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  >
                                    <option value="">Todos</option>
                                    <option value="1">I</option>
                                    <option value="2">II</option>
                                    <option value="3">III</option>
                                  </select>
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
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
                              </div>
                            </div>

                            {/* Enrollment Status */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="bulkEnrollmentStatus"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                              >
                                Estado matrícula
                              </label>
                              <div className="sm:col-span-2">
                                <div className="grid grid-cols-1">
                                  <select
                                    id="bulkEnrollmentStatus"
                                    value={filterEnrollmentStatus}
                                    onChange={(e) =>
                                      setFilterEnrollmentStatus(e.target.value)
                                    }
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  >
                                    <option value="">Todos</option>
                                    <option value="cursando">Cursando</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="reprobado">Reprobado</option>
                                  </select>
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
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
                              </div>
                            </div>
                          </div>

                          {/* Live Count Box */}
                          <div className="mt-4">
                            {isLoadingPreview ? (
                              <div className="rounded-md bg-gray-50 border border-gray-200 p-3 flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                <span className="text-sm text-gray-500">
                                  Buscando matrículas...
                                </span>
                              </div>
                            ) : !filterYear ? (
                              <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                                <p className="text-sm text-gray-500">
                                  Seleccione un año para ver las matrículas
                                  disponibles.
                                </p>
                              </div>
                            ) : matchingCount > 0 ? (
                              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                                <p className="text-sm font-medium text-blue-800">
                                  {matchingCount} matrícula
                                  {matchingCount !== 1 ? "s" : ""} coinciden
                                </p>
                                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                                  {matchingEnrollments
                                    .slice(0, 50)
                                    .map((enrollment) => (
                                      <p
                                        key={enrollment.enrollment_id}
                                        className="text-xs text-blue-700"
                                      >
                                        {enrollment.student_name} -{" "}
                                        {enrollment.course_code}
                                      </p>
                                    ))}
                                  {matchingCount > 50 && (
                                    <p className="text-xs text-blue-500 italic">
                                      y {matchingCount - 50} más...
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                                <p className="text-sm text-amber-800">
                                  No se encontraron matrículas con estos
                                  filtros.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Section: Payment Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            Detalles del Pago
                          </h4>

                          <div className="space-y-4">
                            {/* Payment Type */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="bulkPaymentType"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5 flex items-center gap-1"
                              >
                                <BanknotesIcon className="h-4 w-4" />
                                Tipo de pago
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="sm:col-span-2">
                                <div className="grid grid-cols-1">
                                  <select
                                    id="bulkPaymentType"
                                    value={paymentType}
                                    onChange={(e) =>
                                      setPaymentType(e.target.value)
                                    }
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  >
                                    <option value="enrollment">
                                      Mensualidad
                                    </option>
                                    <option value="extra">Extra</option>
                                  </select>
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
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
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="bulkAmount"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                              >
                                Monto por pago
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="sm:col-span-2">
                                <div className="relative rounded-md shadow-sm">
                                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-gray-500 sm:text-sm">
                                      ₡
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    id="bulkAmount"
                                    value={amount || ""}
                                    onChange={(e) =>
                                      setAmount(parseInt(e.target.value) || 0)
                                    }
                                    min="0"
                                    placeholder="0"
                                    className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                  />
                                </div>
                                {matchingCount > 0 && amount > 0 && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Total:{" "}
                                    {formatCurrency(amount * matchingCount)} (
                                    {matchingCount} pagos)
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Late Due */}
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label
                                htmlFor="bulkLateDue"
                                className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                              >
                                Vencimiento
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="sm:col-span-2">
                                <input
                                  type="date"
                                  id="bulkLateDue"
                                  value={lateDue}
                                  onChange={(e) => setLateDue(e.target.value)}
                                  className="block w-full px-3 rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                />
                              </div>
                            </div>

                            {/* Note */}
                            <div className="space-y-2">
                              <label
                                htmlFor="bulkNote"
                                className="block text-sm font-medium text-gray-900"
                              >
                                Nota (opcional)
                              </label>
                              <textarea
                                id="bulkNote"
                                rows={2}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Descripción del pago..."
                                className="block w-full rounded-md pl-3 border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Error */}
                        {error && (
                          <div className="rounded-md bg-red-50 border border-red-200 p-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4 gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      disabled={isCreating}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={!isFormValid || isCreating}
                      className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {`Crear ${matchingCount} pago${matchingCount !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
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
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-6 text-amber-600"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar creación masiva
                  </DialogTitle>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-500">
                      Se crearán{" "}
                      <span className="font-semibold text-gray-900">
                        {matchingCount} pago{matchingCount !== 1 ? "s" : ""}
                      </span>{" "}
                      con las siguientes características:
                    </p>
                    <div className="text-sm text-gray-600 space-y-1 bg-gray-50 rounded-md p-3">
                      <p>
                        <span className="font-medium">Tipo:</span>{" "}
                        {getPaymentTypeLabel(paymentType)}
                      </p>
                      <p>
                        <span className="font-medium">Año:</span> {filterYear}
                      </p>
                      <p>
                        <span className="font-medium">Período:</span>{" "}
                        {getPeriodLabel(filterPeriod)}
                      </p>
                      <p>
                        <span className="font-medium">Estado matrícula:</span>{" "}
                        {getStatusLabel(filterEnrollmentStatus)}
                      </p>
                      <p>
                        <span className="font-medium">Monto por pago:</span>{" "}
                        {formatCurrency(amount)}
                      </p>
                      <p>
                        <span className="font-medium">Total:</span>{" "}
                        {formatCurrency(amount * matchingCount)}
                      </p>
                      <p>
                        <span className="font-medium">Vencimiento:</span>{" "}
                        {formatDate(lateDue)}
                      </p>
                      {note && (
                        <p>
                          <span className="font-medium">Nota:</span> {note}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-medium text-red-600">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isCreating
                    ? "Creando..."
                    : `Crear ${matchingCount} pago${matchingCount !== 1 ? "s" : ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isCreating}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
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
                          className="size-6 text-green-500"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Pagos creados exitosamente
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Se crearon {createdCount} pago
                          {createdCount !== 1 ? "s" : ""} correctamente.
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

export default BulkCustomPaymentDrawer;
