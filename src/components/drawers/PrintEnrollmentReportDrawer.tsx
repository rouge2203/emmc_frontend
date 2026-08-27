import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import type { AxiosInstance } from "axios";
import {
  generateEnrollmentReport,
  generateProfessorReport,
} from "../../utils/generateEnrollmentReport";

interface Career {
  id: number;
  name: string;
}

interface Professor {
  id: number;
  first_name: string;
  last_name: string;
  enrollment_count: number;
}

interface PrintEnrollmentReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  careers: Career[];
  availableYears: number[];
  axiosPrivate: AxiosInstance;
  userName: string;
}

const PrintEnrollmentReportDrawer: React.FC<
  PrintEnrollmentReportDrawerProps
> = ({ isOpen, onClose, careers, availableYears, axiosPrivate, userName }) => {
  const currentYear =
    availableYears.length > 0 ? String(availableYears[0]) : "";
  const [yearFilter, setYearFilter] = useState<string>(currentYear);
  const [periodFilter, setPeriodFilter] = useState<string>("1");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [careerFilter, setCareerFilter] = useState<string>("");
  const [reportType, setReportType] = useState<"general" | "by_professor">(
    "general",
  );
  const [professorFilter, setProfessorFilter] = useState<string>("");
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoadingProfessors, setIsLoadingProfessors] = useState(false);
  const [professorsError, setProfessorsError] = useState<string | null>(null);
  // Off by default: the report prints at its usual size unless asked otherwise.
  const [largeText, setLargeText] = useState(false);

  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent mounts this drawer before availableYears has loaded, so the
  // useState initialiser above captures "". Adopt the newest year as soon as the
  // list arrives — otherwise parseInt("") sends year=NaN, which the API cannot
  // parse and silently drops, returning every year's enrollments. Only fills a
  // blank value, so an explicit choice by the user is never overridden.
  useEffect(() => {
    if (!yearFilter && availableYears.length > 0) {
      setYearFilter(String(availableYears[0]));
    }
  }, [availableYears, yearFilter]);

  // Only professors that actually have students under the selected filters can
  // produce a report, so the list is refetched whenever those filters change. The
  // request is aborted on cleanup, so a slow earlier response can never overwrite
  // the results of a newer one.
  useEffect(() => {
    if (!isOpen || reportType !== "by_professor") return;
    // year=NaN is dropped server-side and would widen the list to every year.
    const parsedYear = parseInt(yearFilter);
    if (!Number.isFinite(parsedYear)) return;

    const controller = new AbortController();

    const fetchProfessors = async () => {
      setIsLoadingProfessors(true);
      setProfessorsError(null);
      try {
        const params: Record<string, string | number> = {
          year: parsedYear,
          period: parseInt(periodFilter),
        };
        if (statusFilter) params.status = statusFilter;
        if (careerFilter) params.career_id = parseInt(careerFilter);

        const response = await axiosPrivate.get<{ professors: Professor[] }>(
          "courses/enrollment-professors",
          { params, signal: controller.signal },
        );
        const list = response.data.professors || [];
        setProfessors(list);
        // A professor chosen under the previous filters may have no students under
        // the new ones. Functional update on purpose: professorFilter has to stay
        // out of the dependency list or every choice would trigger a refetch.
        setProfessorFilter((current) =>
          current && !list.some((p) => String(p.id) === current) ? "" : current,
        );
        setIsLoadingProfessors(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error fetching professors:", err);
        setProfessors([]);
        setProfessorsError("Error al cargar los profesores");
        setIsLoadingProfessors(false);
      }
    };

    fetchProfessors();
    return () => controller.abort();
  }, [
    isOpen,
    reportType,
    yearFilter,
    periodFilter,
    statusFilter,
    careerFilter,
    axiosPrivate,
  ]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(10);
      setProgressLabel("Cargando datos...");

      const isByProfessor = reportType === "by_professor";

      const parsedYear = parseInt(yearFilter);
      if (!Number.isFinite(parsedYear)) {
        // Sending year=NaN would be dropped server-side and silently widen the
        // report to every year on record.
        setError("Seleccione un año para generar el reporte.");
        setIsGenerating(false);
        setProgress(0);
        setProgressLabel("");
        return;
      }

      const params: Record<string, string | number> = {
        page: 1,
        page_size: 10000,
        year: parsedYear,
        period: parseInt(periodFilter),
      };
      if (statusFilter) params.status = statusFilter;
      if (careerFilter) params.career_id = parseInt(careerFilter);
      if (isByProfessor) {
        params.report_schedules = "true";
        if (professorFilter) params.professor_id = parseInt(professorFilter);
      }

      const response = await axiosPrivate.get("courses/manage-enrollments", {
        params,
      });

      setProgress(50);
      setProgressLabel("Generando PDF...");

      const enrollments = response.data.results;

      const filterLabels = {
        year: yearFilter,
        period:
          { "1": "I", "2": "II", "3": "III" }[periodFilter] || periodFilter,
        status: statusFilter
          ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
          : "Todos",
        career:
          careers.find((c) => c.id === parseInt(careerFilter))?.name || "Todas",
      };

      // 1.5 = 50% larger type and spacing; both report types honour it.
      const scale = largeText ? 1.5 : 1;

      if (isByProfessor) {
        const selectedProfessor = professors.find(
          (p) => p.id === parseInt(professorFilter),
        );
        const professorLabel = professorFilter
          ? `${selectedProfessor?.last_name || ""} ${
              selectedProfessor?.first_name || ""
            }`.trim() || "—"
          : "Todos";
        await generateProfessorReport(
          enrollments,
          { ...filterLabels, professor: professorLabel },
          userName,
          scale,
        );
      } else {
        await generateEnrollmentReport(
          enrollments,
          filterLabels,
          userName,
          scale,
        );
      }

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
    setStatusFilter("");
    setCareerFilter("");
    setReportType("general");
    setProfessorFilter("");
    setProfessors([]);
    setIsLoadingProfessors(false);
    setProfessorsError(null);
    setLargeText(false);
    setProgress(0);
    setProgressLabel("");
    setError(null);
    onClose();
  };

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
                        Imprimir reporte
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
                        Seleccione los filtros para generar el reporte en PDF.
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-5 sm:px-6">
                    <div className="space-y-6">
                      {/* Report type */}
                      <div>
                        <label
                          htmlFor="report-type"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Tipo de reporte <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-type"
                            value={reportType}
                            onChange={(e) =>
                              setReportType(
                                e.target.value as "general" | "by_professor",
                              )
                            }
                            disabled={isGenerating}
                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          >
                            <option value="general">General</option>
                            <option value="by_professor">Por profesor</option>
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

                      {/* Year */}
                      <div>
                        <label
                          htmlFor="report-year"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Año <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-year"
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            disabled={isGenerating}
                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          >
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

                      {/* Period */}
                      <div>
                        <label
                          htmlFor="report-period"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Período <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-period"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                            disabled={isGenerating}
                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          >
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

                      {/* Status */}
                      <div>
                        <label
                          htmlFor="report-status"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Estado
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            disabled={isGenerating}
                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          >
                            <option value="">Todos</option>
                            <option value="cursando">Cursando</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="reprobado">Reprobado</option>
                            <option value="retirado">Retirado</option>
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

                      {/* Career */}
                      <div>
                        <label
                          htmlFor="report-career"
                          className="block text-sm/6 font-medium text-gray-900"
                        >
                          Carrera
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                          <select
                            id="report-career"
                            value={careerFilter}
                            onChange={(e) => setCareerFilter(e.target.value)}
                            disabled={isGenerating}
                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          >
                            <option value="">Todas las carreras</option>
                            {careers.map((career) => (
                              <option key={career.id} value={career.id}>
                                {career.name}
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

                      {/* Professor — the options are scoped to the filters above */}
                      {reportType === "by_professor" && (
                        <div>
                          <label
                            htmlFor="report-professor"
                            className="block text-sm/6 font-medium text-gray-900"
                          >
                            Profesor
                          </label>
                          {isLoadingProfessors ? (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                              Cargando profesores...
                            </div>
                          ) : professors.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">
                              Ningún profesor tiene estudiantes con los filtros
                              seleccionados.
                            </p>
                          ) : (
                            <>
                              <div className="mt-2 grid grid-cols-1">
                                <select
                                  id="report-professor"
                                  value={professorFilter}
                                  onChange={(e) =>
                                    setProfessorFilter(e.target.value)
                                  }
                                  disabled={isGenerating}
                                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                >
                                  <option value="">Todos los profesores</option>
                                  {professors.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {`${p.last_name || ""} ${
                                        p.first_name || ""
                                      }`.trim()}{" "}
                                      ({p.enrollment_count})
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
                              <p className="mt-1 text-sm text-gray-500">
                                Entre paréntesis, la cantidad de matrículas con
                                los filtros seleccionados.
                              </p>
                            </>
                          )}
                          {professorsError && (
                            <p className="mt-1 text-sm text-red-600">
                              {professorsError}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Larger text — applies to both types of report */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 shrink-0 items-center">
                          <input
                            id="report-large-text"
                            type="checkbox"
                            checked={largeText}
                            onChange={(e) => setLargeText(e.target.checked)}
                            disabled={isGenerating}
                            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="report-large-text"
                            className="block text-sm/6 font-medium text-gray-900"
                          >
                            Texto más grande
                          </label>
                          <p className="text-sm text-gray-500">
                            Aumenta el tamaño del texto un 50%. El reporte puede
                            ocupar más páginas.
                          </p>
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

export default PrintEnrollmentReportDrawer;
