import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  AcademicCapIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface PreviewPayment {
  id: number;
  payment_type: string;
  description: string;
  current_amount: number;
  amount_paid: number;
  suggested_amount: number;
  late_due: string | null;
  status: string;
  course_enrollment_info: {
    id: number;
    course_name: string | null;
    course_code: string | null;
    period: number;
    year: number;
  } | null;
  instrument_loan_info: {
    id: number;
    instrument_type: string | null;
    serial_number: string | null;
  } | null;
}

interface PreviewResponse {
  student: {
    id: number;
    first_name: string;
    last_name: string | null;
    email: string;
    is_becado: boolean;
    becado_percentage: number | null;
  };
  becado_percentage: number;
  total_original: number;
  total_suggested: number;
  savings: number;
  payments: PreviewPayment[];
}

interface RowState {
  id: number;
  payment: PreviewPayment;
  amount: string;
  skip: boolean;
}

interface BecadoApplyDrawerProps {
  studentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return "—";
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  enrollment: "Mensualidad",
  anualidad: "Matrícula",
  loan: "Alquiler",
  extra: "Extra",
};

const PAYMENT_TYPE_COLOR: Record<string, string> = {
  enrollment: "bg-blue-50 text-blue-700 ring-blue-600/20",
  anualidad: "bg-amber-50 text-amber-700 ring-amber-600/20",
  loan: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  extra: "bg-gray-50 text-gray-700 ring-gray-500/20",
};

const BecadoApplyDrawer: React.FC<BecadoApplyDrawerProps> = ({
  studentId,
  isOpen,
  onClose,
  onApplied,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [pctInput, setPctInput] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchPreview = useCallback(
    async (overridePct?: number) => {
      if (!studentId) return;
      try {
        setIsLoading(true);
        const params: any = { student_id: studentId };
        if (overridePct != null) params.becado_percentage = overridePct;
        const response = await axiosPrivate.get<PreviewResponse>(
          "payments/preview-becado-apply",
          { params },
        );
        setPreview(response.data);
        setRows(
          response.data.payments.map((p) => ({
            id: p.id,
            payment: p,
            amount: String(p.suggested_amount),
            skip: false,
          })),
        );
        if (overridePct == null) {
          setPctInput(String(response.data.becado_percentage));
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          "Error al cargar la vista previa de pagos";
        setErrorMessage(msg);
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
      } finally {
        setIsLoading(false);
      }
    },
    [axiosPrivate, studentId],
  );

  useEffect(() => {
    if (isOpen && studentId) {
      fetchPreview();
    } else {
      setPreview(null);
      setRows([]);
      setPctInput("");
    }
  }, [isOpen, studentId, fetchPreview]);

  const handleReapply = () => {
    const pct = parseInt(pctInput, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setErrorMessage("Ingresa un porcentaje entre 0 y 100");
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }
    fetchPreview(pct);
  };

  const totals = useMemo(() => {
    let original = 0;
    let nuevo = 0;
    for (const row of rows) {
      original += row.payment.current_amount;
      if (!row.skip) {
        const amt = parseInt(row.amount, 10);
        nuevo += isNaN(amt) ? 0 : amt;
      } else {
        nuevo += row.payment.current_amount;
      }
    }
    return { original, nuevo, savings: original - nuevo };
  }, [rows]);

  const validRows = useMemo(() => {
    return rows.every((row) => {
      if (row.skip) return true;
      const amt = parseInt(row.amount, 10);
      if (isNaN(amt)) return false;
      if (amt < row.payment.amount_paid) return false;
      return true;
    });
  }, [rows]);

  const handleApply = async () => {
    if (!studentId || !preview) return;
    const pct = parseInt(pctInput, 10);
    if (isNaN(pct)) {
      setErrorMessage("Porcentaje inválido");
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    try {
      setIsApplying(true);
      const payload = {
        student_id: studentId,
        becado_percentage: pct,
        payments: rows.map((row) => ({
          id: row.id,
          amount: parseInt(row.amount, 10),
          skip: row.skip,
        })),
      };
      const response = await axiosPrivate.post(
        "payments/apply-becado",
        payload,
      );
      setShowConfirm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      if (onApplied) onApplied();
      const errors = response.data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        setErrorMessage(
          `Algunos pagos no se actualizaron: ${errors
            .map((e: any) => `#${e.id}: ${e.error}`)
            .join("; ")}`,
        );
        setShowError(true);
        setTimeout(() => setShowError(false), 8000);
      }
    } catch (err: any) {
      setShowConfirm(false);
      setErrorMessage(
        err?.response?.data?.error || "Error al aplicar el descuento",
      );
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsApplying(false);
    }
  };

  const studentName = preview?.student
    ? `${preview.student.first_name || ""} ${preview.student.last_name || ""}`.trim()
    : "";

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-40">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/40 transition-opacity duration-300 data-closed:opacity-0"
        />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-4xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <div className="relative flex h-full flex-col bg-white shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-purple-700 px-4 py-5 sm:px-6 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <AcademicCapIcon className="size-6 text-purple-100 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <DialogTitle className="text-base font-semibold text-white">
                            Aplicar becado a pagos pendientes
                          </DialogTitle>
                          <p className="mt-1 text-sm text-purple-100 truncate">
                            {studentName
                              ? `${studentName} · Becado guardado: ${
                                  preview?.student.becado_percentage ?? 0
                                }%`
                              : "Cargando..."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md text-purple-100 hover:text-white shrink-0"
                      >
                        <span className="sr-only">Cerrar panel</span>
                        <XMarkIcon className="size-6" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
                      </div>
                    ) : !preview ? (
                      <p className="text-center text-sm text-gray-500 py-8">
                        Sin información disponible.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {/* % control */}
                        <div className="rounded-md bg-purple-50 border border-purple-200 px-4 py-3 flex items-center gap-3 flex-wrap">
                          <label
                            htmlFor="apply_pct"
                            className="text-sm font-medium text-purple-900"
                          >
                            Aplicar % a todos:
                          </label>
                          <input
                            id="apply_pct"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={pctInput}
                            onChange={(e) => setPctInput(e.target.value)}
                            className="block w-24 rounded-md bg-white px-2 py-1 text-sm text-gray-900 outline-1 -outline-offset-1 outline-purple-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple-700"
                          />
                          <span className="text-sm text-purple-900">%</span>
                          <button
                            type="button"
                            onClick={handleReapply}
                            className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                          >
                            Reaplicar a la tabla
                          </button>
                          <p className="text-xs text-purple-900 w-full">
                            Cada fila se puede editar individualmente abajo.
                          </p>
                        </div>

                        {/* Table */}
                        {rows.length === 0 ? (
                          <p className="text-center text-sm text-gray-500 py-8">
                            No hay pagos pendientes para este estudiante.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                    Tipo
                                  </th>
                                  <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                    Detalle
                                  </th>
                                  <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                    Vence
                                  </th>
                                  <th className="py-2 px-2 text-right font-semibold text-gray-900">
                                    Actual
                                  </th>
                                  <th className="py-2 px-2 text-right font-semibold text-gray-900">
                                    Pagado
                                  </th>
                                  <th className="py-2 px-2 text-right font-semibold text-gray-900">
                                    Nuevo monto
                                  </th>
                                  <th className="py-2 px-2 text-center font-semibold text-gray-900">
                                    Omitir
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {rows.map((row, idx) => {
                                  const p = row.payment;
                                  const amt = parseInt(row.amount, 10);
                                  const invalid =
                                    !row.skip &&
                                    (isNaN(amt) || amt < p.amount_paid);
                                  const detail = p.course_enrollment_info
                                    ? `${
                                        p.course_enrollment_info.course_code ||
                                        ""
                                      } ${
                                        p.course_enrollment_info.course_name ||
                                        ""
                                      }`
                                    : p.instrument_loan_info
                                      ? `${
                                          p.instrument_loan_info
                                            .instrument_type || "Instrumento"
                                        } #${
                                          p.instrument_loan_info
                                            .serial_number || "—"
                                        }`
                                      : p.description || "—";
                                  return (
                                    <tr
                                      key={p.id}
                                      className={
                                        row.skip
                                          ? "bg-gray-50 opacity-60"
                                          : "bg-white"
                                      }
                                    >
                                      <td className="py-2 px-2 whitespace-nowrap">
                                        <span
                                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                            PAYMENT_TYPE_COLOR[
                                              p.payment_type
                                            ] ||
                                            "bg-gray-50 text-gray-700 ring-gray-500/20"
                                          }`}
                                        >
                                          {PAYMENT_TYPE_LABEL[p.payment_type] ||
                                            p.payment_type}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2 text-gray-700 max-w-xs">
                                        <div className="truncate" title={detail}>
                                          {detail}
                                        </div>
                                      </td>
                                      <td className="py-2 px-2 text-gray-500 whitespace-nowrap">
                                        {p.late_due || "—"}
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-700 whitespace-nowrap">
                                        {formatCurrency(p.current_amount)}
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-500 whitespace-nowrap">
                                        {formatCurrency(p.amount_paid)}
                                      </td>
                                      <td className="py-2 px-2 text-right">
                                        <input
                                          type="number"
                                          min={p.amount_paid}
                                          step={1}
                                          value={row.amount}
                                          disabled={row.skip}
                                          onChange={(e) => {
                                            const next = [...rows];
                                            next[idx] = {
                                              ...next[idx],
                                              amount: e.target.value,
                                            };
                                            setRows(next);
                                          }}
                                          className={`block w-28 rounded-md px-2 py-1 text-sm text-right outline-1 -outline-offset-1 ${
                                            row.skip
                                              ? "bg-gray-100 text-gray-400 outline-gray-200 cursor-not-allowed"
                                              : invalid
                                                ? "outline-red-500 bg-white text-gray-900"
                                                : "outline-gray-300 bg-white text-gray-900 focus-visible:outline-2 focus-visible:outline-purple-700"
                                          }`}
                                        />
                                        {invalid && (
                                          <p className="mt-1 text-[10px] text-red-600">
                                            ≥ pagado
                                          </p>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-center">
                                        <input
                                          type="checkbox"
                                          checked={row.skip}
                                          onChange={(e) => {
                                            const next = [...rows];
                                            next[idx] = {
                                              ...next[idx],
                                              skip: e.target.checked,
                                            };
                                            setRows(next);
                                          }}
                                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Footer totals */}
                        {rows.length > 0 && (
                          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">
                                Total original
                              </p>
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(totals.original)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">
                                Total nuevo
                              </p>
                              <p className="font-semibold text-purple-700">
                                {formatCurrency(totals.nuevo)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Ahorro</p>
                              <p className="font-semibold text-emerald-700">
                                {formatCurrency(totals.savings)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-4 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      disabled={
                        !preview ||
                        rows.length === 0 ||
                        !validRows ||
                        isApplying
                      }
                      onClick={() => setShowConfirm(true)}
                      className="inline-flex justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aplicar a pagos
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation */}
      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        className="relative z-60"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-60 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-purple-100 sm:mx-0 sm:size-10">
                  <InformationCircleIcon className="size-6 text-purple-700" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar aplicación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Se actualizarán {rows.filter((r) => !r.skip).length}{" "}
                      pago(s). El monto original quedará registrado en la nota
                      de cada pago. ¿Deseas continuar?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isApplying}
                  className="inline-flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 sm:w-auto"
                >
                  {isApplying ? "Aplicando..." : "Aplicar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isApplying}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto"
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
              <Transition show={showSuccess}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <CheckCircleIcon className="size-6 text-purple-700" />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Descuento aplicado
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los pagos seleccionados se actualizaron.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowSuccess(false)}
                          className="inline-flex rounded-md text-gray-400 hover:text-gray-500"
                        >
                          <XMarkIconSolid className="size-5" />
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

      {/* Error Notification */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showError}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <XCircleIcon className="size-6 text-red-600" />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Error
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {errorMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowError(false)}
                          className="inline-flex rounded-md text-gray-400 hover:text-gray-500"
                        >
                          <XMarkIconSolid className="size-5" />
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

export default BecadoApplyDrawer;
