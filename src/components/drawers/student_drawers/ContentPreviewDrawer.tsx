import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  FolderIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

interface Assignment {
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
  created_at: string | null;
}

interface Resource {
  id: number;
  week: number | null;
  title: string;
  description: string | null;
  resource_file_url: string | null;
  created_at: string | null;
}

type ContentItem =
  | { type: "assignment"; data: Assignment }
  | { type: "resource"; data: Resource };

interface ContentPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ContentItem | null;
}

const ContentPreviewDrawer: React.FC<ContentPreviewDrawerProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!item) return null;

  const isAssignment = item.type === "assignment";
  const data = item.data;
  const fileUrl = isAssignment
    ? (data as Assignment).assignment_file_url
    : (data as Resource).resource_file_url;

  const isImage = fileUrl
    ? /\.(png|jpe?g|gif|webp|svg)$/i.test(fileUrl)
    : false;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10">
            <DialogPanel
              transition
              className="pointer-events-auto w-screen max-w-xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
            >
              <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                <div className="bg-gray-50 px-4 py-6 sm:px-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <DialogTitle className="text-base font-semibold text-gray-900">
                        {isAssignment ? "Detalle de tarea" : "Detalle de recurso"}
                      </DialogTitle>
                      <p className="text-sm text-gray-500">
                        {data.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                    >
                      <span className="absolute -inset-2.5" />
                      <span className="sr-only">Cerrar panel</span>
                      <XMarkIcon aria-hidden="true" className="size-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 px-4 py-6 sm:px-6 space-y-6">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      {isAssignment ? (
                        <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FolderIcon className="h-5 w-5 text-amber-500" />
                      )}
                      {data.title}
                    </div>
                    {data.description && (
                      <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">
                        {data.description}
                      </p>
                    )}
                  </div>

                  {isAssignment && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                          Fecha
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {(data as Assignment).date || "Sin fecha"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                          Calificacion
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {(data as Assignment).grade !== null
                            ? `${(data as Assignment).grade}${
                                (data as Assignment).points !== null
                                  ? ` / ${(data as Assignment).points}`
                                  : ""
                              }`
                            : "Sin calificar"}
                        </p>
                      </div>
                      {(data as Assignment).comment_grade && (
                        <div className="sm:col-span-2 rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                            Comentario del profesor
                          </div>
                          <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                            {(data as Assignment).comment_grade}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {fileUrl && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-900">
                          Archivo adjunto
                        </div>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                          Descargar
                        </a>
                      </div>
                      {isImage && (
                        <div className="mt-4 overflow-hidden rounded-md border border-gray-100">
                          <img
                            src={fileUrl}
                            alt="Vista previa"
                            className="w-full max-h-80 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ContentPreviewDrawer;
