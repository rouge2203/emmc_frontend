// Aula sub-cell (bottom half of a horario column). Nav mode: a select-styled
// box with the slot's classroom display name, or a muted "Aula" when there is
// no slot or classroom, plus the autosave status. Edit mode: a native <select>
// (Aula + every classroom as "Aula N — name"); an empty slot is not editable
// (canEdit shows the "Primero asigne día y hora" hint instead).
import { useMemo } from "react";
import { colSlotIndex } from "../types";
import { cellClass, cellDomId } from "../cellIds";
import type { CellProps } from "../cellIds";
import SelectBox from "./SelectBox";
import CellMessage from "./CellMessage";
import SingleSelectEditor from "./SingleSelectEditor";
import type { SelectOption } from "./SingleSelectEditor";

export default function AulaCell({
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
  onCommitAula,
  onCancelEdit,
  refData,
}: CellProps) {
  const slotIndex = colSlotIndex(col);
  const slot = row.slots[slotIndex];
  const classroom =
    slot && slot.classroomId !== null ? refData?.classroomById.get(slot.classroomId) : undefined;
  const label = classroom?.display_name ?? "Aula";
  const address = { enrollmentId: row.enrollmentId, col };

  const options = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Aula" },
      ...(refData?.classrooms ?? []).map((c) => ({ value: String(c.id), label: c.display_name })),
    ],
    [refData?.classrooms],
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
      {editing && refData && slot ? (
        <SingleSelectEditor
          options={options}
          current={slot.classroomId !== null ? String(slot.classroomId) : ""}
          seed={seed ?? null}
          viaMouse={!!viaMouse}
          ariaLabel="Aula"
          onCommit={(value, move) =>
            onCommitAula?.(row.enrollmentId, slotIndex, value === "" ? null : Number(value), move)
          }
          onCancel={(move) => onCancelEdit?.(move)}
        />
      ) : (
        <>
          <SelectBox text={label} muted={!classroom} saveState={saveState} />
          <CellMessage state={saveState} />
        </>
      )}
    </div>
  );
}
