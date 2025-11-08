import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
} from "@headlessui/react";
import {
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface CreatedUser {
  first_name: string;
  last_name: string;
}

interface UserObservation {
  id: number;
  observation: string;
  created_at: string;
  created_user: CreatedUser;
}

interface UserObservationsResponse {
  user_observations: UserObservation[];
}

interface UserObservationsDrawerProps {
  userId: number | null;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserObservationsDrawer: React.FC<UserObservationsDrawerProps> = ({
  userId,
  userName,
  isOpen,
  onClose,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [observations, setObservations] = useState<UserObservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newObservation, setNewObservation] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingObservationId, setDeletingObservationId] = useState<
    number | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successTitle, setSuccessTitle] = useState("");

  useEffect(() => {
    if (isOpen && userId) {
      fetchObservations();
    } else if (!isOpen) {
      // Clear form state when drawer closes
      setTimeout(() => {
        setNewObservation("");
        setShowCreateForm(false);
        setError(null);
        setSuccessTitle("");
        setSuccessMessage("");
      }, 1000);
    }
  }, [isOpen, userId]);

  const fetchObservations = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<UserObservationsResponse>(
        `users/manage-user-observation?user_id=${userId}`
      );
      setObservations(response.data.user_observations || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar las observaciones del usuario"
      );
      console.error("Error fetching user observations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateObservation = async () => {
    if (!userId || !newObservation.trim()) return;

    try {
      setIsCreating(true);
      setError(null);
      await axiosPrivate.post("users/manage-user-observation", {
        user_id: userId,
        observation: newObservation.trim(),
      });

      // Refresh observations
      await fetchObservations();

      // Reset form
      setNewObservation("");
      setShowCreateForm(false);

      // Show success notification
      setSuccessTitle("¡Observación creada exitosamente!");
      setSuccessMessage("La observación se ha agregado correctamente.");
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al crear la observación");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (observationId: number) => {
    setDeletingObservationId(observationId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingObservationId || !userId) return;

    try {
      setIsDeleting(true);
      setError(null);
      await axiosPrivate.delete("users/manage-user-observation", {
        data: {
          user_id: userId,
          observation_id: deletingObservationId,
        },
      });

      // Refresh observations
      await fetchObservations();

      // Close dialog
      setShowDeleteDialog(false);
      setDeletingObservationId(null);

      // Show success notification
      setSuccessTitle("¡Observación eliminada exitosamente!");
      setSuccessMessage("La observación se ha eliminado correctamente.");
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Error al eliminar la observación"
      );
      setShowDeleteDialog(false);
      setDeletingObservationId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingObservationId(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("es-CR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getCreatorName = (createdUser: CreatedUser) => {
    const name = `${createdUser.first_name || ""} ${
      createdUser.last_name || ""
    }`.trim();
    return name || "Usuario desconocido";
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-gray-900 px-4 py-20 sm:px-6">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-white">
                          Observaciones de {userName}
                        </DialogTitle>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            onClick={onClose}
                            className="relative rounded-md text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-300">
                          Visualiza y gestiona las observaciones del usuario.
                        </p>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="mt-4 text-sm text-gray-600">
                            Cargando observaciones...
                          </p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 sm:px-6 py-6">
                        {/* Create New Observation Button */}
                        <div className="mb-6">
                          {!showCreateForm ? (
                            <button
                              type="button"
                              onClick={() => setShowCreateForm(true)}
                              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Nueva observación
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label
                                  htmlFor="new-observation"
                                  className="block text-sm font-medium text-gray-900 mb-2"
                                >
                                  Nueva observación
                                </label>
                                <textarea
                                  id="new-observation"
                                  rows={3}
                                  value={newObservation}
                                  onChange={(e) =>
                                    setNewObservation(e.target.value)
                                  }
                                  placeholder="Escribe tu observación aquí..."
                                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm resize-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleCreateObservation}
                                  disabled={
                                    isCreating || !newObservation.trim()
                                  }
                                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isCreating ? "Guardando..." : "Guardar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowCreateForm(false);
                                    setNewObservation("");
                                  }}
                                  disabled={isCreating}
                                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Observations List */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-900">
                            Observaciones ({observations.length})
                          </h3>

                          {observations.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-sm text-gray-500">
                                No hay observaciones registradas para este
                                usuario.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {observations.map((observation) => (
                                <div
                                  key={observation.id}
                                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-900 mb-2">
                                        {observation.observation}
                                      </p>
                                      <div className="text-xs text-gray-500">
                                        <p>
                                          Por:{" "}
                                          {getCreatorName(
                                            observation.created_user
                                          )}
                                        </p>
                                        <p>
                                          Fecha:{" "}
                                          {formatDate(observation.created_at)}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteClick(observation.id)
                                      }
                                      className="ml-3 text-gray-400 hover:text-red-600 focus:outline-none focus:text-red-600 transition-colors"
                                    >
                                      <span className="sr-only">
                                        Eliminar observación
                                      </span>
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={handleCancelDelete}
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
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 text-gray-900"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Eliminar observación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas eliminar esta observación?
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:ml-3 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Success Notification */}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          <Transition show={showSuccessNotification}>
            <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <CheckCircleIcon
                      aria-hidden="true"
                      className="size-6 text-primary"
                    />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">
                      {successTitle}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {successMessage}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowSuccessNotification(false)}
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
      </div>
    </>
  );
};

export default UserObservationsDrawer;
