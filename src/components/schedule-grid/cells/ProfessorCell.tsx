// Professor sub-cell. Nav mode: the assigned professor's name (or a muted "Sin
// profesor") plus the autosave CellStatus. Edit mode: mounts ProfessorEditor,
// wiring the row's commit/cancel callbacks so navigation and autosave stay in
// the page/hooks.
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import CellStatus from "./CellStatus";
import ProfessorEditor from "./ProfessorEditor";

export default function ProfessorCell({
  row,
  col,
  active,
  focused,
  editing,
  seed,
  saveState,
  onMouseDown,
  onDoubleClick,
  onCommitProfessor,
  onCancelEdit,
  refData,
}: CellProps) {
  const address = { enrollmentId: row.enrollmentId, col };

  return (
    <div
      id={cellDomId(address)}
      role="gridcell"
      data-col={col}
      onMouseDown={editing ? undefined : () => onMouseDown(address)}
      onDoubleClick={editing ? undefined : () => onDoubleClick?.(address)}
      className={cellClass({ active, focused, status: saveState?.status })}
    >
      {editing && refData ? (
        <ProfessorEditor
          current={
            row.professorId !== null
              ? { id: row.professorId, name: row.professorName ?? "" }
              : null
          }
          teachers={refData.teachers}
          seed={seed ?? null}
          onCommit={(teacherId, move) => onCommitProfessor?.(row.enrollmentId, teacherId, move)}
          onCancel={(move) => onCancelEdit?.(move)}
        />
      ) : (
        <>
          {row.professorName ? (
            <span className="text-gray-900">{row.professorName}</span>
          ) : (
            <span className="text-gray-400 italic">Sin profesor</span>
          )}
          <CellStatus state={saveState} />
        </>
      )}
    </div>
  );
}
