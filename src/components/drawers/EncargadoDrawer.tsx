import React, { useEffect, useState } from "react";
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
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface StudentUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string | null;
  cedula: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  profile: {
    user: number;
    carnet: string | null;
    birthdate: string | null;
    address: string | null;
    name_encargado: string | null;
    parentesco_encargado: string | null;
    cedula_encargado: string | null;
    phone_encargado: string | null;
    email_encargado: string | null;
    date_matricula: string | null;
    name_sponsor: string | null;
    amount_sponsor: number | null;
    phone_sponsor: string | null;
    email_sponsor: string | null;
    gender: string | null;
    work: string | null;
    is_becado?: boolean;
    becado_percentage?: number | null;
  } | null;
}

interface EncargadoDrawerProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (updatedUser: StudentUser) => void;
}

const FIELDS = [
  {
    key: "name_encargado",
    label: "Nombre del encargado",
    type: "text",
    placeholder: "Nombre completo",
  },
  {
    key: "parentesco_encargado",
    label: "Parentesco del encargado",
    type: "text",
    placeholder: "Madre, padre, tutor...",
  },
  {
    key: "cedula_encargado",
    label: "Cédula del encargado",
    type: "text",
    placeholder: "0-0000-0000",
  },
  {
    key: "phone_encargado",
    label: "Teléfono del encargado",
    type: "tel",
    placeholder: "0000-0000",
  },
  {
    key: "email_encargado",
    label: "Email del encargado",
    type: "email",
    placeholder: "correo@ejemplo.com",
  },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

const emptyForm = (): Record<FieldKey, string> => ({
  name_encargado: "",
  parentesco_encargado: "",
  cedula_encargado: "",
  phone_encargado: "",
  email_encargado: "",
});

const seedForm = (fetched: StudentUser): Record<FieldKey, string> => {
  const next = emptyForm();
  if (!fetched.profile) return next;
  for (const field of FIELDS) {
    next[field.key] = fetched.profile[field.key] || "";
  }
  return next;
};

const EncargadoDrawer: React.FC<EncargadoDrawerProps> = ({
  userId,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [user, setUser] = useState<StudentUser | null>(null);
  const [form, setForm] = useState<Record<FieldKey, string>>(emptyForm());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await axiosPrivate.get("users/get-user-info", {
          params: { id: userId },
        });
        if (cancelled) return;
        const fetched: StudentUser = response.data.user;
        setUser(fetched);
        setForm(seedForm(fetched));
      } catch {
        if (cancelled) return;
        setErrorMessage("Error al cargar la información del encargado");
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, axiosPrivate]);

  const handleSave = async () => {
    if (!userId) return;

    const profileData: Record<string, string | null> = {};
    for (const field of FIELDS) {
      const current = user?.profile?.[field.key] || "";
      if (form[field.key] !== current) {
        profileData[field.key] = form[field.key] || null;
      }
    }

    if (Object.keys(profileData).length === 0) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      const response = await axiosPrivate.put("users/update-user-info", {
        id: userId,
        profile: profileData,
      });

      const updatedUser: StudentUser = response.data.user;
      if (updatedUser) {
        setUser(updatedUser);
        setForm(seedForm(updatedUser));
        onSaveSuccess?.(updatedUser);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      onClose();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { error?: string } } };
      setErrorMessage(
        anyErr?.response?.data?.error ||
          "Error al guardar la información del encargado",
      );
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const studentName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Sin nombre"
    : "";
  const carnet = user?.profile?.carnet;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-40">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/40 transition-opacity duration-300 data-closed:opacity-0"
        />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <div className="relative flex h-full flex-col bg-white shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-900 px-4 py-5 sm:px-6 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <UserGroupIcon className="size-6 text-gray-300 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <DialogTitle className="text-base font-semibold text-white">
                            Encargado
                          </DialogTitle>
                          <p className="mt-1 text-sm text-gray-300 truncate">
                            {studentName
                              ? `${studentName}${carnet ? ` (${carnet})` : ""}`
                              : "Cargando..."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md text-gray-400 hover:text-white shrink-0"
                      >
                        <span className="sr-only">Cerrar panel</span>
                        <XMarkIcon className="size-6" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                      </div>
                    ) : !user ? (
                      <p className="text-center text-sm text-gray-500 py-8">
                        Sin información disponible.
                      </p>
                    ) : (
                      <div className="space-y-3.5">
                        {FIELDS.map((field) => (
                          <div key={field.key}>
                            <label
                              htmlFor={field.key}
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              {field.label}
                            </label>
                            <div className="mt-2">
                              <input
                                id={field.key}
                                name={field.key}
                                type={field.type}
                                value={form[field.key]}
                                placeholder={field.placeholder}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-4 py-4">
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
                      disabled={!user || isSaving}
                      className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Success Notification */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showSuccess}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <CheckCircleIcon className="size-6 text-green-500" />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Encargado actualizado
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los datos del encargado se guardaron correctamente.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowSuccess(false)}
                          className="inline-flex rounded-md text-gray-400 hover:text-gray-500"
                        >
                          <XMarkIconSolid className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body,
        )}

      {/* Error Notification */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showError}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <XCircleIcon className="size-6 text-red-500" />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Error
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {errorMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowError(false)}
                          className="inline-flex rounded-md text-gray-400 hover:text-gray-500"
                        >
                          <XMarkIconSolid className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default EncargadoDrawer;
