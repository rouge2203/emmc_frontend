import React, { useState, useEffect } from "react";
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
  PlusIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import * as Yup from "yup";

interface CourseType {
  id: number;
  name: string;
  price: number;
  courses_count?: number;
}

interface CourseTypeConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseTypes: CourseType[];
  onCourseTypesUpdated: () => void;
}

interface CourseTypeResponse {
  course_type: CourseType;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .required("El nombre es obligatorio")
    .min(1, "El nombre no puede estar vacío"),
  price: Yup.number()
    .required("El precio es obligatorio")
    .min(0, "El precio debe ser mayor o igual a 0"),
});

const CourseTypeConfigDrawer: React.FC<CourseTypeConfigDrawerProps> = ({
  isOpen,
  onClose,
  courseTypes,
  onCourseTypesUpdated,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<number, boolean>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingTypes, setEditingTypes] = useState<Record<number, CourseType>>(
    {}
  );
  const [newCourseType, setNewCourseType] = useState<{
    name: string;
    price: string;
  }>({
    name: "",
    price: "",
  });

  // Initialize editing types when drawer opens
  useEffect(() => {
    if (isOpen) {
      const initialEditingTypes: Record<number, CourseType> = {};
      courseTypes.forEach((type) => {
        initialEditingTypes[type.id] = { ...type };
      });
      setEditingTypes(initialEditingTypes);
    } else {
      setEditingTypes({});
      setNewCourseType({ name: "", price: "" });
      setErrors({});
    }
  }, [isOpen, courseTypes]);

  // Validate form
  const validateForm = async (name: string, price: string) => {
    try {
      await validationSchema.validate(
        {
          name: name.trim(),
          price: price ? parseFloat(price) : 0,
        },
        { abortEarly: false }
      );
      return true;
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        validationError.inner.forEach((error) => {
          if (error.path) {
            newErrors[error.path] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Handle edit type change
  const handleEditTypeChange = (id: number, field: string, value: string) => {
    setEditingTypes((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === "price" ? value : value,
      },
    }));
    setErrors({});
  };

  // Handle save type
  const handleSaveType = async (id: number) => {
    const editingType = editingTypes[id];
    if (!editingType) return;

    const isValid = await validateForm(
      editingType.name,
      editingType.price.toString()
    );
    if (!isValid) return;

    setIsSaving((prev) => ({ ...prev, [id]: true }));
    try {
      const updateData = {
        course_type_id: id,
        name: editingType.name.trim(),
        price: parseInt(editingType.price.toString()),
      };

      const response = await axiosPrivate.put<CourseTypeResponse>(
        "courses/manage-course-types",
        updateData
      );

      // Update local state
      setEditingTypes((prev) => ({
        ...prev,
        [id]: response.data.course_type,
      }));

      // Refresh course types list
      onCourseTypesUpdated();

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
    } catch (err: any) {
      console.error("Error updating course type:", err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Error al actualizar el tipo de curso.";
      setErrors({ submit: errorMessage });
      setTimeout(() => {
        setErrors({});
      }, 5000);
    } finally {
      setIsSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Handle create new type
  const handleCreateClick = async () => {
    const isValid = await validateForm(newCourseType.name, newCourseType.price);
    if (isValid) {
      setShowConfirmDialog(true);
    }
  };

  const handleCreate = async () => {
    if (!newCourseType.name.trim() || !newCourseType.price) return;

    setIsCreating(true);
    try {
      const createData = {
        name: newCourseType.name.trim(),
        price: parseInt(newCourseType.price),
      };

      await axiosPrivate.post<CourseTypeResponse>(
        "courses/manage-course-types",
        createData
      );

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);

      // Reset form
      setNewCourseType({ name: "", price: "" });
      setErrors({});

      // Refresh course types list
      onCourseTypesUpdated();
    } catch (err: any) {
      console.error("Error creating course type:", err);
      setShowConfirmDialog(false);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Error al crear el tipo de curso.";
      setErrors({ submit: errorMessage });
      setTimeout(() => {
        setErrors({});
      }, 5000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  const isSubmitDisabled =
    !newCourseType.name.trim() || !newCourseType.price || isCreating;

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
                <div className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            Configuración de Tipos de Curso
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Gestiona los tipos de curso y sus precios.
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

                    {/* Error message */}
                    {errors.submit && (
                      <div className="mx-4 mt-4 sm:mx-6">
                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                          <p className="text-sm text-red-800">
                            {errors.submit}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Course Types List */}
                    <div className="px-4 sm:px-6 py-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          Tipos de curso existentes
                        </h3>
                        {courseTypes.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No hay tipos de curso registrados.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {courseTypes.map((type) => {
                              const editingType = editingTypes[type.id];
                              if (!editingType) return null;

                              return (
                                <div
                                  key={type.id}
                                  className="border border-gray-200 rounded-lg p-4"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Nombre
                                      </label>
                                      <input
                                        type="text"
                                        value={editingType.name}
                                        onChange={(e) =>
                                          handleEditTypeChange(
                                            type.id,
                                            "name",
                                            e.target.value
                                          )
                                        }
                                        className="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Precio (₡)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={editingType.price}
                                        onChange={(e) =>
                                          handleEditTypeChange(
                                            type.id,
                                            "price",
                                            e.target.value
                                          )
                                        }
                                        className="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900"
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <div className="flex-1">
                                        <p className="text-xs text-gray-500">
                                          {type.courses_count || 0} curso(s)
                                          usando este tipo
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveType(type.id)}
                                        disabled={isSaving[type.id]}
                                        className="ml-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {isSaving[type.id]
                                          ? "Guardando..."
                                          : "Editar"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Create New Course Type */}
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">
                          Crear nuevo tipo de curso
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nombre <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newCourseType.name}
                              onChange={(e) =>
                                setNewCourseType({
                                  ...newCourseType,
                                  name: e.target.value,
                                })
                              }
                              className={`block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.name
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                              placeholder="Ej: Regular"
                            />
                            {errors.name && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.name}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Precio (₡) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newCourseType.price}
                              onChange={(e) =>
                                setNewCourseType({
                                  ...newCourseType,
                                  price: e.target.value,
                                })
                              }
                              className={`block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.price
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                              placeholder="0"
                            />
                            {errors.price && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.price}
                              </p>
                            )}
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={handleCreateClick}
                              disabled={isSubmitDisabled}
                              className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Crear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
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
                    Confirmar creación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas crear el tipo de curso{" "}
                      {newCourseType.name ? `"${newCourseType.name}"` : ""}?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isCreating ? "Creando..." : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCreating}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:ml-3 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Success Notification - Rendered via Portal outside Dialog */}
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
                          className="size-6 text-primary"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          ¡Operación exitosa!
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
    </>
  );
};

export default CourseTypeConfigDrawer;
