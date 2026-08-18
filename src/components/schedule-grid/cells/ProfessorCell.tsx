// Professor sub-cell. Nav mode: a select-styled box with the assigned
// professor's name (or a muted "Sin profesor") plus the autosave status. Edit
// mode: a native <select> (Sin profesor + every teacher as "Apellido Nombre"),
// pre-selected to the current value; navigation and autosave stay in the
// page/hooks via the row's commit/cancel callbacks.
import { useMemo } from "react";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import SelectBox from "./SelectBox";
import CellMessage from "./CellMessage";
import SingleSelectEditor from "./SingleSelectEditor";
import type { SelectOption } from "./SingleSelectEditor";

export default function ProfessorCell({
  row,
  col,
  active,
  focused,
  editing,
  seed,
  viaMouse,
  saveState,
  onMouseDown,
  onClick,
  onCommitProfessor,
  onCancelEdit,
  refData,
}: CellProps) {
  const address = { enrollmentId: row.enrollmentId, col };

  const options = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Sin profesor" },
      ...(refData?.teachers ?? []).map((t) => ({
        value: String(t.id),
        label: `${t.last_name} ${t.first_name}`.trim(),
      })),
    ],
    [refData?.teachers],
  );

  return (
    <div
      id={cellDomId(address)}
      role="gridcell"
      data-col={col}
      onMouseDown={editing ? undefined : () => onMouseDown(address)}
      onClick={editing ? undefined : () => onClick?.(address)}
      className={cellClass({ active, focused, status: saveState?.status })}
    >
      {editing && refData ? (
        <SingleSelectEditor
          options={options}
          current={row.professorId !== null ? String(row.professorId) : ""}
          seed={seed ?? null}
          viaMouse={!!viaMouse}
          ariaLabel="Profesor"
          onCommit={(value, move) =>
            onCommitProfessor?.(row.enrollmentId, value === "" ? null : Number(value), move)
          }
          onCancel={(move) => onCancelEdit?.(move)}
        />
      ) : (
        <>
          <SelectBox text={row.professorName ?? "Sin profesor"} muted={!row.professorName} saveState={saveState} />
          <CellMessage state={saveState} />
        </>
      )}
    </div>
  );
}
