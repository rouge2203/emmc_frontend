import { useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface Classroom {
  id: number;
  number: number;
  name: string;
  display_name: string;
  enrollment_count?: number;
}

interface ClassroomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClassroomSaved: () => void;
  editingClassroom: Classroom | null;
}

export default function ClassroomDrawer({
  isOpen,
  onClose,
  onClassroomSaved,
  editingClassroom,
}: ClassroomDrawerProps) {
  const axiosPrivate = useAxiosPrivate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Form fields
  const [number, setNumber] = useState<string>("");
  const [name, setName] = useState("");

  // Reset form when drawer opens/closes or editing classroom changes
  useEffect(() => {
    if (isOpen) {
      if (editingClassroom) {
        setNumber(editingClassroom.number.toString());
        setName(editingClassroom.name);
      } else {
        setNumber("");
        setName("");
      }
      setError(null);
    }
  }, [isOpen, editingClassroom]);

  const validateForm = () => {
    if (!number) {
      setError("Por favor ingresa el número de aula");
      return false;
    }

    const numValue = parseInt(number);
    if (isNaN(numValue) || numValue < 1) {
      setError("El número de aula debe ser un número positivo");
      return false;
    }

    return true;
  };

  const handleSaveClick = () => {
    if (validateForm()) {
      setShowConfirmDialog(true);
    }
  };

  const handleSave = async () => {
    const numValue = parseInt(number);

    setIsSaving(true);
    setError(null);

    try {
      if (editingClassroom) {
        // Update existing classroom
        await axiosPrivate.put("courses/classrooms", {
          classroom_id: editingClassroom.id,
          number: numValue,
          name: name.trim() || "",
        });
      } else {
        // Create new classroom
        await axiosPrivate.post("courses/classrooms", {
          number: numValue,
          name: name.trim() || "",
        });
      }
      setShowConfirmDialog(false);
      onClassroomSaved();
    } catch (err: any) {
      console.error("Error saving classroom:", err);
      setError(err?.response?.data?.error || "Error al guardar el aula");
      setShowConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  const isSubmitDisabled = !number || isSaving;

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
                <form className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6 relative">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1 relative">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            {editingClassroom ? "Editar Aula" : "Nueva Aula"}
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            {editingClassroom
                              ? `Editando Aula ${editingClassroom.number}`
                              : "Completa la información para crear una nueva aula."}
                          </p>
                        </div>
                        <div className="flex h-7 items-center gap-2">
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

                    {/* Form fields */}
                    <div className="space-y-6 py-6 sm:space-y-0 sm:py-0">
                      {/* Error message */}
                      {error && (
                        <div className="mx-4 sm:mx-6 mt-4 rounded-md bg-red-50 p-4">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      )}

                      {/* Number field */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="classroom-number"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Número de Aula{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            id="classroom-number"
                            value={number}
                            onChange={(e) => {
                              setNumber(e.target.value);
                              if (error) setError(null);
                            }}
                            min="1"
                            placeholder="Ej: 1, 2, 3..."
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Se mostrará como "Aula {number || "#"}"
                          </p>
                        </div>
                      </div>

                      {/* Description field */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="classroom-name"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Descripción
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            id="classroom-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Sala de Piano, Estudio de Grabación..."
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Opcional. Puedes agregar una descripción para
                            identificar mejor el aula.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
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
                        onClick={handleSaveClick}
                        disabled={isSubmitDisabled}
                        className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving
                          ? "Guardando..."
                          : editingClassroom
                            ? "Actualizar"
                            : "Crear"}
                      </button>
                    </div>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCancel}
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
                    {editingClassroom
                      ? "Confirmar actualización"
                      : "Confirmar creación"}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {editingClassroom
                        ? `¿Estás seguro de que deseas actualizar el Aula ${editingClassroom.number}?`
                        : `¿Estás seguro de que deseas crear el Aula ${number}?`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isSaving
                    ? "Guardando..."
                    : editingClassroom
                      ? "Actualizar"
                      : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:ml-3 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
