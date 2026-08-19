// Control for the "notify pending students" flow (same row as the keyboard
// legend, right-aligned). Three mutually
// exclusive visual states, driven entirely by props from useNotificationSummary:
//   - idle: primary "Notificar a N estudiantes" (click opens an inline confirm
//     popover, no native confirm()) + a small "Ver" button opening the preview.
//   - sending: `sending` is true (this admin just clicked) OR another admin's
//     batch is currently running (`summary.active_batch`) — either way the
//     button becomes a disabled spinner with a live sent/total count.
//   - justFinished (transient, ~6 s, owned by the hook): a status line under
//     the (now idle again) button reporting the last batch's outcome.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EnvelopeIcon,
  EyeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import useAuth from "../../hooks/useAuth";
import type { NotificationBatch, NotificationSummary } from "./useNotificationSummary";

export interface NotifyPendingButtonProps {
  summary: NotificationSummary | null;
  sending: boolean;
  updating: boolean;
  justFinished: NotificationBatch | null;
  onSend: () => Promise<void>;
  onOpenPreview: () => void;
}

export default function NotifyPendingButton({
  summary,
  sending,
  updating,
  justFinished,
  onSend,
  onOpenPreview,
}: NotifyPendingButtonProps) {
  const { auth } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const pendingCount = summary?.pending_students ?? 0;
  const active = summary?.active_batch ?? null;
  const isSendingUi = sending || active !== null;
  const idleDisabled = !summary || pendingCount === 0;

  const currentUserName = auth?.user
    ? `${auth.user.first_name} ${auth.user.last_name}`.trim()
    : null;
  const createdBy = active?.created_by_name ?? null;
  const showCreatedBySubtitle =
    isSendingUi && createdBy !== null && createdBy !== currentUserName;

  useEffect(() => {
    if (confirmOpen) confirmButtonRef.current?.focus();
  }, [confirmOpen]);

  useEffect(() => {
    if (updating) setConfirmOpen(false);
  }, [updating]);

  // Close the popover on an outside click (Esc is handled inline below).
  useEffect(() => {
    if (!confirmOpen) return;
    const onDocMouseDown = (e: MouseEvent): void => {
      if (!wrapperRef.current?.contains(e.target as Node)) setConfirmOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [confirmOpen]);

  const openConfirm = useCallback(() => setConfirmOpen(true), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const confirmSend = useCallback(() => {
    setConfirmOpen(false);
    void onSend();
  }, [onSend]);

  if (updating) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
      >
        <ArrowPathIcon className="size-4 animate-spin" aria-hidden="true" />
        Actualizando…
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {isSendingUi ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary cursor-not-allowed"
          >
            <ArrowPathIcon className="size-4 animate-spin" aria-hidden="true" />
            {active
              ? `Enviando correos… ${active.sent_count}/${active.total_students}`
              : "Enviando correos…"}
          </button>
        ) : (
          <button
            type="button"
            onClick={openConfirm}
            disabled={idleDisabled}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold shadow-xs transition-colors ${
              idleDisabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            <EnvelopeIcon className="size-4" aria-hidden="true" />
            Notificar a {pendingCount} {pendingCount === 1 ? "estudiante" : "estudiantes"}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPreview}
          disabled={!summary}
          aria-label="Ver estudiantes pendientes"
          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-2 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          <EyeIcon className="size-4" aria-hidden="true" />
          Ver
        </button>

        {confirmOpen && (
          <div
            role="dialog"
            aria-label="Confirmar envío de notificaciones"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                closeConfirm();
              }
            }}
            className="absolute left-0 top-full z-20 mt-2 w-64 rounded-md border border-gray-200 bg-white p-3 shadow-lg"
          >
            <p className="text-sm text-gray-700">
              ¿Enviar {pendingCount} {pendingCount === 1 ? "correo" : "correos"} ahora?
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={confirmSend}
                className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white hover:bg-primary/90"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      {isSendingUi && showCreatedBySubtitle && (
        <p className="text-[11px] text-gray-500">Iniciado por {createdBy}</p>
      )}

      {!isSendingUi && justFinished && (
        <p className="text-xs">
          {justFinished.status === "failed" ? (
            <span className="font-medium text-red-600" title={justFinished.last_error || undefined}>
              Envío interrumpido — vuelva a intentar
            </span>
          ) : (
            <>
              <span className="font-medium text-green-600">
                Correos enviados ({justFinished.sent_count})
              </span>
              {justFinished.failed_count > 0 && (
                <span
                  className="ml-1 font-medium text-amber-600"
                  title={justFinished.last_error || undefined}
                >
                  · {justFinished.failed_count} no se pudieron enviar
                </span>
              )}
            </>
          )}
        </p>
      )}
    </div>
  );
}
