import { useCallback, useMemo, useRef, useState } from "react";
import {
  TableCellsIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import ScheduleGrid from "../../components/schedule-grid/ScheduleGrid";
import { useGridData } from "../../components/schedule-grid/useGridData";
import { filterRows, liveCounts } from "../../components/schedule-grid/filters";
import type { GridFilters } from "../../components/schedule-grid/filters";
import type { CellAddress } from "../../components/schedule-grid/types";

// The grid always shows one academic year; it opens on the current one. Year
// and period are the main view selectors — they are NOT reset by "Limpiar
// filtros" (a year is always selected).
const DEFAULT_YEAR = new Date().getFullYear();

const PERIOD_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Todos" },
  { value: 1, label: "I" },
  { value: 2, label: "II" },
  { value: 3, label: "III" },
];

export default function ScheduleAssignment() {
  const [yearFilter, setYearFilter] = useState<number>(DEFAULT_YEAR);
  // null = every period of the selected year.
  const [periodFilter, setPeriodFilter] = useState<number | null>(null);

  const { rows, snapshot, loading, error, truncated, reload, ref, refError } = useGridData({
    year: yearFilter,
    period: periodFilter,
  });

  // Client-side filters (search is live; the "missing" toggles are mutually
  // exclusive and their membership is frozen from the load-time snapshot).
  const [search, setSearch] = useState("");
  const [careerId, setCareerId] = useState<number | null>(null);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [missingProfessor, setMissingProfessor] = useState(false);
  const [missingSchedule, setMissingSchedule] = useState(false);

  // Selection lives here for now; Task 9 replaces it with useGridNavigation.
  const [activeCell, setActiveCell] = useState<CellAddress | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const onCellMouseDown = useCallback((address: CellAddress) => {
    setActiveCell(address);
  }, []);

  // Career filter compares NAMES (see filters.ts), resolved from the id here.
  const careerName = useMemo(
    () => ref.careers.find((c) => c.id === careerId)?.name ?? null,
    [ref.careers, careerId],
  );
  const filters: GridFilters = useMemo(
    () => ({ search, careerName, professorId, missingProfessor, missingSchedule }),
    [search, careerName, professorId, missingProfessor, missingSchedule],
  );
  const visibleRows = useMemo(
    () => filterRows(rows, filters, snapshot),
    [rows, filters, snapshot],
  );
  const counts = useMemo(() => liveCounts(rows), [rows]);

  const toggleMissingProfessor = () => {
    setMissingProfessor((v) => !v);
    setMissingSchedule(false);
  };
  const toggleMissingSchedule = () => {
    setMissingSchedule((v) => !v);
    setMissingProfessor(false);
  };

  const clearFilters = () => {
    setSearch("");
    setCareerId(null);
    setProfessorId(null);
    setMissingProfessor(false);
    setMissingSchedule(false);
  };

  const hasActiveFilters =
    search !== "" ||
    careerId !== null ||
    professorId !== null ||
    missingProfessor ||
    missingSchedule;

  // Always offer the selected year even if the years endpoint hasn't answered.
  const yearOptions = ref.years.includes(yearFilter)
    ? ref.years
    : [yearFilter, ...ref.years].sort((a, b) => b - a);

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-start">
        <div className="sm:flex-auto flex items-start gap-2">
          <TableCellsIcon className="lg:size-6 size-9 h-full text-gray-700" />
          <div>
            <h1 className="text-sm text-gray-700">Asignación de Horarios</h1>
            <p className="mt-1 text-xs text-gray-500">
              Asigne profesor, horarios y aula a cada matrícula. Los cambios se guardan
              automáticamente.
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-6 sm:flex-none flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {visibleRows.length} de {rows.length} matrículas
          </span>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 shadow-xs hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </button>
        </div>
      </div>

      {/* Main selectors: year + period */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="sm:w-44">
          <label
            htmlFor="scheduleYear"
            className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Año
          </label>
          <div className="mt-1 grid grid-cols-1">
            <select
              id="scheduleYear"
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value, 10))}
              className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2.5 pr-10 pl-4 text-lg font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              data-slot="icon"
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-500"
            >
              <path
                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
                fillRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <span
            id="schedulePeriodLabel"
            className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Período
          </span>
          <div
            role="group"
            aria-labelledby="schedulePeriodLabel"
            className="mt-1 flex w-full rounded-md shadow-xs isolate sm:inline-flex sm:w-auto"
          >
            {PERIOD_OPTIONS.map((option, index, all) => {
              const isActive = periodFilter === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setPeriodFilter(option.value)}
                  aria-pressed={isActive}
                  className={`relative -ml-px flex-1 px-4 py-2.5 text-base font-semibold ring-1 ring-inset focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-colors sm:flex-none sm:px-8 sm:text-lg ${
                    index === 0 ? "ml-0 rounded-l-md" : ""
                  } ${index === all.length - 1 ? "rounded-r-md" : ""} ${
                    isActive
                      ? "z-10 bg-primary text-white ring-primary hover:bg-primary/90"
                      : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 mt-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Filtros</h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <XMarkIcon className="h-4 w-4" />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label
                htmlFor="scheduleSearch"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Buscar por estudiante
              </label>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="scheduleSearch"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, apellido, código o nombre del curso..."
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                />
                {search !== "" && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Limpiar búsqueda</span>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Career Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="scheduleCareer"
                className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <HiOutlineBuildingLibrary className="h-4 w-4" />
                Carrera
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="scheduleCareer"
                  value={careerId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCareerId(value ? parseInt(value, 10) : null);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todas las carreras</option>
                  {ref.careers.map((career) => (
                    <option key={career.id} value={career.id}>
                      {career.name}
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
            </div>

            {/* Professor Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="scheduleProfessor"
                className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <UserIcon className="h-4 w-4" />
                Profesor/a
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="scheduleProfessor"
                  value={professorId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProfessorId(value ? parseInt(value, 10) : null);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos los profesores</option>
                  {ref.teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.last_name} {teacher.first_name}
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
            </div>
          </div>

          {/* Toggle cards */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border ${
                missingProfessor
                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon
                  className={`size-4 ${missingProfessor ? "text-red-500" : "text-red-400"}`}
                />
                <p className="text-xs font-medium text-gray-900">
                  {counts.missingProfessor} estudiantes faltan de asignar profesor
                </p>
              </div>
              {counts.missingProfessor > 0 && (
                <button
                  type="button"
                  onClick={toggleMissingProfessor}
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    missingProfessor
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {missingProfessor ? "Ocultar" : "Ver"}
                </button>
              )}
            </div>
            <div
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border ${
                missingSchedule
                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon
                  className={`h-4 w-4 ${missingSchedule ? "text-yellow-500" : "text-yellow-400"}`}
                />
                <p className="text-xs font-medium text-gray-900">
                  {counts.missingSchedule} estudiantes faltan de asignar horario
                </p>
              </div>
              {counts.missingSchedule > 0 && (
                <button
                  type="button"
                  onClick={toggleMissingSchedule}
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    missingSchedule
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {missingSchedule ? "Ocultar" : "Ver"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Truncated banner */}
      {truncated && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">
            Mostrando {truncated.shown} de {truncated.total} matrículas. Elija un período para ver
            todas.
          </p>
        </div>
      )}

      {/* Error banners */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {refError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{refError}</p>
        </div>
      )}

      {/* Grid */}
      <div className="mt-2">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Cargando matrículas...</p>
            </div>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">
              No hay matrículas cursando para los filtros seleccionados.
            </p>
          </div>
        ) : (
          <ScheduleGrid
            rows={visibleRows}
            refData={ref}
            active={activeCell}
            onCellMouseDown={onCellMouseDown}
            gridRef={gridRef}
          />
        )}
      </div>
    </div>
  );
}
