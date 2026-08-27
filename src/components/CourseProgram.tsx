import React, { useEffect, useRef, useState } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import {
  ChevronDownIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

/**
 * A file attached to the course programme. These are plain `Resources` rows
 * filed under week 0 — the programme's slot. Week 0 is NOT a numbered week of
 * the course; callers must keep it out of their 1..week_duration lists.
 */
export interface CourseProgramFile {
  id: number;
  week: number | null;
  title: string;
  description: string | null;
  resource_file_url: string | null;
  created_at?: string | null;
}

/**
 * The week the programme lives in. Zero is falsy in JavaScript, so callers must
 * select it with `week === COURSE_PROGRAM_WEEK` — never `if (week)`, `week ||`
 * or `!week`, each of which collapses the programme into "sin semana".
 */
export const COURSE_PROGRAM_WEEK = 0;

/** 10 MB, the same ceiling the API enforces on uploads. */
export const COURSE_PROGRAM_MAX_FILE_BYTES = 10 * 1024 * 1024;

interface CourseProgramProps {
  /** The programme text, or null/"" when the teacher has not written one. */
  text: string | null;
  /** The week-0 files, already filtered by the caller. */
  files: CourseProgramFile[];
  /** Students and admins pass this: no edit affordances at all. */
  readOnly?: boolean;
  /** True while the caller is saving; disables the edit buttons. */
  saving?: boolean;
  onSaveText?: (text: string) => Promise<void> | void;
  onAddFile?: (file: File) => Promise<void> | void;
  onEditFile?: (file: CourseProgramFile) => void;
  onDeleteFile?: (file: CourseProgramFile) => void;
}

const rowAction =
  "inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:px-2.5";
const rowActionDanger =
  "inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:px-2.5";

const CourseProgram: React.FC<CourseProgramProps> = ({
  text,
  files,
  readOnly = false,
  saving = false,
  onSaveText,
  onAddFile,
  onEditFile,
  onDeleteFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text ?? "");
  const [fileError, setFileError] = useState<string | null>(null);

  const canEdit = !readOnly && onSaveText !== undefined;
  const canAddFile = !readOnly && onAddFile !== undefined;

  // Follow the saved text while the editor is closed, so a refetch elsewhere on
  // the page does not leave a stale draft behind.
  useEffect(() => {
    if (!isEditing) setDraft(text ?? "");
  }, [text, isEditing]);

  const trimmedText = (text ?? "").trim();
  const hasText = trimmedText.length > 0;
  const hasFiles = files.length > 0;

  const handleSave = async () => {
    if (!onSaveText) return;
    try {
      await onSaveText(draft);
    } catch {
      // The caller reports the failure its own way (a toast, here); keep the
      // editor open so the teacher does not lose what they typed.
      return;
    }
    setIsEditing(false);
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    // Let the same file be picked again after an error.
    event.target.value = "";
    if (!file || !onAddFile) return;

    if (file.size > COURSE_PROGRAM_MAX_FILE_BYTES) {
      setFileError(
        "El archivo supera el límite de 10 MB. Elige un archivo más liviano.",
      );
      return;
    }

    setFileError(null);
    await onAddFile(file);
  };

  return (
    <div className="px-4 sm:px-6 py-5 bg-gray-50/60">
      <Disclosure defaultOpen>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DocumentTextIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                Programa del curso
              </h3>
              <p className="text-xs text-gray-500">
                {hasFiles
                  ? `${files.length} ${files.length === 1 ? "archivo adjunto" : "archivos adjuntos"}`
                  : "Sin archivos adjuntos"}
              </p>
            </div>
          </div>
          <DisclosureButton className="group inline-flex shrink-0 items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:px-3">
            {({ open }) => (
              <>
                {/* One node, one string child: the label has to say what the
                    button will DO, and a single interpolation keeps React
                    rewriting the text in place (see the translator hazard). */}
                <span className="sr-only sm:not-sr-only">
                  {open ? "Ocultar programa" : "Ver programa"}
                </span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="h-5 w-5 transition-transform group-data-[open]:rotate-180 sm:h-4 sm:w-4"
                />
              </>
            )}
          </DisclosureButton>
        </div>

        {/* No `transition` here on purpose. With it, the panel settled into
            data-closed AND data-enter at once, so the leave never finished:
            it stayed mounted at full height with opacity 0 and "hidden" did
            nothing. A disclosure over static text loses nothing by snapping. */}
        <DisclosurePanel className="mt-4 space-y-4">
          {/* Programme text */}
          {isEditing ? (
            <div>
              <label
                htmlFor="course-program-text"
                className="block text-sm/6 font-medium text-gray-900"
              >
                Programa del curso
              </label>
              <textarea
                id="course-program-text"
                rows={8}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                placeholder="Objetivos, contenidos por semana, forma de evaluación, materiales..."
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto"
                >
                  {saving ? "Guardando..." : "Guardar programa"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setDraft(text ?? "");
                    setIsEditing(false);
                  }}
                  className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : hasText ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-gray-700">
                {trimmedText}
              </p>
              {canEdit && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsEditing(true)}
                  className={`${rowAction} shrink-0 disabled:opacity-50`}
                >
                  <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                  Editar
                </button>
              )}
            </div>
          ) : canEdit ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-center">
              <p className="text-sm text-gray-600">
                Todavía no has escrito el programa de este curso.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Cuéntale al estudiante qué van a ver, cómo se evalúa y qué
                materiales necesita.
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => setIsEditing(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                Escribir programa
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              El profesor aún no ha publicado el programa de este curso.
            </p>
          )}

          {/* Attached files */}
          {(hasFiles || canAddFile) && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  Archivos del programa
                </h4>
                {canAddFile && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.mov"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => fileInputRef.current?.click()}
                      className={`${rowAction} disabled:opacity-50`}
                    >
                      <PlusIcon className="h-4 w-4" aria-hidden="true" />
                      Archivo
                    </button>
                  </>
                )}
              </div>

              {fileError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {fileError}
                </p>
              )}

              {hasFiles ? (
                <ul role="list" className="mt-2 divide-y divide-gray-100">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-x-3 py-3 sm:gap-x-6"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-x-3">
                        <PaperClipIcon
                          className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {file.title}
                          </p>
                          {file.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-none items-center gap-x-1 sm:gap-x-2">
                        {file.resource_file_url && (
                          <a
                            href={file.resource_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={rowAction}
                          >
                            <DocumentArrowDownIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            <span className="sr-only sm:not-sr-only">
                              Descargar
                            </span>
                          </a>
                        )}
                        {!readOnly && onEditFile && (
                          <button
                            type="button"
                            onClick={() => onEditFile(file)}
                            className={rowAction}
                            title="Editar archivo"
                          >
                            <PencilSquareIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Editar</span>
                          </button>
                        )}
                        {!readOnly && onDeleteFile && (
                          <button
                            type="button"
                            onClick={() => onDeleteFile(file)}
                            className={rowActionDanger}
                            title="Eliminar archivo"
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Eliminar</span>
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500 italic">
                  {canAddFile
                    ? "Puedes adjuntar el programa en PDF u otro material de apoyo (máximo 10 MB)."
                    : "El profesor no adjuntó archivos al programa."}
                </p>
              )}
            </div>
          )}
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
};

export default CourseProgram;
