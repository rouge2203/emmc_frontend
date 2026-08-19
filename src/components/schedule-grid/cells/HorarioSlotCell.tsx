// One horario column. Click (or type) opens the combined editor; the X asks the
// page to confirm deletion.
//
// Nav mode has two faces, because the admin's job here is spotting what is
// still missing across ~300 rows:
//   - settled (día + inicio + fin + aula): read as plain text. No boxes, no
//     chevrons — a done horario should recede.
//   - anything missing: the SAME controls as HorarioSlotEditor — real <select>
//     elements, same widths, same disabled rules — only inert (aria-hidden,
//     tabIndex -1, pointer-events-none) so the gridcell keeps owning the click.
//     Imitating a select with a <div> is what used to make the card resize the
//     moment it was selected; rendering the actual element makes the two modes
//     pixel-identical by construction.
// Both faces reuse one skeleton (SLOT_ROW / the w-28 + flex-1 columns), so the
// cards stay column-aligned down the grid and the row never changes height.
// Screen readers get the `sr-only` summary instead of decorative selects.
import { XMarkIcon } from "@heroicons/react/16/solid";
import { DAY_LABELS } from "../types";
import { colSlotIndex } from "../types";
import { cellClass, cellDomId, controlBorder, settledCellOutline } from "../cellIds";
import type { CellProps } from "../cellIds";
import { formatSlotRange, to12h } from "../time";
import { slotConflictLines } from "../conflictLines";
import { NativeSelect, type CompactSelectSize } from "../../drawers/CompactSelect";
import { formatHourLabel, periodOf } from "../../drawers/horarioTime";
import CellMessage from "./CellMessage";
import HorarioSlotEditor from "./HorarioSlotEditor";
import type { HorarioEditorTarget } from "../horarioEditorTarget";

const NOOP = (): void => {};

// Same padding + type scale as the select it stands in for, so swapping one for
// the other cannot change a single dimension.
const TEXT_AS_FULL_SELECT = "block truncate py-1.5 pl-3 text-base sm:text-sm/6";
const TEXT_AS_TIME_SELECT = "block py-1.5 pl-2 text-sm";

/** An inert twin of the editor's select: same element, same classes, no interaction. */
function StaticSelect({
  text,
  size,
  disabled,
  outline,
}: {
  text: string;
  size?: CompactSelectSize;
  disabled?: boolean;
  outline: string;
}) {
  return (
    <NativeSelect
      aria-hidden="true"
      tabIndex={-1}
      disabled={disabled}
      selectSize={size}
      selectOutline={outline}
      className="pointer-events-none"
      value="current"
      onChange={NOOP}
    >
      <option value="current">{text}</option>
    </NativeSelect>
  );
}

/**
 * Resting twin of HorarioTimeRange's HourMinuteGroup: the same two selects, at
 * the smaller "timeCompact" size, so the clocks stop shouting on a card nobody
 * is editing. They grow to the editor's w-20 / w-16 the moment the card opens;
 * the row reserves the editor's height (h-8), so that growth never moves a row.
 * Hora and minutos carry their own targets — clicking mm must open mm.
 */
function StaticTimeGroup({
  minutes,
  outline,
  target,
}: {
  minutes: number | null;
  outline: string;
  target: "start" | "end";
}) {
  const hour24 = minutes !== null ? Math.floor(minutes / 60) : null;
  const parts = minutes !== null ? to12h(minutes) : null;
  return (
    <div className="flex h-8 shrink-0 items-center gap-1">
      <div data-horario-target={target} className="w-16 shrink-0">
        <StaticSelect
          size="timeCompact"
          outline={outline}
          text={hour24 !== null ? formatHourLabel(hour24) : "hh"}
        />
      </div>
      <span className="text-xs font-medium text-gray-400" aria-hidden="true">
        :
      </span>
      <div
        data-horario-target={target === "start" ? "startMinute" : "endMinute"}
        className="w-12 shrink-0"
      >
        <StaticSelect
          size="timeCompact"
          outline={outline}
          disabled={!parts}
          text={parts ? String(parts.minute).padStart(2, "0") : "mm"}
        />
      </div>
      <span
        aria-hidden="true"
        data-horario-target={target}
        className={`w-6 shrink-0 px-0.5 text-left text-xs ${
          parts ? "text-gray-600" : "text-gray-400"
        }`}
      >
        {hour24 !== null ? periodOf(hour24) : "am"}
      </span>
    </div>
  );
}

const timeSummary = (start: number | null, end: number | null): string => {
  if (start === null) return "sin hora";
  const from = to12h(start);
  const label = (m: { hour12: number; minute: number; period: string }): string =>
    `${m.hour12}:${String(m.minute).padStart(2, "0")} ${m.period.toLowerCase()}`;
  return end === null ? `desde ${label(from)}` : `${label(from)} a ${label(to12h(end))}`;
};

export default function HorarioSlotCell({
  row,
  col,
  active,
  focused,
  editing,
  seed,
  editTarget,
  saveState,
  onMouseDown,
  onClick,
  onCommitTime,
  onCancelTime,
  onCommitAula,
  onCancelEdit,
  slotConflicts,
  refData,
  onRequestDelete,
}: CellProps & { onRequestDelete?: () => void }) {
  const slotIndex = colSlotIndex(col);
  const slot = row.slots[slotIndex];
  const classroom =
    slot && slot.classroomId !== null ? refData?.classroomById.get(slot.classroomId) : undefined;
  const address = { enrollmentId: row.enrollmentId, col };
  const conflictLines = slotConflictLines(
    slotConflicts,
    refData?.classroomById,
    refData?.teacherById,
  );
  const dayLabel = slot?.day ? DAY_LABELS[slot.day] : "Día";
  const aulaLabel = classroom?.display_name ?? "Aula #";
  const error = saveState?.status === "error";
  // Same gate as the editor: aula stays disabled until día + hora inicio exist.
  const aulaOn = !!slot?.day && slot?.start !== null && slot?.start !== undefined;
  // Nothing left to fill in → show it as text rather than as four controls.
  const settled =
    !!slot && !!slot.day && slot.start !== null && slot.end !== null && !!classroom;
  const outline = controlBorder({ active, focused, error });

  return (
    <div
      id={cellDomId(address)}
      role="gridcell"
      data-col={col}
      onMouseDown={editing ? undefined : () => onMouseDown(address)}
      onClick={
        editing
          ? undefined
          : (e) => {
              const target = (
                e.target as HTMLElement
              ).closest<HTMLElement>("[data-horario-target]")?.dataset
                .horarioTarget as HorarioEditorTarget | undefined;
              onClick?.(address, target ?? "day");
            }
      }
      className={`${cellClass({ active, focused, status: saveState?.status })} ${
        settled && !editing ? settledCellOutline({ active, focused, error }) : ""
      }`}
    >
      {editing ? (
        <HorarioSlotEditor
          initial={
            slot
              ? {
                  day: slot.day,
                  start: slot.start,
                  end: slot.end,
                  classroomId: slot.classroomId,
                }
              : null
          }
          classrooms={refData?.classrooms ?? []}
          seed={seed ?? null}
          requestedTarget={editTarget ?? "day"}
          canDelete={!!slot}
          onCommitTime={(value, move) =>
            onCommitTime?.(row.enrollmentId, slotIndex, value, move)
          }
          onCommitAula={(classroomId, move) =>
            onCommitAula?.(row.enrollmentId, slotIndex, classroomId, move)
          }
          onCancel={(move, error) => {
            if (error) onCancelTime?.(row.enrollmentId, slotIndex, move, error);
            else onCancelEdit?.(move);
          }}
          onRequestDelete={() => onRequestDelete?.()}
        />
      ) : (
        <>
          <span className="sr-only">
            {slot
              ? `${dayLabel}, ${timeSummary(slot.start, slot.end)}, ${aulaLabel}`
              : "Horario sin asignar"}
          </span>
          <div className="flex items-center gap-2">
            <div data-horario-target="day" className="w-28 shrink-0">
              {settled ? (
                <span className={`${TEXT_AS_FULL_SELECT} font-medium text-gray-900`}>
                  {dayLabel}
                </span>
              ) : (
                <StaticSelect text={dayLabel} outline={outline} />
              )}
            </div>
            <div data-horario-target="aula" className="min-w-0 flex-1">
              {settled ? (
                <span className={`${TEXT_AS_FULL_SELECT} text-gray-600`}>{aulaLabel}</span>
              ) : (
                <StaticSelect text={aulaLabel} outline={outline} disabled={!aulaOn} />
              )}
            </div>
            {slot && (
              <button
                type="button"
                title="Eliminar horario"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete?.();
                }}
                className="shrink-0 rounded-full p-1 text-gray-400 ring-1 ring-inset ring-gray-300 hover:text-red-600 hover:ring-red-300"
              >
                <span className="sr-only">Eliminar horario</span>
                <XMarkIcon className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mt-2">
            {settled ? (
              <span data-horario-target="start" className={`${TEXT_AS_TIME_SELECT} text-gray-600`}>
                {formatSlotRange(slot?.start ?? null, slot?.end ?? null)}
              </span>
            ) : (
              <div className="flex min-w-max items-center gap-4">
                <StaticTimeGroup minutes={slot?.start ?? null} outline={outline} target="start" />
                <StaticTimeGroup minutes={slot?.end ?? null} outline={outline} target="end" />
              </div>
            )}
          </div>
          {conflictLines.length > 0 && (
            <p className="mt-1 truncate text-[11px] text-amber-700" title={conflictLines.join("\n")}>
              {conflictLines[0]}
            </p>
          )}
          <CellMessage state={saveState} />
        </>
      )}
    </div>
  );
}
