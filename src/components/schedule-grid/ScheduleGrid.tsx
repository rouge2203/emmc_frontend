// The excel-like grid shell: a scrollable, focusable role="grid" container with
// a sticky header and one memoized GridRowView per row. It renders the active-
// cell styling, forwards keyboard/focus/mouse to useGridNavigation, and threads
// per-row edit + autosave props down. The container is the ONLY focusable grid
// element in nav mode; the editor takes focus in edit mode.
import {
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import type {
  CellAddress,
  CellSaveState,
  ColKey,
  GridRow,
  MoveDir,
  SlotIndex,
  TimeRangeValue,
} from "./types";
import type { GridRefData } from "./useGridData";
import type { ConflictIndex } from "./conflicts";
import { cellDomId } from "./cellIds";
import type { RenderCell } from "./cellIds";
import type { EditingState } from "./useGridNavigation";
import GridRowView from "./GridRowView";
import {
  hasCrossedDragThreshold,
  nextHorizontalScrollLeft,
  type PointerPosition,
} from "./horizontalDrag";
import type { HorarioEditorTarget } from "./horarioEditorTarget";

export interface ScheduleGridProps {
  rows: GridRow[];
  refData: GridRefData;
  active: CellAddress | null;
  editing: EditingState | null;
  /** Grid container has focus → primary selection ring; else gray inactive ring. */
  gridHasFocus: boolean;
  onCellMouseDown: (address: CellAddress) => void;
  onCellClick: (address: CellAddress, target?: HorarioEditorTarget) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onGridFocus: (e: FocusEvent<HTMLDivElement>) => void;
  onGridBlur: (e: FocusEvent<HTMLDivElement>) => void;
  /** Returns this row's autosave statuses (stable ref per row for memo). */
  rowStatuses: (enrollmentId: number) => Partial<Record<ColKey, CellSaveState>> | undefined;
  /** Aula/professor double-bookings across the whole (unfiltered) year. */
  conflicts: ConflictIndex;
  onCommitProfessor: (enrollmentId: number, teacherId: number | null, move: MoveDir) => void;
  onCommitTime: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    value: TimeRangeValue,
    move: MoveDir,
  ) => void;
  onCancelTime: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    move: MoveDir,
    error?: string,
  ) => void;
  onCommitAula: (
    enrollmentId: number,
    slotIndex: SlotIndex,
    classroomId: number | null,
    move: MoveDir,
  ) => void;
  onCancelEdit: (move: MoveDir) => void;
  onRequestDeleteSlot?: (enrollmentId: number, slotIndex: SlotIndex) => void;
  gridRef?: RefObject<HTMLDivElement | null>;
  renderCell?: RenderCell;
}

const HEADERS = ["Info", "Profesor", "Horario 1", "Horario 2", "Horario 3"];
const DRAG_EXCLUDED_SELECTOR = "select, button, input, textarea, a, [data-editor]";

interface HorizontalDragState {
  pointerId: number;
  start: PointerPosition;
  initialScrollLeft: number;
  moved: boolean;
}

export default function ScheduleGrid({
  rows,
  refData,
  active,
  editing,
  gridHasFocus,
  onCellMouseDown,
  onCellClick,
  onKeyDown,
  onGridFocus,
  onGridBlur,
  rowStatuses,
  conflicts,
  onCommitProfessor,
  onCommitTime,
  onCancelTime,
  onCommitAula,
  onCancelEdit,
  onRequestDeleteSlot,
  gridRef,
  renderCell,
}: ScheduleGridProps) {
  const dragState = useRef<HorizontalDragState | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  // Mousedown anywhere outside an editor: suppress text selection and give the
  // grid container keyboard focus. Clicks inside [data-editor] are left alone.
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-editor]")) {
      e.preventDefault();
      gridRef?.current?.focus({ preventScroll: true });
    }
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest(DRAG_EXCLUDED_SELECTOR)) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const overVerticalScrollbar =
      e.clientX >= bounds.left + e.currentTarget.clientWidth;
    const overHorizontalScrollbar =
      e.clientY >= bounds.top + e.currentTarget.clientHeight;
    if (overVerticalScrollbar || overHorizontalScrollbar) return;

    // Deliberately NO setPointerCapture here: capturing on pointerdown
    // retargets the following pointerup/mouseup — and therefore the `click` —
    // to this container, so a cell's own onClick would never fire and no
    // editor (and no select) could ever open. The capture is taken in
    // handlePointerMove, once the gesture is provably a drag.
    dragState.current = {
      pointerId: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      initialScrollLeft: e.currentTarget.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (!drag.moved) {
      if (!hasCrossedDragThreshold(drag.start, { x: e.clientX, y: e.clientY })) return;
      drag.moved = true;
      // Capture only now. The click that follows a real drag is suppressed
      // anyway, and the capture keeps the moves coming if the pointer leaves
      // the grid mid-drag.
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }

    e.preventDefault();
    e.currentTarget.scrollLeft = nextHorizontalScrollLeft(
      drag.initialScrollLeft,
      drag.start,
      { x: e.clientX, y: e.clientY },
    );
  };

  const finishPointerDrag = (
    e: PointerEvent<HTMLDivElement>,
    preventFollowingClick: boolean,
  ): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drag.moved && preventFollowingClick) {
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    dragState.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      tabIndex={0}
      aria-activedescendant={active ? cellDomId(active) : undefined}
      onKeyDown={onKeyDown}
      onFocus={onGridFocus}
      onBlur={onGridBlur}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishPointerDrag(e, true)}
      onPointerCancel={(e) => finishPointerDrag(e, false)}
      onClickCapture={(e) => {
        if (!suppressClick.current) return;
        e.preventDefault();
        e.stopPropagation();
        suppressClick.current = false;
      }}
      className={`overflow-auto rounded-md border border-gray-200 focus:outline-none max-h-[calc(100vh-18rem)] [&_select:enabled]:cursor-pointer [&_select:disabled]:cursor-not-allowed ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header}
                className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isActiveRow = active?.enrollmentId === row.enrollmentId;
            const activeCol = isActiveRow ? active.col : null;
            const editingCol = isActiveRow && editing ? editing.col : null;
            return (
              <GridRowView
                key={row.enrollmentId}
                row={row}
                activeCol={activeCol}
                editingCol={editingCol}
                editSeed={editingCol ? (editing?.seed ?? null) : null}
                editViaMouse={editingCol ? !!editing?.viaMouse : false}
                editTarget={editingCol ? (editing?.target ?? null) : null}
                activeFocused={isActiveRow ? gridHasFocus : false}
                statuses={rowStatuses(row.enrollmentId)}
                conflicts={conflicts.get(row.enrollmentId)}
                refData={refData}
                onCellMouseDown={onCellMouseDown}
                onCellClick={onCellClick}
                onCommitProfessor={onCommitProfessor}
                onCommitTime={onCommitTime}
                onCancelTime={onCancelTime}
                onCommitAula={onCommitAula}
                onCancelEdit={onCancelEdit}
                onRequestDeleteSlot={onRequestDeleteSlot}
                renderCell={renderCell}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
