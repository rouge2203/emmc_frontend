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
  ClockIcon,
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
  payment_type: "enrollment" | "loan" | "anualidad" | "extra" | null;
  amount: number;
  amount_paid: number | null;
  remaining_amount: number;
  late_due: string;
  status: string;
  is_overdue: boolean;
  updated_by: User | null;
  updated_at: string;
  note: string | null;
}

interface PaymentViewEditDrawerProps {
  paymentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentUpdated?: () => void;
}

interface PaymentResponse {
  payment: Payment;
}

const PaymentViewEditDrawer: React.FC<PaymentViewEditDrawerProps> = ({
  paymentId,
  isOpen,
  onClose,
  onPaymentUpdated,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Form state
  const [amount, setAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [status, setStatus] = useState<string>("en espera");
  const [lateDue, setLateDue] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchPaymentData();
    }
  }, [isOpen, paymentId]);

  // Auto-update status based on amount_paid changes
  useEffect(() => {
    if (amountPaid >= amount && amount > 0) {
      setStatus("completado");
    } else if (amountPaid > 0 && amountPaid < amount) {
      setStatus("incompleto");
    } else if (amountPaid === 0) {
      setStatus("en espera");
    }
  }, [amountPaid, amount]);

  const fetchPaymentData = async () => {
    if (!paymentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await axiosPrivate.get("payments/manage-payments", {
        params: { payment_id: paymentId },
      });

      const results = response.data.results;
      if (results && results.length > 0) {
        const foundPayment = results[0];
        setPayment(foundPayment);
        setAmount(foundPayment.amount || 0);
        setAmountPaid(foundPayment.amount_paid || 0);
        setStatus(foundPayment.status || "en espera");
        setLateDue(foundPayment.late_due || "");
        setNote(foundPayment.note || "");
      } else {
        setError("Pago no encontrado");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Error al cargar la información del pago"
      );
      console.error("Error fetching payment data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!paymentId) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await axiosPrivate.put<PaymentResponse>(
        "payments/manage-payments",
        {
          payment_id: paymentId,
          amount,
          amount_paid: amountPaid,
          status,
          late_due: lateDue,
          note,
        }
      );

      const updatedPayment = response.data.payment;
      if (updatedPayment) {
        setPayment(updatedPayment);
        setAmount(updatedPayment.amount || 0);
        setAmountPaid(updatedPayment.amount_paid || 0);
        setStatus(updatedPayment.status || "en espera");
        setLateDue(updatedPayment.late_due || "");
        setNote(updatedPayment.note || "");

        if (onPaymentUpdated) {
          onPaymentUpdated();
        }
      }

      setShowConfirmDialog(false);
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar los cambios");
      console.error("Error saving payment data:", err);
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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      // Parse datetime properly to avoid timezone issues
      // Django sends UTC datetime, convert it properly
      const date = new Date(dateString);
      return date.toLocaleString("es-CR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Costa_Rica",
      });
    } catch {
      return "N/A";
    }
  };

  const formatCurrency = (value: number) => {
    return `₡${value?.toLocaleString() || 0}`;
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
                          Detalle del Pago
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
                          Ver y editar información del pago.
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
                    ) : payment ? (
                      <div className="px-4 py-5 sm:px-6">
                        <div className="space-y-6">
                          {/* Cancelled Payment Banner */}
                          {payment.status === "cancelado" && (
                            <div className="rounded-md bg-gray-50 border border-gray-300 p-3">
                              <p className="text-sm font-medium text-gray-700">
                                Este pago fue cancelado por retiro del curso. No se puede editar.
                              </p>
                            </div>
                          )}

                          {/* User Info (Read-only) */}
                          <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                            <label className="block text-sm font-medium text-gray-900 sm:mt-1.5">
                              Usuario
                            </label>
                            <p className="text-sm text-gray-700 sm:col-span-2 sm:mt-1.5">
                              {payment.user.first_name} {payment.user.last_name}
                            </p>
                          </div>

                          {/* Payment Type (Read-only) */}
                          <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                            <label className="block text-sm font-medium text-gray-900 sm:mt-1.5">
                              Tipo de pago
                            </label>
                            <p className="text-sm text-gray-700 sm:col-span-2 sm:mt-1.5">
                              {payment.payment_type === "enrollment"
                                ? "Mensualidad de curso"
                                : payment.payment_type === "extra"
                                  ? "Extra"
                                  : payment.payment_type === "anualidad"
                                    ? "Matrícula"
                                    : "Alquiler de instrumento"}
                            </p>
                          </div>

                          {/* Course/Instrument Info (Read-only) */}
                          {payment.course_enrollment_info && (
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label className="block text-sm font-medium text-gray-900 sm:mt-1.5">
                                Curso
                              </label>
                              <div className="sm:col-span-2">
                                <p className="text-sm text-gray-700">
                                  {payment.course_enrollment_info.course_code} -{" "}
                                  {payment.course_enrollment_info.course_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Período{" "}
                                  {payment.course_enrollment_info.period} -{" "}
                                  {payment.course_enrollment_info.year}
                                </p>
                              </div>
                            </div>
                          )}

                          {payment.instrument_loan_info && (
                            <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                              <label className="block text-sm font-medium text-gray-900 sm:mt-1.5">
                                Instrumento
                              </label>
                              <div className="sm:col-span-2">
                                <p className="text-sm text-gray-700">
                                  {payment.instrument_loan_info.instrument_type}
                                </p>
                                {payment.instrument_loan_info.serial_number && (
                                  <p className="text-xs text-gray-500">
                                    S/N:{" "}
                                    {payment.instrument_loan_info.serial_number}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <hr className="border-gray-200" />

                          {/* Amount (Editable) */}
                          <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                            <label
                              htmlFor="amount"
                              className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                            >
                              Monto total
                            </label>
                            <div className="sm:col-span-2">
                              <div className="relative rounded-md shadow-sm bg-gray-100">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                  <span className="text-gray-500 sm:text-sm">
                                    ₡
                                  </span>
                                </div>
                                <input
                                  type="number"
                                  id="amount"
                                  name="amount"
                                  value={amount}
                                  onChange={(e) =>
                                    setAmount(parseInt(e.target.value) || 0)
                                  }
                                  min="0"
                                  className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Amount Paid (Editable) */}
                          <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                            <label
                              htmlFor="amountPaid"
                              className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                            >
                              Monto pagado
                            </label>
                            <div className="sm:col-span-2">
                              <div className="relative rounded-md  shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                  <span className="text-gray-500 sm:text-sm">
                                    ₡
                                  </span>
                                </div>
                                <input
                                  type="number"
                                  id="amountPaid"
                                  name="amountPaid"
                                  value={amountPaid}
                                  onChange={(e) =>
                                    setAmountPaid(parseInt(e.target.value) || 0)
                                  }
                                  min="0"
                                  max={amount}
                                  className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                                />
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                Restante: {formatCurrency(amount - amountPaid)}
                              </p>
                            </div>
                          </div>

                          {/* Late Due (Editable) */}
                          <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                            <label
                              htmlFor="lateDue"
                              className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                            >
                              Fecha de vencimiento
                            </label>
                            <div className="sm:col-span-2">
                              <input
                                type="date"
                                id="lateDue"
                                name="lateDue"
                                value={lateDue}
                                onChange={(e) => setLateDue(e.target.value)}
                                className="block px-3 w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                              />
                            </div>
                          </div>

                          {/* Status (Editable but auto-managed) */}
                          <div className="space-y-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                            <label
                              htmlFor="status"
                              className="block text-sm font-medium text-gray-900 sm:mt-1.5"
                            >
                              Estado
                            </label>
                            <div className="sm:col-span-2">
                              <input
                                id="status"
                                name="status"
                                value={status}
                                disabled={true}
                                onChange={(e) => setStatus(e.target.value)}
                                className="block w-full px-2 pl-3 capitalize rounded-md bg-gray-100 border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                              >
                                {/* <option value="en espera">En espera</option>
                                <option value="completado">Completado</option>
                                <option value="incompleto">Incompleto</option> */}
                              </input>
                              <p className="mt-1 text-xs text-gray-500">
                                El estado se actualiza automáticamente según el
                                monto pagado.
                              </p>
                            </div>
                          </div>

                          <hr className="border-gray-200" />

                          {/* Note (Editable) */}
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
                              rows={5}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder="Agregar una nota al pago..."
                              className="block w-full rounded-md pl-3 border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-900 sm:text-sm sm:leading-6"
                            />
                          </div>

                          <hr className="border-gray-200" />

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
                                {formatDateTime(payment.updated_at)}
                              </p>
                            </div>
                          </div>

                          {/* Updated By */}
                          {payment.updated_by && (
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
                                  {payment.updated_by.first_name}{" "}
                                  {payment.updated_by.last_name}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4 gap-3">
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
                      disabled={isSaving || payment?.status === "cancelado"}
                      className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Guardando..." : "Guardar"}
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
                      ¿Estás seguro de que deseas guardar los cambios en este
                      pago?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
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
                          ¡Pago actualizado!
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

export default PaymentViewEditDrawer;
