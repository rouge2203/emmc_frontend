import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
} from "@headlessui/react";
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

export interface NewsItem {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string | null;
  created_by:
    | {
        id: number;
        first_name: string | null;
        last_name: string | null;
      }
    | null;
}

interface NewsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNewsSaved?: () => void;
  editingNews?: NewsItem | null;
}

const NewsDrawer: React.FC<NewsDrawerProps> = ({
  isOpen,
  onClose,
  onNewsSaved,
  editingNews,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [successNotificationMessage, setSuccessNotificationMessage] =
    useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingNews) {
        setFormTitle(editingNews.title);
        setFormDescription(editingNews.description || "");
        setExistingImageUrl(editingNews.image_url);
      } else {
        setFormTitle("");
        setFormDescription("");
        setExistingImageUrl(null);
      }
      setSelectedFile(null);
    }
  }, [isOpen, editingNews]);

  useEffect(() => {
    if (!isOpen) {
      setFormTitle("");
      setFormDescription("");
      setSelectedFile(null);
      setExistingImageUrl(null);
      setShowDeleteConfirm(false);
      setErrorNotificationMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;

    setIsSaving(true);

    try {
      let savedNewsId = editingNews?.id;

      if (editingNews) {
        await axiosPrivate.put("news/manage-news", {
          news_id: editingNews.id,
          title: formTitle.trim(),
          description: formDescription || null,
        });
      } else {
        const response = await axiosPrivate.post("news/manage-news", {
          title: formTitle.trim(),
          description: formDescription || null,
        });
        savedNewsId = response.data.news.id;
      }

      if (selectedFile && savedNewsId) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("news_id", savedNewsId.toString());

        const response = await axiosPrivate.post(
          "news/manage-news-image",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        setExistingImageUrl(response.data.image_url);
        setIsUploadingImage(false);
      }

      setSuccessNotificationMessage(
        editingNews
          ? "Noticia actualizada exitosamente"
          : "Noticia creada exitosamente"
      );
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);

      if (onNewsSaved) {
        onNewsSaved();
      }

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Error saving news:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al guardar la noticia"
      );
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsSaving(false);
      setIsUploadingImage(false);
    }
  };

  const handleDeleteExistingImage = async () => {
    if (!editingNews?.id) return;

    try {
      await axiosPrivate.delete("news/manage-news-image", {
        data: { news_id: editingNews.id },
      });
      setExistingImageUrl(null);
      setSuccessNotificationMessage("Imagen eliminada exitosamente");
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
      if (onNewsSaved) {
        onNewsSaved();
      }
    } catch (err: any) {
      console.error("Error deleting image:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al eliminar la imagen"
      );
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    }
  };

  const handleDeleteNews = async () => {
    if (!editingNews?.id) return;

    setIsDeleting(true);

    try {
      await axiosPrivate.delete("news/manage-news", {
        data: { news_id: editingNews.id },
      });

      setSuccessNotificationMessage("Noticia eliminada exitosamente");
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);

      if (onNewsSaved) {
        onNewsSaved();
      }

      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err: any) {
      console.error("Error deleting news:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al eliminar la noticia"
      );
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isSubmitDisabled =
    !formTitle.trim() || isSaving || isUploadingImage || isDeleting;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1">
                    <div className="bg-gray-50 px-4 py-20 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            {editingNews ? "Editar Noticia" : "Nueva Noticia"}
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            {editingNews
                              ? "Modifica la informacion de la noticia."
                              : "Completa la informacion para crear una nueva noticia."}
                          </p>
                        </div>
                        <div className="flex h-7 items-center">
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
                    </div>

                    <div className="px-4 sm:px-6 pt-6">
                      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
                        <div className="flex">
                          <div className="shrink-0">
                            <InformationCircleIcon
                              className="size-5 text-blue-600"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-blue-800">
                              Noticias del panel administrativo
                            </p>
                            <p className="mt-1 text-xs text-blue-700">
                              Comparte avisos importantes con la comunidad.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0">
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="title"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Titulo <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="title"
                            name="title"
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                            placeholder="Ej: Aviso importante"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="description"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Descripcion
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <textarea
                            id="description"
                            name="description"
                            rows={5}
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                            placeholder="Descripcion de la noticia..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5">
                            Imagen
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          {existingImageUrl && !selectedFile && (
                            <div className="mb-4">
                              <div className="flex items-center gap-4 rounded-md border border-gray-200 px-3 py-3">
                                <img
                                  src={existingImageUrl}
                                  alt="Imagen actual"
                                  className="size-20 rounded-md object-cover bg-gray-100"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700">
                                    Imagen actual
                                  </p>
                                  <div className="mt-2 flex items-center gap-3">
                                    <a
                                      href={existingImageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-primary hover:text-primary/80"
                                    >
                                      Ver
                                    </a>
                                    <button
                                      type="button"
                                      onClick={handleDeleteExistingImage}
                                      className="text-sm font-medium text-red-600 hover:text-red-500"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedFile && (
                            <div className="mb-4">
                              <div className="flex items-center gap-4 rounded-md border border-green-200 bg-green-50 px-3 py-3">
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt="Vista previa"
                                    className="size-20 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="size-20 rounded-md bg-green-100 flex items-center justify-center text-xs text-green-700">
                                    Imagen
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-green-700 truncate">
                                    {selectedFile.name}
                                  </p>
                                  <p className="mt-1 text-xs text-green-600">
                                    Lista para subir
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleRemoveSelectedFile}
                                  className="text-sm font-medium text-red-600 hover:text-red-500"
                                >
                                  <TrashIcon className="size-5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {!selectedFile && (
                            <div className="text-center rounded-lg border border-dashed border-gray-300 px-6 py-10">
                              <PhotoIcon className="mx-auto size-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                                {existingImageUrl
                                  ? "Reemplazar imagen"
                                  : "Sin imagen"}
                              </h3>
                              <p className="mt-1 text-sm text-gray-500">
                                {existingImageUrl
                                  ? "Selecciona una nueva imagen para reemplazar la actual"
                                  : "Sube una imagen JPG o PNG"}
                              </p>
                              <div className="mt-6">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  className="hidden"
                                  onChange={handleFileSelect}
                                  accept="image/*"
                                />
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                  <PlusIcon className="mr-1.5 -ml-0.5 size-5" />
                                  Seleccionar imagen
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                    <div className="flex flex-wrap justify-between gap-3">
                      {editingNews && (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isSaving || isUploadingImage || isDeleting}
                          className="inline-flex items-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-xs ring-1 ring-inset ring-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <TrashIcon className="mr-1.5 size-5" />
                          Eliminar noticia
                        </button>
                      )}
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isSubmitDisabled}
                          className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving || isUploadingImage
                            ? "Guardando..."
                            : "Guardar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 text-red-600"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar eliminacion
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Estas seguro de que deseas eliminar esta noticia? Esta
                      accion tambien eliminara la imagen asociada.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteNews}
                  disabled={isDeleting}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showSuccessNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-6 text-green-400"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          {successNotificationMessage ||
                            "Guardado exitosamente"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los cambios se han guardado correctamente.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSuccessNotification(false);
                          }}
                          className="inline-flex hover:cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                        >
                          <span className="sr-only">Cerrar</span>
                          <XMarkIconSolid
                            aria-hidden="true"
                            className="size-5"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body
        )}

      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showErrorNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <XCircleIcon
                          aria-hidden="true"
                          className="size-6 text-red-600"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Error
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {errorNotificationMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowErrorNotification(false);
                          }}
                          className="inline-flex hover:cursor-pointer rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900"
                        >
                          <span className="sr-only">Cerrar</span>
                          <XMarkIconSolid
                            aria-hidden="true"
                            className="size-5"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default NewsDrawer;
