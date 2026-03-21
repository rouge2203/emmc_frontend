import React, { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { AxiosInstance } from "axios";
import { generatePaymentReport } from "../../utils/generatePaymentReport";

interface PrintPaymentReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableYears: number[];
  axiosPrivate: AxiosInstance;
  userName: string;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  enrollment: "Mensualidades",
  loan: "Alquileres",
  anualidad: "Matrícula",
  extra: "Extra",
};

const STATUS_LABELS: Record<string, string> = {
  "en espera": "En espera",
  completado: "Completado",
  incompleto: "Incompleto",
  vencido: "Vencido",
};

const PrintPaymentReportDrawer: React.FC<PrintPaymentReportDrawerProps> = ({
  isOpen,
  onClose,
  availableYears,
  axiosPrivate,
  userName,
}) => {
  const currentYear =
    availableYears.length > 0 ? String(availableYears[0]) : "";
  const [yearFilter, setYearFilter] = useState<string>(currentYear);
  const [periodFilter, setPeriodFilter] = useState<string>("1");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(10);
      setProgressLabel("Cargando datos...");

      const params: Record<string, string | number> = {
        page: 1,
        page_size: 10000,
      };
      const parsedYear = parseInt(yearFilter);
      const parsedPeriod = parseInt(periodFilter);
      if (!isNaN(parsedYear)) params.year = parsedYear;
      if (!isNaN(parsedPeriod)) params.period = parsedPeriod;
      if (paymentTypeFilter) params.payment_type = paymentTypeFilter;
      if (statusFilter === "vencido") {
        params.overdue = "true";
      } else if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await axiosPrivate.get("payments/manage-payments", {
        params,
      });

      setProgress(50);
      setProgressLabel("Generando PDF...");

      const payments = response.data.results;

      const filterLabels = {
        year: yearFilter || "Todos",
        period:
          { "1": "I", "2": "II", "3": "III" }[periodFilter] || periodFilter || "Todos",
        paymentType: paymentTypeFilter
          ? PAYMENT_TYPE_LABELS[paymentTypeFilter] || paymentTypeFilter
          : "Todos",
        status: statusFilter
          ? STATUS_LABELS[statusFilter] || statusFilter
          : "Todos",
      };

      await generatePaymentReport(payments, filterLabels, userName);

      setProgress(100);
      setProgressLabel("Completado");

      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
        setProgressLabel("");
      }, 1500);
    } catch (err: any) {
      console.error("Error generating report:", err);
      setError(err?.response?.data?.error || "Error al generar el reporte");
      setIsGenerating(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const handleClose = () => {
    if (isGenerating) return;
    setYearFilter(currentYear);
    setPeriodFilter("1");
    setPaymentTypeFilter("");
    setStatusFilter("");
    setProgress(0);
    setProgressLabel("");
    setError(null);
    onClose();
  };

  const chevronSvg = (
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
  );

  const selectClass =
    "col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6";

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-10">
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
                        Imprimir reporte de pagos
                      </DialogTitle>
                      <div className="ml-3 flex h-7 items-center">
                        <button
                          type="button"
                          onClick={handleClose}
                          disabled={isGenerating}
                          className="relative rounded-md text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
                        >
                          <span className="absolute -inset-2.5" />
                          <span className="sr-only">Cerrar panel</span>
                          <XMarkIcon aria-hidden="true" className="size-6" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-300">
                        Seleccione los filtros para generar el reporte de pagos
                        en PDF.
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-5 sm:px-6">
                    <div className="space-y-6">
                      {/* Year */}
                      <div>
                        <label
                          htmlFor="report-pay-year"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Año <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-pay-year"
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            disabled={isGenerating}
                            className={selectClass}
                          >
                            {availableYears.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                          {chevronSvg}
                        </div>
                      </div>

                      {/* Period */}
                      <div>
                        <label
                          htmlFor="report-pay-period"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Período <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-pay-period"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                            disabled={isGenerating}
                            className={selectClass}
                          >
                            <option value="1">I</option>
                            <option value="2">II</option>
                            <option value="3">III</option>
                          </select>
                          {chevronSvg}
                        </div>
                      </div>

                      {/* Payment Type */}
                      <div>
                        <label
                          htmlFor="report-pay-type"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Tipo de pago
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-pay-type"
                            value={paymentTypeFilter}
                            onChange={(e) =>
                              setPaymentTypeFilter(e.target.value)
                            }
                            disabled={isGenerating}
                            className={selectClass}
                          >
                            <option value="">Todos</option>
                            <option value="enrollment">Mensualidades</option>
                            <option value="loan">Alquileres</option>
                            <option value="anualidad">Matrícula</option>
                            <option value="extra">Extra</option>
                          </select>
                          {chevronSvg}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label
                          htmlFor="report-pay-status"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Estado
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-pay-status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            disabled={isGenerating}
                            className={selectClass}
                          >
                            <option value="">Todos</option>
                            <option value="vencido">Vencido</option>
                            <option value="en espera">En espera</option>
                            <option value="completado">Completado</option>
                            <option value="incompleto">Incompleto</option>
                          </select>
                          {chevronSvg}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {isGenerating && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">
                              {progressLabel}
                            </p>
                            <p className="text-sm text-gray-500">{progress}%</p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gray-900 h-2.5 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

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
                    onClick={handleClose}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    disabled={isGenerating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PrinterIcon className="size-4" />
                    {isGenerating ? "Generando..." : "Generar reporte"}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default PrintPaymentReportDrawer;
