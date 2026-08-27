import { useRef, useState } from "react";
import {
  DocumentArrowDownIcon,
  PaperClipIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { formatGrade } from "../utils/grades";

/**
 * The expanded body of one row in "Evaluaciones del curso".
 *
 * It replaces a trip to /teacher/assignment/:id — everything that page offered
 * is edited here, in place, in the order the section reads: what the evaluation
 * IS (título, semana, fecha, puntos disponibles), then what the student has to
 * DO (descripción, archivo), then what they EARNED (puntos obtenidos,
 * comentario). Collapsed by default; the row itself keeps showing the grade.
 */

export interface EvaluationAssignment {
  id: number;
  week: number | null;
  date: string | null;
  title: string;
  description: string | null;
  points: number | null;
  grade: number | null;
  comment_grade: string | null;
  assignment_file_url: string | null;
  is_exam: boolean;
  is_concert: boolean;
}

export interface EvaluationDraft {
  title: string;
  week: string;
  date: string;
  description: string;
}

interface Props {
  assignment: EvaluationAssignment;
  readOnly?: boolean;
  saving?: boolean;
  /** Persists the draft. Rejecting keeps the panel open with the edits intact. */
  onSave: (draft: EvaluationDraft) => Promise<void>;
  onAttachFile?: (file: File) => Promise<void>;
  onRemoveFile?: () => Promise<void>;
}

/** Largest attachment the API will take (mirrors MAX_UPLOAD_SIZE_MB). */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const fieldClass =
  "mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm/6";

const tagLabelClass =
  "block text-[11px] font-medium uppercase tracking-wide text-gray-500";

// Not exported: `react-refresh/only-export-components` allows types beside a
// component, but not functions, and no caller needs this.
function draftFromAssignment(
  assignment: EvaluationAssignment,
): EvaluationDraft {
  return {
    title: assignment.title ?? "",
    week: assignment.week === null ? "" : String(assignment.week),
    date: assignment.date ?? "",
    description: assignment.description ?? "",
  };
}

export default function EvaluationDetails({
  assignment,
  readOnly = false,
  saving = false,
  onSave,
  onAttachFile,
  onRemoveFile,
}: Props) {
  const [draft, setDraft] = useState<EvaluationDraft>(() =>
    draftFromAssignment(assignment),
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const set = <K extends keyof EvaluationDraft>(
    key: K,
    value: EvaluationDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  // Shown beside the grade read-out. Null means the evaluation has no maximum.
  const availablePoints = assignment.points;

  const handleSave = async () => {
    try {
      await onSave(draft);
    } catch {
      // The caller has already reported it; keep the edits on screen.
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onAttachFile) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        "El archivo supera el límite de 10 MB. Elige un archivo más liviano.",
      );
      return;
    }
    setFileError(null);
    await onAttachFile(file);
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/70 p-4">
      {/* What the evaluation is */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label htmlFor={`ev-title-${assignment.id}`} className={tagLabelClass}>
            Título
          </label>
          <input
            id={`ev-title-${assignment.id}`}
            type="text"
            value={draft.title}
            disabled={readOnly}
            onChange={(e) => set("title", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`ev-week-${assignment.id}`} className={tagLabelClass}>
            Semana
          </label>
          <input
            id={`ev-week-${assignment.id}`}
            type="number"
            min="0"
            value={draft.week}
            disabled={readOnly}
            onChange={(e) => set("week", e.target.value)}
            placeholder="Sin semana"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`ev-date-${assignment.id}`} className={tagLabelClass}>
            Fecha de entrega
          </label>
          <input
            id={`ev-date-${assignment.id}`}
            type="date"
            value={draft.date}
            disabled={readOnly}
            onChange={(e) => set("date", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          {/* Read-only: what an evaluation is worth is set when the course is
              built, and the final-grade weighting depends on it. */}
          <span className={tagLabelClass}>Puntos disponibles</span>
          <p className="mt-1 py-1.5 text-base text-gray-900 sm:text-sm/6">
            {availablePoints === null
              ? "Sin definir"
              : `${formatGrade(availablePoints)} pts`}
          </p>
        </div>
      </div>

      {/* What the student has to do */}
      <div className="mt-5 border-t border-gray-200 pt-4">
        <label
          htmlFor={`ev-description-${assignment.id}`}
          className="block text-sm/6 font-medium text-gray-900"
        >
          Descripción
        </label>
        <textarea
          id={`ev-description-${assignment.id}`}
          rows={4}
          value={draft.description}
          disabled={readOnly}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Qué debe preparar el estudiante para esta evaluación."
          className={fieldClass}
        />

        <div className="mt-3">
          <span className={tagLabelClass}>Archivo adjunto</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {assignment.assignment_file_url ? (
              <>
                <a
                  href={assignment.assignment_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Descargar
                </a>
                {!readOnly && onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile()}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Quitar
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Sin archivo adjunto</p>
            )}
            {!readOnly && onAttachFile && (
              <>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <PaperClipIcon className="h-4 w-4" />
                  {assignment.assignment_file_url ? "Reemplazar" : "Adjuntar"}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  onChange={handleFile}
                />
              </>
            )}
          </div>
          {fileError && (
            <p className="mt-1.5 text-sm text-red-600">{fileError}</p>
          )}
        </div>
      </div>

      {/* What the student earned — read-only here on purpose: grading lives
          behind the "Calificar" button on the row, so there is one place to
          change a mark and one place to describe the work. */}
      <div className="mt-5 border-t border-gray-200 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className={tagLabelClass}>Puntos obtenidos</span>
            <p className="mt-1 py-1.5 text-base text-gray-900 sm:text-sm/6">
              {assignment.grade === null
                ? "Sin calificar"
                : `${formatGrade(assignment.grade)}${
                    availablePoints === null
                      ? " pts"
                      : ` / ${formatGrade(availablePoints)} pts`
                  }`}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className={tagLabelClass}>Comentario</span>
            <p className="mt-1 py-1.5 text-base text-gray-900 sm:text-sm/6">
              {assignment.comment_grade?.trim()
                ? assignment.comment_grade
                : "Sin comentario"}
            </p>
          </div>
        </div>
        {!readOnly && (
          <p className="mt-1 text-xs text-gray-500">
            La nota y el comentario se editan con «Calificar».
          </p>
        )}
      </div>

      {!readOnly && (
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(draftFromAssignment(assignment));
              setFileError(null);
            }}
            disabled={saving}
            className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar evaluación"}
          </button>
        </div>
      )}
    </div>
  );
}
