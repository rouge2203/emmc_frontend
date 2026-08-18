import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent } from "react";
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
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import ScheduleGrid from "../../components/schedule-grid/ScheduleGrid";
import GridToast from "../../components/schedule-grid/GridToast";
import KeyboardLegend from "../../components/schedule-grid/KeyboardLegend";
import NotifyPendingButton from "../../components/schedule-grid/NotifyPendingButton";
import NotifyPreviewDialog from "../../components/schedule-grid/NotifyPreviewDialog";
import { computeConflicts } from "../../components/schedule-grid/conflicts";
import { useGridData } from "../../components/schedule-grid/useGridData";
import { useGridNavigation } from "../../components/schedule-grid/useGridNavigation";
import { useAutosave } from "../../components/schedule-grid/useAutosave";
import { useGridCommits } from "../../components/schedule-grid/useGridCommits";
import { useNotificationSummary } from "../../components/schedule-grid/useNotificationSummary";
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

  const axiosPrivate = useAxiosPrivate();

  // The pending-notification summary/button/preview + per-row envelope icon.
  // Polls on its own; a save that leaves a row pending (see useGridCommits)
  // triggers a debounced refresh so the count/preview/icon catch up quickly
  // without every keystroke hammering the endpoint.
  const notif = useNotificationSummary();
  const [previewOpen, setPreviewOpen] = useState(false);

  // Autosave (per-cell status + error toast). Declared before useGridData so its
  // `idle` awaiter can gate every (re)fetch behind a drained save queue.
  const { save, rowStatuses, setHint, setTransientError, idle, pending, toast, dismissToast, showToast } =
    useAutosave({ onSaved: notif.refresh });

  const { rows, setRows, rowsRef, snapshot, loading, error, truncated, reload, ref, refError } =
    useGridData({
      year: yearFilter,
      period: periodFilter,
      beforeReload: idle,
    });

  // Client-side filters (search is live; the "missing" toggles are mutually
  // exclusive and their membership is frozen from the load-time snapshot).
  const [search, setSearch] = useState("");
  const [careerId, setCareerId] = useState<number | null>(null);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [missingProfessor, setMissingProfessor] = useState(false);
  const [missingSchedule, setMissingSchedule] = useState(false);

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

  // Aula/professor double-booking warnings, swept across ALL rows (not just the
  // visible ones — a conflict can be with a row that a filter hid). Re-runs on
  // every optimistic edit; returns fresh objects only for conflicting rows so
  // the memoized grid rows stay put.
  const conflicts = useMemo(() => computeConflicts(rows), [rows]);

  // Keyboard navigation (one active cell, arrows/Tab/Enter/typing) and autosave
  // (per-cell status + error toast). All callbacks below are stable so the
  // memoized grid rows never re-render just because selection or a save moved.
  const {
    active,
    setActive,
    editing,
    startEdit,
    stopEdit,
    move,
    ensureActive,
    gridRef,
    onGridKeyDown,
    registerNavActions,
  } = useGridNavigation(visibleRows);

  // Reuse the page's autosave error toast for send() failures (load-summary
  // failures share the same `error` field but are comparatively rare/quiet —
  // this only re-fires when the message actually changes, so a long-lived
  // polling outage doesn't spam the toast every cycle).
  useEffect(() => {
    if (notif.error) showToast(notif.error, "error");
  }, [notif.error, showToast]);

  // A batch that finished cleanly (no failures) means every row that was
  // pending when it started is now genuinely notified server-side — clear the
  // envelope icons locally instead of calling reload() (which would reorder
  // rows mid-assignment). A batch with failures, or one still visible from
  // before this admin's tab opened, leaves the icons as-is; a later
  // "Recargar" resyncs them from the server. This can, in principle, also
  // clear a row that became pending again *after* the batch was dispatched
  // (a rare race) — accepted per the brief; Recargar is the source of truth.
  useEffect(() => {
    if (notif.justFinished?.status === "done" && notif.justFinished.failed_count === 0) {
      setRows((current) =>
        current.map((r) => (r.notificationPending ? { ...r, notificationPending: false } : r)),
      );
    }
  }, [notif.justFinished, setRows]);

  const [gridHasFocus, setGridHasFocus] = useState(false);
  const onGridFocus = useCallback(() => {
    setGridHasFocus(true);
    // Keyboard-only start: tabbing into an empty grid selects the first cell so
    // arrow keys work right away (a click already set active, so this is a no-op).
    ensureActive();
  }, [ensureActive]);
  const onGridBlur = useCallback((e: FocusEvent<HTMLDivElement>) => {
    // Keep focus "on" while it stays inside the grid (e.g. into the editor).
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setGridHasFocus(false);
  }, []);

  // Warn before leaving/reloading the tab while saves are still queued, so an
  // in-flight autosave isn't lost.
  useEffect(() => {
    if (pending === 0) return;
    const handler = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pending]);

  // Delete-undo toast (info variant with a "Deshacer" action, 6 s). Page-owned
  // because it is not tied to a queued save the way the error toast is.
  const [undoToast, setUndoToast] = useState<{
    show: boolean;
    message: string;
    onUndo: (() => void) | null;
  }>({ show: false, message: "", onUndo: null });
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoToast({ show: true, message, onUndo });
    undoTimer.current = setTimeout(() => setUndoToast((t) => ({ ...t, show: false })), 6000);
  }, []);
  const dismissUndo = useCallback(() => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setUndoToast((t) => ({ ...t, show: false }));
  }, []);
  const handleUndo = useCallback(() => {
    undoToast.onUndo?.();
    dismissUndo();
  }, [undoToast, dismissUndo]);
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  // Optimistic commit handlers (professor/time/aula + delete/undo). Every one
  // updates the row now, saves in the background and reverts on failure;
  // navigation never waits for the network.
  const {
    commitProfessor,
    commitTime,
    commitAula,
    cancelEdit,
    cancelTime,
    onDeleteCell,
    canEdit,
  } = useGridCommits({
    axiosPrivate,
    teacherById: ref.teacherById,
    rowsRef,
    setRows,
    save,
    setHint,
    setTransientError,
    stopEdit,
    move,
    showUndoToast,
  });

  const onCellDoubleClick = useCallback(
    (address: CellAddress) => {
      setActive(address);
      // canEdit shows the aula "add a schedule first" hint when appropriate.
      if (canEdit(address)) startEdit(null);
    },
    [setActive, canEdit, startEdit],
  );

  useEffect(() => {
    registerNavActions({ onDeleteCell, canEdit });
  }, [registerNavActions, onDeleteCell, canEdit]);

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
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <ExclamationTriangleIcon className="size-3.5 text-amber-500" aria-hidden="true" />
              conflicto de aula/profesor (solo aviso)
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-6 sm:flex-none flex items-start gap-3">
          <span className="mt-2 text-xs text-gray-500">
            {visibleRows.length} de {rows.length} matrículas
          </span>
          <NotifyPendingButton
            summary={notif.summary}
            sending={notif.sending}
            justFinished={notif.justFinished}
            onSend={notif.send}
            onOpenPreview={() => setPreviewOpen(true)}
          />
          {pending > 0 && (
            <span className="mt-2 text-xs text-amber-600">
              Guardando {pending} {pending === 1 ? "cambio" : "cambios"}…
            </span>
          )}
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading || pending > 0}
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

      {/* Keyboard shortcuts legend (collapsible) */}
      <KeyboardLegend />

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
            active={active}
            editing={editing}
            gridHasFocus={gridHasFocus}
            onCellMouseDown={setActive}
            onCellDoubleClick={onCellDoubleClick}
            onKeyDown={onGridKeyDown}
            onGridFocus={onGridFocus}
            onGridBlur={onGridBlur}
            rowStatuses={rowStatuses}
            conflicts={conflicts}
            onCommitProfessor={commitProfessor}
            onCommitTime={commitTime}
            onCancelTime={cancelTime}
            onCommitAula={commitAula}
            onCancelEdit={cancelEdit}
            gridRef={gridRef}
          />
        )}
      </div>

      <GridToast
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={dismissToast}
      />
      <GridToast
        show={undoToast.show}
        message={undoToast.message}
        variant="info"
        action={undoToast.onUndo ? { label: "Deshacer", onClick: handleUndo } : undefined}
        onClose={dismissUndo}
      />
      <NotifyPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        summary={notif.summary}
        sending={notif.sending}
        onSend={notif.send}
      />
    </div>
  );
}
