// Page-level toast for the schedule grid, rendered via a portal on document.body
// so it floats above the scrollable grid. The error variant announces autosave
// failures; the info variant (with an optional inline action button) is used by
// Task 10 for the delete-undo message. Auto-hide is owned by useAutosave — this
// component is purely presentational.
import { createPortal } from "react-dom";
import { Transition } from "@headlessui/react";
import { XCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";

export interface GridToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  variant?: "error" | "info";
  /** Optional inline button (e.g. "Deshacer" for Task 10's delete-undo). */
  action?: { label: string; onClick: () => void };
}

export default function GridToast({
  show,
  message,
  onClose,
  variant = "error",
  action,
}: GridToastProps) {
  if (typeof document === "undefined") return null;
  const isError = variant === "error";

  return createPortal(
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        <Transition show={show}>
          <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
            <div className="p-4">
              <div className="flex items-start">
                <div className="shrink-0">
                  {isError ? (
                    <XCircleIcon aria-hidden="true" className="size-6 text-red-600" />
                  ) : (
                    <CheckCircleIcon aria-hidden="true" className="size-6 text-primary" />
                  )}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {isError ? "Error" : "Listo"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{message}</p>
                  {action && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={action.onClick}
                        className="text-sm font-medium text-primary hover:text-primary/80 focus:outline-2 focus:outline-offset-2 focus:outline-primary rounded"
                      >
                        {action.label}
                      </button>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                  >
                    <span className="sr-only">Cerrar</span>
                    <XMarkIconSolid aria-hidden="true" className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>,
    document.body,
  );
}
