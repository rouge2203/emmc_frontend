// The excel-like grid shell: a scrollable, focusable role="grid" container with
// a sticky header and one memoized GridRowView per row. It renders the active-
// cell styling, forwards keyboard/focus/mouse to useGridNavigation, and threads
// per-row edit + autosave props down. The container is the ONLY focusable grid
// element in nav mode; the editor takes focus in edit mode.
import type { FocusEvent, KeyboardEvent, MouseEvent, RefObject } from "react";
import type { CellAddress, CellSaveState, ColKey, GridRow, MoveDir } from "./types";
import type { GridRefData } from "./useGridData";
import type { RenderCell } from "./cellIds";
import type { EditingState } from "./useGridNavigation";
import GridRowView from "./GridRowView";

export interface ScheduleGridProps {
  rows: GridRow[];
  refData: GridRefData;
  active: CellAddress | null;
  editing: EditingState | null;
  /** Grid container has focus → primary selection ring; else gray inactive ring. */
  gridHasFocus: boolean;
  onCellMouseDown: (address: CellAddress) => void;
  onCellDoubleClick: (address: CellAddress) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onGridFocus: (e: FocusEvent<HTMLDivElement>) => void;
  onGridBlur: (e: FocusEvent<HTMLDivElement>) => void;
  /** Returns this row's autosave statuses (stable ref per row for memo). */
  rowStatuses: (enrollmentId: number) => Partial<Record<ColKey, CellSaveState>> | undefined;
  onCommitProfessor: (enrollmentId: number, teacherId: number | null, move: MoveDir) => void;
  onCancelEdit: (move: MoveDir) => void;
  gridRef?: RefObject<HTMLDivElement | null>;
  renderCell?: RenderCell;
}

const HEADERS = ["Info", "Profesor", "Horario 1", "Horario 2", "Horario 3"];

export default function ScheduleGrid({
  rows,
  refData,
  active,
  editing,
  gridHasFocus,
  onCellMouseDown,
  onCellDoubleClick,
  onKeyDown,
  onGridFocus,
  onGridBlur,
  rowStatuses,
  onCommitProfessor,
  onCancelEdit,
  gridRef,
  renderCell,
}: ScheduleGridProps) {
  // Mousedown anywhere outside an editor: suppress text selection and give the
  // grid container keyboard focus. Clicks inside [data-editor] are left alone.
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-editor]")) {
      e.preventDefault();
      gridRef?.current?.focus({ preventScroll: true });
    }
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={onGridFocus}
      onBlur={onGridBlur}
      onMouseDown={handleMouseDown}
      className="overflow-auto rounded-md border border-gray-200 focus:outline-none max-h-[calc(100vh-18rem)]"
    >
      <table className="min-w-full border-separate border-spacing-0 text-sm">
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
                activeFocused={isActiveRow ? gridHasFocus : false}
                statuses={rowStatuses(row.enrollmentId)}
                refData={refData}
                onCellMouseDown={onCellMouseDown}
                onCellDoubleClick={onCellDoubleClick}
                onCommitProfessor={onCommitProfessor}
                onCancelEdit={onCancelEdit}
                renderCell={renderCell}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
