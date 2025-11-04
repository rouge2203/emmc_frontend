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
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  cedula: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  profile: {
    user: number;
  } | null;
}

interface UserResponse {
  user: AdminUser;
}

interface AdminInfoDrawerProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const AdminInfoDrawer: React.FC<AdminInfoDrawerProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [originalIsActive, setOriginalIsActive] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<UserResponse>(
        `users/get-user-info?id=${userId}`
      );
      const userData = response.data.user;
      setUser(userData);

      // Set form values
      setFirstName(userData.first_name || "");
      setLastName(userData.last_name || "");
      setEmail(userData.email || "");
      setCedula(userData.cedula || "");
      setPhone(userData.phone || "");
      setIsActive(userData.is_active);
      setOriginalIsActive(userData.is_active);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar la información del usuario"
      );
      console.error("Error fetching user data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: any = {
        id: userId,
      };

      // Only include fields that have changed
      if (firstName !== (user?.first_name || "")) {
        updateData.first_name = firstName;
      }
      if (lastName !== (user?.last_name || "")) {
        updateData.last_name = lastName;
      }
      if (email !== (user?.email || "")) {
        updateData.email = email;
      }
      if (cedula !== (user?.cedula || "")) {
        updateData.cedula = cedula;
      }
      if (phone !== (user?.phone || "")) {
        updateData.phone = phone;
      }
      if (isActive !== user?.is_active) {
        updateData.is_active = isActive;
      }

      const response = await axiosPrivate.put(
        "users/update-user-info",
        updateData
      );

      // Update local user state with response
      if (response.data.user) {
        setUser(response.data.user);
        // Update form values to match response
        setFirstName(response.data.user.first_name || "");
        setLastName(response.data.user.last_name || "");
        setEmail(response.data.user.email || "");
        setCedula(response.data.user.cedula || "");
        setPhone(response.data.user.phone || "");
        setIsActive(response.data.user.is_active);
        setOriginalIsActive(response.data.user.is_active);
      }

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);

      // Optionally close the drawer after successful save
      // onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar los cambios");
      console.error("Error saving user data:", err);
      setShowConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
  };

  const handleResendEmail = () => {
    console.log("Sending activation email to:", email);
    // TODO: Call API to resend activation email
  };

  const getPlaceholderImage = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=155c95&color=fff&size=128`;
  };

  const fullName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Sin nombre"
    : "";

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
                          Información del Administrador
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
                          Edita la información del administrador y gestiona su
                          estado.
                        </p>
                      </div>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="mt-4 text-sm text-gray-600">
                            Cargando información...
                          </p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      </div>
                    ) : user ? (
                      <div className="divide-y divide-gray-200 px-4 sm:px-6 py-6">
                        <div className="space-y-3.5">
                          {/* Photo */}
                          <div className="flex justify-center">
                            <img
                              alt={fullName}
                              src={getPlaceholderImage(fullName)}
                              className="inline-block size-20 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5"
                            />
                          </div>

                          {/* First Name */}
                          <div>
                            <label
                              htmlFor="first_name"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Nombre
                            </label>
                            <div className="mt-2">
                              <input
                                id="first_name"
                                name="first_name"
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Last Name */}
                          <div>
                            <label
                              htmlFor="last_name"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Apellido
                            </label>
                            <div className="mt-2">
                              <input
                                id="last_name"
                                name="last_name"
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Email */}
                          <div>
                            <label
                              htmlFor="email"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Email
                            </label>
                            <div className="mt-2">
                              <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                            <p className="mt-1 ml-0.5 text-xs text-gray-500">
                              Correo electrónico del usuario con el cual inicia
                              sesión
                            </p>
                          </div>

                          {/* Cédula */}
                          <div>
                            <label
                              htmlFor="cedula"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Cédula
                            </label>
                            <div className="mt-2">
                              <input
                                id="cedula"
                                name="cedula"
                                type="text"
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Phone */}
                          <div>
                            <label
                              htmlFor="phone"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Teléfono
                            </label>
                            <div className="mt-2">
                              <input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Role (Non-editable) */}
                          <div>
                            <label
                              htmlFor="role"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Rol
                            </label>
                            <div className="mt-2">
                              <input
                                id="role"
                                name="role"
                                type="text"
                                value={user.role || "admin"}
                                disabled
                                className="block w-full rounded-md bg-gray-100 px-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* Status */}
                          <fieldset>
                            <legend className="block text-sm/6 font-medium text-gray-900 mb-3">
                              Estado
                            </legend>
                            <div className="space-y-3">
                              <div className="relative flex items-start">
                                <div className="absolute flex h-6 items-center">
                                  <input
                                    id="status-active"
                                    name="status"
                                    type="radio"
                                    checked={isActive}
                                    onChange={() => setIsActive(true)}
                                    className="relative size-4 appearance-none rounded-full border border-gray-300 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-gray-900 checked:bg-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                                  />
                                </div>
                                <div className="pl-7 text-sm/6">
                                  <label
                                    htmlFor="status-active"
                                    className="font-medium text-gray-900 cursor-pointer"
                                  >
                                    Activo
                                  </label>
                                  <p className="text-gray-500">
                                    El usuario puede iniciar sesión y acceder al
                                    sistema.
                                  </p>
                                </div>
                              </div>
                              <div className="relative flex items-start">
                                <div className="absolute flex h-6 items-center">
                                  <input
                                    id="status-inactive"
                                    name="status"
                                    type="radio"
                                    checked={!isActive}
                                    onChange={() => setIsActive(false)}
                                    className="relative size-4 appearance-none rounded-full border border-gray-300 before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-gray-900 checked:bg-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                                  />
                                </div>
                                <div className="pl-7 text-sm/6">
                                  <label
                                    htmlFor="status-inactive"
                                    className="font-medium text-gray-900 cursor-pointer"
                                  >
                                    Inactivo
                                  </label>
                                  <p className="text-gray-500">
                                    El usuario no podrá iniciar sesión hasta que
                                    el estado vuelva a activo.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Status explanation and actions */}
                            {!isActive && originalIsActive === false ? (
                              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <p className="text-xs text-gray-700 mb-2">
                                  El usuario no podrá iniciar sesión mientras
                                  esté inactivo. Si el usuario no ha establecido
                                  su contraseña, puedes reenviar el correo de
                                  activación para que pueda activar su cuenta y
                                  establecer su contraseña.
                                </p>
                                <button
                                  type="button"
                                  onClick={handleResendEmail}
                                  className="text-xs font-medium text-gray-900 hover:text-gray-700 underline"
                                >
                                  Reenviar correo de activación
                                </button>
                              </div>
                            ) : null}
                          </fieldset>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 justify-end border-t border-gray-200 bg-white px-4 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveClick}
                      disabled={isSaving}
                      className="ml-4 inline-flex justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Cargando..." : "Guardar"}
                    </button>
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
        onClose={handleConfirmCancel}
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
                    Confirmar cambios
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas guardar los cambios en la
                      información del administrador? Esta acción actualizará los
                      datos del usuario.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isSaving ? "Cargando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
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
                      ¡Guardado exitosamente!
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Los cambios en la información del administrador se han
                      actualizado correctamente.
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuccessNotification(false);
                      }}
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

export default AdminInfoDrawer;
