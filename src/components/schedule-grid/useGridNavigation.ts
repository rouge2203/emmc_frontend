// Keyboard-navigation state machine for the excel-like schedule grid. Owns the
// single active cell, the edit-mode flag, focus/scroll side effects and the
// nav-mode key handler. The pure "where does it move?" math lives in
// navigation.ts; this hook wires it to state, refs and the DOM.
//
// Design notes for the editors added here and in Task 10:
//  - every callback returned (setActive/startEdit/stopEdit/move/moveTab/
//    onGridKeyDown/registerNavActions) is referentially STABLE across renders
//    so GridRowView stays memoized. Handlers read the live rows/active/editing
//    through refs instead of closing over them.
//  - `registerNavActions` lets the page declare what Delete and "start typing"
//    should do per cell type (canEdit gates edit-mode entry; onDeleteCell
//    clears a cell). Task 10 broadens canEdit to the time/aula columns.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { cellDomId } from "./cellIds";
import {
  arrowTarget,
  gridEdgeTarget,
  pageTarget,
  rowEdgeTarget,
  tabTarget,
} from "./navigation";
import type { CellAddress, ColKey, GridRow, MoveDir } from "./types";
import type { HorarioEditorTarget } from "./horarioEditorTarget";

/** seed = the first typed char (Excel replace-typing), or null (Enter/F2/click keep the cell's content). */
export interface EditingState {
  col: ColKey;
  seed: string | null;
  /** Entered by a mouse click → the cell's editor opens its dropdown (showPicker). */
  viaMouse: boolean;
  /** Nested horario control that was clicked; null for keyboard-driven editing. */
  target: HorarioEditorTarget | null;
}

export interface NavActions {
  /** Delete/Backspace in nav mode. */
  onDeleteCell: (a: CellAddress) => void;
  /** Whether the cell can enter edit mode with this seed (false → the page may show a hint). */
  canEdit: (a: CellAddress, seed: string | null) => boolean;
}

export interface UseGridNavigationResult {
  active: CellAddress | null;
  setActive: (a: CellAddress | null) => void;
  editing: EditingState | null;
  startEdit: (
    seed: string | null,
    viaMouse?: boolean,
    target?: HorarioEditorTarget | null,
  ) => void;
  stopEdit: () => void;
  move: (dir: MoveDir) => void;
  moveTab: (backwards: boolean) => boolean;
  /** Keyboard-only start: if nothing is active, select the first visible cell (prof col). */
  ensureActive: () => void;
  gridRef: RefObject<HTMLDivElement | null>;
  onGridKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  registerNavActions: (a: NavActions) => void;
}

export function useGridNavigation(visibleRows: GridRow[]): UseGridNavigationResult {
  const [active, setActiveState] = useState<CellAddress | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const navActionsRef = useRef<NavActions | null>(null);

  // Live mirrors read by the stable event handlers.
  const activeRef = useRef<CellAddress | null>(null);
  const rowsRef = useRef<GridRow[]>(visibleRows);
  rowsRef.current = visibleRows;
  const editingRef = useRef<EditingState | null>(editing);
  editingRef.current = editing;

  // Every active change flows through this setter so activeRef is always in
  // sync synchronously (dblclick reads it right after setting it).
  const setActive = useCallback((a: CellAddress | null) => {
    activeRef.current = a;
    setActiveState(a);
  }, []);

  const registerNavActions = useCallback((a: NavActions) => {
    navActionsRef.current = a;
  }, []);

  const rowIndexById = useMemo(() => {
    const m = new Map<number, number>();
    visibleRows.forEach((r, i) => m.set(r.enrollmentId, i));
    return m;
  }, [visibleRows]);

  // If the active row disappeared from the visible set (filtering), fall back
  // to the first visible row keeping the col, or null when empty. Any in-flight
  // edit on the vanished row is dropped.
  useEffect(() => {
    const a = activeRef.current;
    if (a && !rowIndexById.has(a.enrollmentId)) {
      const first = visibleRows[0];
      setActive(first ? { enrollmentId: first.enrollmentId, col: a.col } : null);
      setEditing(null);
    }
  }, [rowIndexById, visibleRows, setActive]);

  // Keep the active cell scrolled into view (after paint so its node exists).
  useEffect(() => {
    if (!active) return;
    const id = cellDomId(active);
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);

  // Leaving edit mode returns focus to the grid container (never on mount), but
  // only when focus is "loose" (on <body>/nothing after the editor unmounted) or
  // still inside the grid — never steal focus from another control the user just
  // clicked (search box, selects, Notify button).
  const prevEditing = useRef<EditingState | null>(null);
  useEffect(() => {
    if (prevEditing.current !== null && editing === null) {
      const grid = gridRef.current;
      const activeEl = document.activeElement;
      const focusIsLoose = activeEl === null || activeEl === document.body;
      const focusInGrid = !!grid && !!activeEl && grid.contains(activeEl);
      if (grid && (focusIsLoose || focusInGrid)) grid.focus({ preventScroll: true });
    }
    prevEditing.current = editing;
  }, [editing]);

  const startEdit = useCallback((
    seed: string | null,
    viaMouse = false,
    target: HorarioEditorTarget | null = null,
  ) => {
    const a = activeRef.current;
    if (!a) return;
    setEditing({ col: a.col, seed, viaMouse, target });
  }, []);

  const stopEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const move = useCallback((dir: MoveDir) => {
    if (dir === "none") return;
    const a = activeRef.current;
    if (!a) return;
    // Tab commits wrap at row edges (tabTarget); arrows clamp inside the grid.
    const next =
      dir === "tabNext" || dir === "tabPrev"
        ? tabTarget(a, dir === "tabPrev", rowsRef.current)
        : arrowTarget(a, dir, rowsRef.current);
    if (next) setActive(next);
  }, [setActive]);

  // Keyboard-only start: tabbing/focusing into an empty grid selects the first
  // visible cell so arrow keys work immediately. Reads activeRef synchronously
  // so a click that just set the active cell is never overridden.
  const ensureActive = useCallback(() => {
    if (activeRef.current !== null) return;
    const first = rowsRef.current[0];
    if (first) setActive({ enrollmentId: first.enrollmentId, col: "prof" });
  }, [setActive]);

  const moveTab = useCallback(
    (backwards: boolean): boolean => {
      const a = activeRef.current;
      if (!a) return false;
      const next = tabTarget(a, backwards, rowsRef.current);
      if (next) {
        setActive(next);
        return true;
      }
      return false;
    },
    [setActive],
  );

  const onGridKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // Only handle events fired on the grid container itself. Keys bubbling up
      // from the editor (e.target !== e.currentTarget) belong to the editor.
      if (e.target !== e.currentTarget) return;
      if (editingRef.current) return; // editor owns keys in edit mode
      const a = activeRef.current;
      if (!a) return;
      const rows = rowsRef.current;
      const actions = navActionsRef.current;
      const go = (next: CellAddress | null): void => {
        if (next) setActive(next);
      };

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          return go(arrowTarget(a, "left", rows));
        case "ArrowRight":
          e.preventDefault();
          return go(arrowTarget(a, "right", rows));
        case "ArrowUp":
          e.preventDefault();
          return go(arrowTarget(a, "up", rows));
        case "ArrowDown":
          e.preventDefault();
          return go(arrowTarget(a, "down", rows));
        case "Home":
          e.preventDefault();
          return go(
            e.ctrlKey || e.metaKey ? gridEdgeTarget(a, false, rows) : rowEdgeTarget(a, false),
          );
        case "End":
          e.preventDefault();
          return go(
            e.ctrlKey || e.metaKey ? gridEdgeTarget(a, true, rows) : rowEdgeTarget(a, true),
          );
        case "PageUp":
          e.preventDefault();
          return go(pageTarget(a, false, rows));
        case "PageDown":
          e.preventDefault();
          return go(pageTarget(a, true, rows));
        case "Tab": {
          // preventDefault only when we actually moved; otherwise let focus
          // leave the grid naturally (first/last cell).
          if (moveTab(e.shiftKey)) e.preventDefault();
          return;
        }
        case "Enter":
        case "F2":
          if (actions?.canEdit(a, null)) {
            e.preventDefault();
            startEdit(null);
          }
          return;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          actions?.onDeleteCell(a);
          return;
        case "Escape":
          return; // no-op in nav mode
        case " ":
          e.preventDefault(); // swallow the page scroll
          return;
        default:
          // Printable single character → Excel replace-typing.
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (actions?.canEdit(a, e.key)) {
              e.preventDefault();
              startEdit(e.key);
            }
          }
          return;
      }
    },
    [setActive, moveTab, startEdit],
  );

  return {
    active,
    setActive,
    editing,
    startEdit,
    stopEdit,
    move,
    moveTab,
    ensureActive,
    gridRef,
    onGridKeyDown,
    registerNavActions,
  };
}
