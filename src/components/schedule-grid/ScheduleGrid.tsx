// The excel-like grid shell: a scrollable, focusable role="grid" container with
// a sticky header and one memoized GridRowView per row. This task renders the
// active-cell styling and reports mouse-downs; keyboard navigation and editing
// are layered on in Tasks 9-12. Prop surface is deliberately small and typed:
// `gridRef` exposes the scroll container for keyboard focus/scroll (Task 9) and
// `renderCell` lets a later task swap in editing-aware cells.
import type { RefObject } from "react";
import type { CellAddress, GridRow } from "./types";
import type { GridRefData } from "./useGridData";
import type { RenderCell } from "./cellIds";
import GridRowView from "./GridRowView";

export interface ScheduleGridProps {
  rows: GridRow[];
  refData: GridRefData;
  active: CellAddress | null;
  onCellMouseDown: (address: CellAddress) => void;
  gridRef?: RefObject<HTMLDivElement | null>;
  renderCell?: RenderCell;
}

const HEADERS = ["Info", "Profesor", "Horario 1", "Horario 2", "Horario 3"];

export default function ScheduleGrid({
  rows,
  refData,
  active,
  onCellMouseDown,
  gridRef,
  renderCell,
}: ScheduleGridProps) {
  return (
    <div
      ref={gridRef}
      role="grid"
      tabIndex={0}
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
          {rows.map((row) => (
            <GridRowView
              key={row.enrollmentId}
              row={row}
              activeCol={
                active && active.enrollmentId === row.enrollmentId ? active.col : null
              }
              refData={refData}
              onCellMouseDown={onCellMouseDown}
              renderCell={renderCell}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
