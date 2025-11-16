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
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  XCircleIcon,
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
  } | null;
  last_login: string | null;
  date_joined: string;
}

interface UserResponse {
  user: StudentUser;
}

interface StudentInfoDrawerProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (updatedUser: StudentUser) => void;
}

const StudentInfoDrawer: React.FC<StudentInfoDrawerProps> = ({
  userId,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [user, setUser] = useState<StudentUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showResendEmailDialog, setShowResendEmailDialog] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [showResendEmailNotification, setShowResendEmailNotification] =
    useState(false);
  const [resendEmailNotificationType, setResendEmailNotificationType] =
    useState<"success" | "error">("success");
  const [resendEmailNotificationMessage, setResendEmailNotificationMessage] =
    useState("");

  // Form state - Basic
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [originalIsActive, setOriginalIsActive] = useState(true);

  // Form state - Student Profile
  const [carnet, setCarnet] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [address, setAddress] = useState("");
  const [dateMatricula, setDateMatricula] = useState("");
  const [gender, setGender] = useState("");
  const [work, setWork] = useState("");

  // Form state - Encargado
  const [nameEncargado, setNameEncargado] = useState("");
  const [parentescoEncargado, setParentescoEncargado] = useState("");
  const [cedulaEncargado, setCedulaEncargado] = useState("");
  const [phoneEncargado, setPhoneEncargado] = useState("");
  const [emailEncargado, setEmailEncargado] = useState("");

  // Form state - Patrocinador
  const [nameSponsor, setNameSponsor] = useState("");
  const [amountSponsor, setAmountSponsor] = useState("");
  const [phoneSponsor, setPhoneSponsor] = useState("");
  const [emailSponsor, setEmailSponsor] = useState("");

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

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

      // Set form values - Basic
      setFirstName(userData.first_name || "");
      setLastName(userData.last_name || "");
      setEmail(userData.email || "");
      setCedula(userData.cedula || "");
      setPhone(userData.phone || "");
      setIsActive(userData.is_active);
      setOriginalIsActive(userData.is_active);

      // Set form values - Student Profile
      if (userData.profile) {
        setCarnet(userData.profile.carnet || "");
        setBirthdate(formatDateForInput(userData.profile.birthdate));
        setAddress(userData.profile.address || "");
        setDateMatricula(formatDateForInput(userData.profile.date_matricula));
        setGender(userData.profile.gender || "");
        setWork(userData.profile.work || "");

        // Encargado
        setNameEncargado(userData.profile.name_encargado || "");
        setParentescoEncargado(userData.profile.parentesco_encargado || "");
        setCedulaEncargado(userData.profile.cedula_encargado || "");
        setPhoneEncargado(userData.profile.phone_encargado || "");
        setEmailEncargado(userData.profile.email_encargado || "");

        // Patrocinador
        setNameSponsor(userData.profile.name_sponsor || "");
        setAmountSponsor(userData.profile.amount_sponsor?.toString() || "");
        setPhoneSponsor(userData.profile.phone_sponsor || "");
        setEmailSponsor(userData.profile.email_sponsor || "");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar la información del estudiante"
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

      // Only include fields that have changed - Basic
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

      // Profile data
      const profileData: any = {};
      let hasProfileChanges = false;

      if (user?.profile) {
        if (birthdate !== formatDateForInput(user.profile.birthdate)) {
          profileData.birthdate = birthdate || null;
          hasProfileChanges = true;
        }
        if (address !== (user.profile.address || "")) {
          profileData.address = address || null;
          hasProfileChanges = true;
        }
        if (gender !== (user.profile.gender || "")) {
          profileData.gender = gender || null;
          hasProfileChanges = true;
        }
        if (work !== (user.profile.work || "")) {
          profileData.work = work || null;
          hasProfileChanges = true;
        }

        // Encargado
        if (nameEncargado !== (user.profile.name_encargado || "")) {
          profileData.name_encargado = nameEncargado || null;
          hasProfileChanges = true;
        }
        if (parentescoEncargado !== (user.profile.parentesco_encargado || "")) {
          profileData.parentesco_encargado = parentescoEncargado || null;
          hasProfileChanges = true;
        }
        if (cedulaEncargado !== (user.profile.cedula_encargado || "")) {
          profileData.cedula_encargado = cedulaEncargado || null;
          hasProfileChanges = true;
        }
        if (phoneEncargado !== (user.profile.phone_encargado || "")) {
          profileData.phone_encargado = phoneEncargado || null;
          hasProfileChanges = true;
        }
        if (emailEncargado !== (user.profile.email_encargado || "")) {
          profileData.email_encargado = emailEncargado || null;
          hasProfileChanges = true;
        }

        // Patrocinador
        if (nameSponsor !== (user.profile.name_sponsor || "")) {
          profileData.name_sponsor = nameSponsor || null;
          hasProfileChanges = true;
        }
        const currentAmount = user.profile.amount_sponsor?.toString() || "";
        if (amountSponsor !== currentAmount) {
          profileData.amount_sponsor = amountSponsor
            ? parseInt(amountSponsor)
            : null;
          hasProfileChanges = true;
        }
        if (phoneSponsor !== (user.profile.phone_sponsor || "")) {
          profileData.phone_sponsor = phoneSponsor || null;
          hasProfileChanges = true;
        }
        if (emailSponsor !== (user.profile.email_sponsor || "")) {
          profileData.email_sponsor = emailSponsor || null;
          hasProfileChanges = true;
        }
      }

      if (hasProfileChanges) {
        updateData.profile = profileData;
      }

      const response = await axiosPrivate.put(
        "users/update-user-info",
        updateData
      );

      // Update local user state with response
      const updatedUserData = response.data.user;
      if (updatedUserData) {
        setUser(updatedUserData);
        // Update form values to match response
        setFirstName(updatedUserData.first_name || "");
        setLastName(updatedUserData.last_name || "");
        setEmail(updatedUserData.email || "");
        setCedula(updatedUserData.cedula || "");
        setPhone(updatedUserData.phone || "");
        setIsActive(updatedUserData.is_active);
        setOriginalIsActive(updatedUserData.is_active);

        if (updatedUserData.profile) {
          setBirthdate(formatDateForInput(updatedUserData.profile.birthdate));
          setAddress(updatedUserData.profile.address || "");
          setGender(updatedUserData.profile.gender || "");
          setWork(updatedUserData.profile.work || "");
          setNameEncargado(updatedUserData.profile.name_encargado || "");
          setParentescoEncargado(
            updatedUserData.profile.parentesco_encargado || ""
          );
          setCedulaEncargado(updatedUserData.profile.cedula_encargado || "");
          setPhoneEncargado(updatedUserData.profile.phone_encargado || "");
          setEmailEncargado(updatedUserData.profile.email_encargado || "");
          setNameSponsor(updatedUserData.profile.name_sponsor || "");
          setAmountSponsor(
            updatedUserData.profile.amount_sponsor?.toString() || ""
          );
          setPhoneSponsor(updatedUserData.profile.phone_sponsor || "");
          setEmailSponsor(updatedUserData.profile.email_sponsor || "");
        }

        // Notify parent component
        if (onSaveSuccess) {
          onSaveSuccess(updatedUserData);
        }
      }

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);
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
    setShowResendEmailDialog(true);
  };

  const handleConfirmResendEmail = async () => {
    if (!userId) return;

    setIsResendingEmail(true);
    setError(null);

    try {
      const response = await axiosPrivate.post("auth/resend-activation-email", {
        id: userId,
      });

      setResendEmailNotificationType("success");
      setResendEmailNotificationMessage(
        response.data.detail || "Correo de activación reenviado exitosamente"
      );
      setShowResendEmailNotification(true);
      setShowResendEmailDialog(false);

      setTimeout(() => {
        setShowResendEmailNotification(false);
      }, 5000);
    } catch (err: any) {
      setResendEmailNotificationType("error");
      setResendEmailNotificationMessage(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Error al reenviar el correo de activación"
      );
      setShowResendEmailNotification(true);
      setShowResendEmailDialog(false);

      setTimeout(() => {
        setShowResendEmailNotification(false);
      }, 5000);
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleCancelResendEmail = () => {
    setShowResendEmailDialog(false);
  };

  const getPlaceholderImage = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=155c95&color=fff&size=128`;
  };

  const getGenderDisplay = (gender: string | null): string => {
    if (gender === "F") return "Femenino";
    if (gender === "M") return "Masculino";
    return "";
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
                className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-gray-900 px-4 py-20 sm:px-6">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-white">
                          Información del Estudiante
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
                          Edita la información del estudiante y gestiona su
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

                          {/* Basic Information Section */}
                          <div className="space-y-3.5 pt-4">
                            <h3 className="text-sm/6 font-medium text-center underline underline-offset-3 text-gray-900">
                              Información básica
                            </h3>

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
                                Correo electrónico del usuario con el cual
                                inicia sesión
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
                          </div>

                          {/* Student Information Section */}
                          <div className="space-y-3.5 pt-4 ">
                            <h3 className="text-sm/6 font-medium text-center underline underline-offset-3 text-gray-900">
                              Información del estudiante
                            </h3>

                            {/* Carnet */}
                            <div>
                              <label
                                htmlFor="carnet"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Carnet
                              </label>
                              <div className="mt-2">
                                <input
                                  id="carnet"
                                  name="carnet"
                                  type="text"
                                  value={carnet}
                                  disabled
                                  className="block w-full rounded-md bg-gray-100 px-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 cursor-not-allowed"
                                />
                              </div>
                            </div>

                            {/* Birthdate */}
                            <div>
                              <label
                                htmlFor="birthdate"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Fecha de nacimiento
                              </label>
                              <div className="mt-2">
                                <input
                                  id="birthdate"
                                  name="birthdate"
                                  type="date"
                                  value={birthdate}
                                  onChange={(e) => setBirthdate(e.target.value)}
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Address */}
                            <div>
                              <label
                                htmlFor="address"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Dirección
                              </label>
                              <div className="mt-2">
                                <textarea
                                  id="address"
                                  name="address"
                                  rows={3}
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Date Matricula */}
                            <div>
                              <label
                                htmlFor="date_matricula"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Fecha de matrícula
                              </label>
                              <div className="mt-2">
                                <input
                                  id="date_matricula"
                                  name="date_matricula"
                                  type="date"
                                  value={dateMatricula}
                                  disabled
                                  className="block w-full rounded-md bg-gray-100 px-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 cursor-not-allowed"
                                />
                              </div>
                            </div>

                            {/* Gender */}
                            <div>
                              <label
                                htmlFor="gender"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Género
                              </label>
                              <div className="mt-2">
                                <select
                                  id="gender"
                                  name="gender"
                                  value={gender}
                                  onChange={(e) => setGender(e.target.value)}
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                >
                                  <option value="">Seleccionar</option>
                                  <option value="F">Femenino</option>
                                  <option value="M">Masculino</option>
                                </select>
                              </div>
                            </div>

                            {/* Work */}
                            <div>
                              <label
                                htmlFor="work"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Trabaja en
                              </label>
                              <div className="mt-2">
                                <input
                                  id="work"
                                  name="work"
                                  type="text"
                                  value={work}
                                  onChange={(e) => setWork(e.target.value)}
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Encargado Section */}
                          <div className="space-y-3.5 pt-4">
                            <h3 className="text-sm/6 font-medium text-center underline underline-offset-3 text-gray-900">
                              Encargado
                            </h3>

                            {/* Name Encargado */}
                            <div>
                              <label
                                htmlFor="name_encargado"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Nombre del encargado
                              </label>
                              <div className="mt-2">
                                <input
                                  id="name_encargado"
                                  name="name_encargado"
                                  type="text"
                                  value={nameEncargado}
                                  onChange={(e) =>
                                    setNameEncargado(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Parentesco Encargado */}
                            <div>
                              <label
                                htmlFor="parentesco_encargado"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Parentesco del encargado
                              </label>
                              <div className="mt-2">
                                <input
                                  id="parentesco_encargado"
                                  name="parentesco_encargado"
                                  type="text"
                                  value={parentescoEncargado}
                                  onChange={(e) =>
                                    setParentescoEncargado(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Cedula Encargado */}
                            <div>
                              <label
                                htmlFor="cedula_encargado"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Cédula del encargado
                              </label>
                              <div className="mt-2">
                                <input
                                  id="cedula_encargado"
                                  name="cedula_encargado"
                                  type="text"
                                  value={cedulaEncargado}
                                  onChange={(e) =>
                                    setCedulaEncargado(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Phone Encargado */}
                            <div>
                              <label
                                htmlFor="phone_encargado"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Teléfono del encargado
                              </label>
                              <div className="mt-2">
                                <input
                                  id="phone_encargado"
                                  name="phone_encargado"
                                  type="tel"
                                  value={phoneEncargado}
                                  onChange={(e) =>
                                    setPhoneEncargado(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Email Encargado */}
                            <div>
                              <label
                                htmlFor="email_encargado"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Email del encargado
                              </label>
                              <div className="mt-2">
                                <input
                                  id="email_encargado"
                                  name="email_encargado"
                                  type="email"
                                  value={emailEncargado}
                                  onChange={(e) =>
                                    setEmailEncargado(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Patrocinador Section */}
                          <div className="space-y-3.5 pt-4">
                            <h3 className="text-sm/6 font-medium text-center underline underline-offset-3 text-gray-900">
                              Patrocinador
                            </h3>

                            {/* Name Sponsor */}
                            <div>
                              <label
                                htmlFor="name_sponsor"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Nombre del patrocinador
                              </label>
                              <div className="mt-2">
                                <input
                                  id="name_sponsor"
                                  name="name_sponsor"
                                  type="text"
                                  value={nameSponsor}
                                  onChange={(e) =>
                                    setNameSponsor(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Amount Sponsor */}
                            <div>
                              <label
                                htmlFor="amount_sponsor"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Monto del patrocinador
                              </label>
                              <div className="mt-2">
                                <input
                                  id="amount_sponsor"
                                  name="amount_sponsor"
                                  type="number"
                                  value={amountSponsor}
                                  onChange={(e) =>
                                    setAmountSponsor(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Phone Sponsor */}
                            <div>
                              <label
                                htmlFor="phone_sponsor"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Teléfono del patrocinador
                              </label>
                              <div className="mt-2">
                                <input
                                  id="phone_sponsor"
                                  name="phone_sponsor"
                                  type="tel"
                                  value={phoneSponsor}
                                  onChange={(e) =>
                                    setPhoneSponsor(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>

                            {/* Email Sponsor */}
                            <div>
                              <label
                                htmlFor="email_sponsor"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Email del patrocinador
                              </label>
                              <div className="mt-2">
                                <input
                                  id="email_sponsor"
                                  name="email_sponsor"
                                  type="email"
                                  value={emailSponsor}
                                  onChange={(e) =>
                                    setEmailSponsor(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                />
                              </div>
                            </div>
                            {/* Account Information */}
                            <div className="space-y-4 pt-4">
                              <h3 className="text-sm/6 font-medium text-center underline underline-offset-3 text-gray-900">
                                Información de la cuenta
                              </h3>

                              {/* Last Login */}
                              <div className="flex items-start">
                                <div className="shrink-0">
                                  <ClockIcon
                                    className="size-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Último inicio de sesión
                                  </p>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {user.last_login
                                      ? new Date(
                                          user.last_login
                                        ).toLocaleString("es-CR", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "Nunca"}
                                  </p>
                                </div>
                              </div>

                              {/* Date Joined */}
                              <div className="flex items-start">
                                <div className="shrink-0">
                                  <CalendarDaysIcon
                                    className="size-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Fecha de registro
                                  </p>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {user.date_joined
                                      ? new Date(
                                          user.date_joined
                                        ).toLocaleString("es-CR", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {/* Status */}
                            <fieldset className="pt-4 mt-4 ">
                              <legend className="block text-sm/6 font-medium text-center underline underline-offset-3 text-gray-900 mb-3">
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
                                      El usuario puede iniciar sesión y acceder
                                      al sistema.
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
                                      El usuario no podrá iniciar sesión hasta
                                      que el estado vuelva a activo.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Status explanation and actions */}
                              {!isActive && originalIsActive === false ? (
                                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                  <p className="text-xs text-gray-700 mb-2">
                                    El usuario no podrá iniciar sesión mientras
                                    esté inactivo. Si el usuario no ha
                                    establecido su contraseña, puedes reenviar
                                    el correo de activación para que pueda
                                    activar su cuenta y establecer su
                                    contraseña.
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
                      className="ml-4 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      información del estudiante? Esta acción actualizará los
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

      {/* Resend Activation Email Confirmation Dialog */}
      <Dialog
        open={showResendEmailDialog}
        onClose={handleCancelResendEmail}
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
                    Reenviar correo de activación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas reenviar el correo de
                      activación a {user?.email}? El usuario recibirá un correo
                      con un enlace para establecer su contraseña.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleConfirmResendEmail}
                  disabled={isResendingEmail}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isResendingEmail ? "Enviando..." : "Reenviar"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelResendEmail}
                  disabled={isResendingEmail}
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
                          ¡Guardado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los cambios en la información del estudiante se han
                          actualizado correctamente.
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

      {/* Resend Email Notification - Rendered via Portal outside Dialog */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showResendEmailNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        {resendEmailNotificationType === "success" ? (
                          <CheckCircleIcon
                            aria-hidden="true"
                            className="size-6 text-primary"
                          />
                        ) : (
                          <XCircleIcon
                            aria-hidden="true"
                            className="size-6 text-red-600"
                          />
                        )}
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          {resendEmailNotificationType === "success"
                            ? "¡Correo reenviado exitosamente!"
                            : "Error al reenviar correo"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {resendEmailNotificationMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowResendEmailNotification(false);
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

export default StudentInfoDrawer;
