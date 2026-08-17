// Preview of who a "Notificar" click would email, before the admin commits to
// it. Headless UI Dialog/DialogBackdrop, same pattern as the confirm dialog in
// CourseEnrollmentScheduleDrawer.tsx. Purely a read model over the same
// `summary` the header button uses — sending here reuses the exact same
// `onSend` action (no extra confirm step: opening this dialog and reading the
// list IS the deliberate review step).
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { XMarkIcon, ExclamationTriangleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import type { NotificationSummary, PendingStudent } from "./useNotificationSummary";

export interface NotifyPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  summary: NotificationSummary | null;
  sending: boolean;
  onSend: () => Promise<void>;
}

/** ISO datetime -> "dd/mm/yyyy HH:MM" in es-CR (no locale-dependent separators). */
function formatPendingSince(iso: string | null): string | null {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

function StudentEnrollments({ student }: { student: PendingStudent }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {student.enrollments.map((e) => {
        const since = formatPendingSince(e.pending_since);
        return (
          <li key={e.enrollment_id} className="text-xs text-gray-500">
            {e.course_code} · {e.course_name} · {e.year}·{e.period_display} · {e.schedules_count}{" "}
            horarios
            {since && <span className="text-gray-400"> · desde {since}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export default function NotifyPreviewDialog({
  open,
  onClose,
  summary,
  sending,
  onSend,
}: NotifyPreviewDialogProps) {
  const pending = summary?.pending ?? [];
  const withoutEmail = summary?.without_email ?? [];
  const pendingCount = summary?.pending_students ?? 0;
  const isEmpty = pending.length === 0 && withoutEmail.length === 0;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative flex max-h-[80vh] w-full transform flex-col overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:max-w-xl data-closed:sm:translate-y-0 data-closed:sm:scale-95"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
                Estudiantes pendientes de notificar
              </DialogTitle>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
              >
                <span className="sr-only">Cerrar</span>
                <XMarkIcon aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {isEmpty ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No hay cambios pendientes de notificar.
                </p>
              ) : (
                <>
                  {pending.length > 0 && (
                    <ul className="divide-y divide-gray-100">
                      {pending.map((student) => (
                        <li key={student.student_id} className="py-2">
                          <div className="flex items-center gap-2">
                            <EnvelopeIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <p className="text-sm font-medium text-gray-900">{student.student_name}</p>
                          </div>
                          <p className="ml-5 text-xs text-gray-500">{student.email}</p>
                          <div className="ml-5">
                            <StudentEnrollments student={student} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {withoutEmail.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon
                          className="size-4 text-amber-500"
                          aria-hidden="true"
                        />
                        <h4 className="text-xs font-semibold text-amber-700">
                          Sin correo (no se enviará)
                        </h4>
                      </div>
                      <ul className="mt-1 divide-y divide-amber-100">
                        {withoutEmail.map((student) => (
                          <li key={student.student_id} className="py-2">
                            <p className="text-sm font-medium text-amber-900">
                              {student.student_name}
                            </p>
                            <div className="ml-5">
                              <StudentEnrollments student={student} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={sending || pendingCount === 0}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar {pendingCount} correos
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
