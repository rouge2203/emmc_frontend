// One horario card: Día + Aula + delete on the first row, inicio/fin clocks
// underneath. Aula stays disabled until day and hora inicio are set.
import { XMarkIcon } from "@heroicons/react/16/solid";
import { NativeSelect } from "./CompactSelect";
import HorarioTimeRange from "./HorarioTimeRange";
import { aulaEnabled } from "./horarioTime";

export const DAY_OPTIONS = [
  { value: "L", label: "Lunes" },
  { value: "K", label: "Martes" },
  { value: "M", label: "Miércoles" },
  { value: "J", label: "Jueves" },
  { value: "V", label: "Viernes" },
  { value: "S", label: "Sábado" },
  { value: "D", label: "Domingo" },
] as const;

export interface HorarioClassroomOption {
  id: number;
  number: number;
}

export interface HorarioItemCardProps {
  day: string;
  hour: string | null;
  endHour: string | null;
  classroomId: number | null;
  classrooms: HorarioClassroomOption[];
  readOnly?: boolean;
  /** New rows get an empty "Día" option; existing rows always have a day. */
  allowEmptyDay?: boolean;
  onDayChange: (day: string) => void;
  onStartChange: (start: string, autoEnd?: string | null) => void;
  onEndChange: (end: string) => void;
  onClassroomChange: (classroomId: number | null) => void;
  onDelete?: () => void;
}

export default function HorarioItemCard({
  day,
  hour,
  endHour,
  classroomId,
  classrooms,
  readOnly = false,
  allowEmptyDay = false,
  onDayChange,
  onStartChange,
  onEndChange,
  onClassroomChange,
  onDelete,
}: HorarioItemCardProps) {
  const aulaOn = !readOnly && aulaEnabled(day, hour);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <div className="w-36 shrink-0">
          <NativeSelect
            aria-label="Día"
            value={day}
            disabled={readOnly}
            onChange={(e) => onDayChange(e.target.value)}
          >
            {allowEmptyDay && <option value="">Día</option>}
            {DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="min-w-0 flex-1">
          <NativeSelect
            aria-label="Aula"
            value={classroomId ?? ""}
            disabled={!aulaOn}
            onChange={(e) =>
              onClassroomChange(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Aula #</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                Aula {classroom.number}
              </option>
            ))}
          </NativeSelect>
        </div>
        {onDelete && !readOnly && (
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar horario"
            className="shrink-0 rounded-full p-1 text-gray-400 ring-1 ring-inset ring-gray-300 hover:text-red-600 hover:ring-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="sr-only">Eliminar horario</span>
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-3">
        <HorarioTimeRange
          start={hour}
          end={endHour}
          disabled={readOnly}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
        />
      </div>
    </div>
  );
}
