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
  ExclamationCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

interface CourseEnrollmentInfo {
  id: number;
  course_name: string;
  course_code: string;
  period: number;
  year: number;
}

interface InstrumentLoanInfo {
  id: number;
  instrument_type: string;
  serial_number: string | null;
  loan_date: string;
  expected_return_date: string;
}

interface Payment {
  id: number;
  user: User;
  course_enrollment: number | null;
  instrument_loan: number | null;
  course_enrollment_info: CourseEnrollmentInfo | null;
  instrument_loan_info: InstrumentLoanInfo | null;
  payment_type: "enrollment" | "loan" | null;
  amount: number;
  amount_paid: number | null;
  remaining_amount: number;
  late_due: string;
  status: string;
  is_overdue: boolean;
}

interface StudentSummary {
  total_amount: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  overdue_payments_count: number;
  earliest_overdue_date: string | null;
  next_month_remaining: number;
  next_payment_date: string | null;
  by_status: {
    [key: string]: {
      count: number;
      total_amount: number;
      total_paid: number;
      remaining: number;
    };
  };
  next_payment: Payment | null;
}

interface PaymentRegisterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number | null;
  onPaymentRegistered?: () => void;
}

const PaymentRegisterDrawer: React.FC<PaymentRegisterDrawerProps> = ({
  isOpen,
  onClose,
  studentId,
  onPaymentRegistered,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Summary data
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);

  // Form state
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    if (isOpen && studentId) {
      fetchSummary();
    } else {
      setSummary(null);
      setPendingPayments([]);
      setAmountToPay(0);
      setNote("");
      setSelectedPaymentIds(new Set());
    }
  }, [isOpen, studentId]);

  const fetchSummary = async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch summary for all payments of this student
      const summaryResponse = await axiosPrivate.get<StudentSummary>(
        "payments/student-summary",
        {
          params: {
            student_id: studentId,
          },
        }
      );
      setSummary(summaryResponse.data);

      // Fetch all pending payments for this student
      const paymentsResponse = await axiosPrivate.get(
        "payments/manage-payments",
        {
          params: {
            student_id: studentId,
            page_size: 100,
          },
        }
      );

      const allPayments: Payment[] = paymentsResponse.data.results;
      const pending = allPayments.filter((p) => p.status !== "completado");
      setPendingPayments(pending);

      // Start with amount at 0 and no pre-selected payments
      setAmountToPay(0);
      setSelectedPaymentIds(new Set());
    } catch (err: any) {
      console.error("Error fetching summary:", err);
      setError(err?.response?.data?.error || "Error al cargar información");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!studentId || amountToPay <= 0 || selectedPaymentIds.size === 0) return;

    setIsRegistering(true);
    setError(null);

    try {
      await axiosPrivate.post("payments/register-payment", {
        student_id: studentId,
        payment_ids: Array.from(selectedPaymentIds),
        amount: amountToPay,
        note: note || null,
      });

      setShowConfirmDialog(false);
      setShowSuccessNotification(true);

      if (onPaymentRegistered) {
        onPaymentRegistered();
      }

      setTimeout(() => {
        setShowSuccessNotification(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al registrar el pago");
      console.error("Error registering payment:", err);
      setShowConfirmDialog(false);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterClick = () => {
    if (amountToPay <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
      // Django stores datetimes in UTC, but we only need the date
      const datePart = dateString.split('T')[0].split(' ')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString("es-CR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatCurrency = (value: number) => {
    return `₡${value?.toLocaleString() || 0}`;
  };

  // Calculate how payment will be applied - only for selected payments
  const getPaymentPreview = () => {
    if (!pendingPayments.length || amountToPay <= 0) return [];

    // Filter to only selected payments, sorted by late_due
    const selectedPayments = pendingPayments
      .filter((p) => selectedPaymentIds.has(p.id))
      .sort(
        (a, b) =>
          new Date(a.late_due).getTime() - new Date(b.late_due).getTime()
      );

    if (selectedPayments.length === 0) return [];

    let remaining = amountToPay;
    const preview: { payment: Payment; willPay: number; newStatus: string }[] =
      [];

    for (const payment of selectedPayments) {
      if (remaining <= 0) break;

      const alreadyPaid = payment.amount_paid || 0;
      const needed = payment.amount - alreadyPaid;

      if (needed <= 0) continue;

      if (remaining >= needed) {
        preview.push({
          payment,
          willPay: needed,
          newStatus: "completado",
        });
        remaining -= needed;
      } else {
        preview.push({
          payment,
          willPay: remaining,
          newStatus: "incompleto",
        });
        remaining = 0;
      }
    }

    return preview;
  };

  const paymentPreview = getPaymentPreview();

  // Calculate total of selected payments
  const selectedTotal = pendingPayments
    .filter((p) => selectedPaymentIds.has(p.id))
    .reduce((sum, p) => sum + p.remaining_amount, 0);

  // Validation: amount > 0 and selected payments can cover the amount
  const isAmountValid =
    amountToPay > 0 &&
    selectedTotal >= amountToPay &&
    selectedPaymentIds.size > 0;

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
                          Registrar Pago
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
                          Registrar pago del estudiante
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
                      <div className="px-4 py-6 sm:px-6">
                        <div className="rounded-md bg-red-50 p-4">
                          <div className="flex">
                            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                              <p className="text-sm text-red-700">{error}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : summary ? (
                      <div className="px-4 py-5 sm:px-6 space-y-6">
                        {/* Summary Info */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">
                                Total a pagar
                              </p>
                              <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(summary.total_amount)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Pagado</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(summary.total_paid)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Pendiente</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(summary.total_pending)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Vencido</p>
                              <p className="text-lg font-semibold text-red-600">
                                {formatCurrency(summary.total_overdue)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Próximo Pago / Overdue Section */}
                        {(summary.total_overdue > 0 ||
                          summary.next_month_remaining > 0) && (
                          <div
                            className={`border rounded-lg p-4 ${
                              summary.total_overdue > 0
                                ? "border-red-200 bg-red-50"
                                : "border-blue-200 bg-blue-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {summary.total_overdue > 0 ? (
                                <>
                                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                                  <span className="text-sm font-medium text-red-900">
                                    Pendiente de pago
                                  </span>
                                </>
                              ) : (
                                <>
                                  <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
                                  <span className="text-sm font-medium text-blue-900">
                                    Próximo pago
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <div>
                                <p
                                  className={`text-lg font-semibold ${
                                    summary.total_overdue > 0
                                      ? "text-red-700"
                                      : "text-blue-700"
                                  }`}
                                >
                                  {formatCurrency(
                                    summary.total_overdue > 0
                                      ? summary.total_overdue
                                      : summary.next_month_remaining
                                  )}
                                </p>
                                <div
                                  className={`flex items-center gap-1 text-sm ${
                                    summary.total_overdue > 0
                                      ? "text-red-600"
                                      : "text-blue-600"
                                  }`}
                                >
                                  <CalendarDaysIcon className="h-4 w-4" />
                                  <span>
                                    {summary.total_overdue > 0
                                      ? `Pendiente desde: ${formatDate(
                                          summary.earliest_overdue_date || ""
                                        )}`
                                      : `Vence: ${formatDate(
                                          summary.next_payment_date || ""
                                        )}`}
                                  </span>
                                </div>
                                {summary.total_overdue > 0 &&
                                  summary.overdue_payments_count > 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                      {summary.overdue_payments_count} pago(s)
                                      vencido(s)
                                    </p>
                                  )}
                              </div>
                              {summary.total_overdue > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                  <ExclamationCircleIcon className="h-3 w-3" />
                                  Vencido
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <hr className="border-gray-200" />

                        {/* Amount to Cancel Input */}
                        <div className="space-y-2">
                          <label
                            htmlFor="amountToPay"
                            className="block text-sm font-medium text-gray-900"
                          >
                            Monto a cancelar
                          </label>
                          <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-500 sm:text-sm">
                                ₡
                              </span>
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              id="amountToPay"
                              value={amountToPay}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                setAmountToPay(parseInt(value) || 0);
                              }}
                              className="block w-full rounded-md border-0 py-2 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                            />
                          </div>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Payment Selection Section */}
                        {pendingPayments.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                Selección de pagos
                              </h4>
                              {amountToPay > 0 && (
                                <span className="text-xs text-gray-500">
                                  Selecciona pagos hasta cubrir ₡
                                  {amountToPay.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                              {pendingPayments.map((payment) => (
                                <label
                                  key={payment.id}
                                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                                    selectedPaymentIds.has(payment.id)
                                      ? "bg-white ring-1 ring-gray-900"
                                      : "hover:bg-white"
                                  } ${
                                    amountToPay === 0
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedPaymentIds.has(
                                        payment.id
                                      )}
                                      disabled={amountToPay === 0}
                                      onChange={(e) => {
                                        const newSelected = new Set(
                                          selectedPaymentIds
                                        );
                                        if (e.target.checked) {
                                          newSelected.add(payment.id);
                                        } else {
                                          newSelected.delete(payment.id);
                                        }
                                        setSelectedPaymentIds(newSelected);
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50"
                                    />
                                    <div className="flex-1">
                                      {/* Payment Type Description */}
                                      <p className="text-xs text-gray-500 mb-0.5">
                                        {payment.course_enrollment_info
                                          ? `Mensualidad: ${payment.course_enrollment_info.course_name}`
                                          : payment.instrument_loan_info
                                          ? `Alquiler: ${payment.instrument_loan_info.instrument_type}`
                                          : "Pago"}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">
                                          {formatCurrency(payment.amount)}
                                        </span>
                                        {payment.is_overdue ? (
                                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                            Vencido
                                          </span>
                                        ) : payment.status === "incompleto" ? (
                                          <span className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                            Incompleto
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center rounded-md bg-yellow-50 px-1.5 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                                            Pendiente
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                        <CalendarDaysIcon className="h-3 w-3" />
                                        <span>
                                          Vence: {formatDate(payment.late_due)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(payment.remaining_amount)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      restante
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                              <span className="text-sm text-gray-600">
                                {selectedPaymentIds.size} pago(s)
                                seleccionado(s)
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                Total:{" "}
                                {formatCurrency(
                                  pendingPayments
                                    .filter((p) => selectedPaymentIds.has(p.id))
                                    .reduce(
                                      (sum, p) => sum + p.remaining_amount,
                                      0
                                    )
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Note Input */}
                        <div className="space-y-2">
                          <label
                            htmlFor="note"
                            className="block text-sm font-medium text-gray-900"
                          >
                            Nota (opcional)
                          </label>
                          <textarea
                            id="note"
                            name="note"
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Agregar una nota al pago..."
                            className="block w-full rounded-md pl-3 border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                          />
                        </div>

                        {/* Payment Preview */}
                        {paymentPreview.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              Vista previa del pago
                            </h4>
                            <div className="space-y-2">
                              {paymentPreview.map((item, index) => (
                                <div
                                  key={item.payment.id}
                                  className={`flex items-center justify-between py-2 px-3 rounded-md ${
                                    item.newStatus === "completado"
                                      ? "bg-green-50 border border-green-200"
                                      : "bg-orange-50 border border-orange-200"
                                  }`}
                                >
                                  <div className="flex-1">
                                    <p className="text-xs text-gray-500">
                                      {item.payment.course_enrollment_info
                                        ? `Mensualidad: ${item.payment.course_enrollment_info.course_name}`
                                        : item.payment.instrument_loan_info
                                        ? `Alquiler: ${item.payment.instrument_loan_info.instrument_type}`
                                        : "Pago"}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      Cuota #{index + 1} - Vence{" "}
                                      {formatDate(item.payment.late_due)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Restante:{" "}
                                      {formatCurrency(
                                        item.payment.remaining_amount
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                      +{formatCurrency(item.willPay)}
                                    </p>
                                    {item.newStatus === "completado" ? (
                                      <span className="text-xs text-green-600 font-medium">
                                        ✓ Completado
                                      </span>
                                    ) : (
                                      <>
                                        <span className="text-xs text-orange-600 font-medium">
                                          Incompleto
                                        </span>
                                        <p className="text-xs text-gray-500">
                                          Faltarán:{" "}
                                          {formatCurrency(
                                            item.payment.remaining_amount -
                                              item.willPay
                                          )}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex shrink-0 flex-col px-4 py-4 gap-3">
                    {/* Validation Warning */}
                    {amountToPay > 0 && selectedPaymentIds.size === 0 && (
                      <p className="text-xs text-amber-600 text-center">
                        Selecciona los pagos que deseas cubrir
                      </p>
                    )}
                    {amountToPay > 0 &&
                      selectedTotal > 0 &&
                      selectedTotal < amountToPay && (
                        <p className="text-xs text-amber-600 text-center">
                          Selecciona más pagos. Faltan{" "}
                          {formatCurrency(amountToPay - selectedTotal)} por
                          cubrir
                        </p>
                      )}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        disabled={isRegistering}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleRegisterClick}
                        disabled={
                          isRegistering ||
                          !isAmountValid ||
                          !summary ||
                          selectedPaymentIds.size === 0
                        }
                        className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRegistering
                          ? "Registrando..."
                          : `Registrar ${formatCurrency(amountToPay)}`}
                      </button>
                    </div>
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
                    Confirmar pago
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas registrar un pago de{" "}
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(amountToPay)}
                      </span>
                      ?
                    </p>
                    {paymentPreview.length > 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        Este pago se aplicará a {paymentPreview.length}{" "}
                        cuota(s).
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isRegistering ? "Registrando..." : "Confirmar pago"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isRegistering}
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
                          ¡Pago registrado!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          El pago se ha registrado correctamente.
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

export default PaymentRegisterDrawer;
