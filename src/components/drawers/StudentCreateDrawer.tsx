import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Transition,
} from "@headlessui/react";
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { PiBroom } from "react-icons/pi";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import * as Yup from "yup";

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
}

interface StudentCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: (newUser: StudentUser) => void;
}

const STORAGE_KEY = "student_create_form_data";

const validationSchema = Yup.object({
  first_name: Yup.string()
    .required("El nombre es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: Yup.string()
    .required("El apellido es obligatorio")
    .min(2, "El apellido debe tener al menos 2 caracteres"),
  email: Yup.string()
    .required("El email es obligatorio")
    .email("El email debe ser válido"),
  phone: Yup.string().required("El teléfono es obligatorio"),
  cedula: Yup.string().required("La cédula es obligatoria"),
  carnet: Yup.string().required("El carnet es obligatorio"),
  birthdate: Yup.string().required("La fecha de nacimiento es obligatoria"),
  address: Yup.string().required("La dirección es obligatoria"),
  date_matricula: Yup.string().required("La fecha de matrícula es obligatoria"),
  gender: Yup.string()
    .required("El género es obligatorio")
    .oneOf(["F", "M"], "El género debe ser Femenino o Masculino"),
});

const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

const StudentCreateDrawer: React.FC<StudentCreateDrawerProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastCarnet, setLastCarnet] = useState<string | null>(null);

  // Form state - Basic
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");

  // Form state - Student Profile
  const [carnet, setCarnet] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [address, setAddress] = useState("");
  const [dateMatricula, setDateMatricula] = useState(getTodayDate());
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

  const role = "student"; // Fixed role

  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    const formData = {
      firstName,
      lastName,
      email,
      cedula,
      phone,
      carnet,
      birthdate,
      address,
      dateMatricula,
      gender,
      work,
      nameEncargado,
      parentescoEncargado,
      cedulaEncargado,
      phoneEncargado,
      emailEncargado,
      nameSponsor,
      amountSponsor,
      phoneSponsor,
      emailSponsor,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [
    firstName,
    lastName,
    email,
    cedula,
    phone,
    carnet,
    birthdate,
    address,
    dateMatricula,
    gender,
    work,
    nameEncargado,
    parentescoEncargado,
    cedulaEncargado,
    phoneEncargado,
    emailEncargado,
    nameSponsor,
    amountSponsor,
    phoneSponsor,
    emailSponsor,
  ]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const formData = JSON.parse(saved);
        setFirstName(formData.firstName || "");
        setLastName(formData.lastName || "");
        setEmail(formData.email || "");
        setCedula(formData.cedula || "");
        setPhone(formData.phone || "");
        setCarnet(formData.carnet || "");
        setBirthdate(formData.birthdate || "");
        setAddress(formData.address || "");
        setDateMatricula(formData.dateMatricula || getTodayDate());
        setGender(formData.gender || "");
        setWork(formData.work || "");
        setNameEncargado(formData.nameEncargado || "");
        setParentescoEncargado(formData.parentescoEncargado || "");
        setCedulaEncargado(formData.cedulaEncargado || "");
        setPhoneEncargado(formData.phoneEncargado || "");
        setEmailEncargado(formData.emailEncargado || "");
        setNameSponsor(formData.nameSponsor || "");
        setAmountSponsor(formData.amountSponsor || "");
        setPhoneSponsor(formData.phoneSponsor || "");
        setEmailSponsor(formData.emailSponsor || "");
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  }, []);

  // Clear form and localStorage
  const clearForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setCedula("");
    setPhone("");
    setCarnet("");
    setBirthdate("");
    setAddress("");
    setDateMatricula(getTodayDate());
    setGender("");
    setWork("");
    setNameEncargado("");
    setParentescoEncargado("");
    setCedulaEncargado("");
    setPhoneEncargado("");
    setEmailEncargado("");
    setNameSponsor("");
    setAmountSponsor("");
    setPhoneSponsor("");
    setEmailSponsor("");
    setErrors({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Fetch last carnet when drawer opens
  const fetchLastCarnet = useCallback(async () => {
    try {
      const response = await axiosPrivate.get<{ last_carnet: string | null }>(
        "users/get-last-carnet"
      );
      console.log("Last carnet response:", response.data);
      setLastCarnet(response.data.last_carnet || null);
    } catch (err: any) {
      console.error("Error fetching last carnet:", err);
      setLastCarnet(null);
      // Don't show error to user, just log it
    }
  }, [axiosPrivate]);

  // Load from localStorage when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadFromLocalStorage();
      fetchLastCarnet();
    }
  }, [isOpen, loadFromLocalStorage, fetchLastCarnet]);

  // Save to localStorage on input change (debounced)
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [
    isOpen,
    saveToLocalStorage,
    firstName,
    lastName,
    email,
    cedula,
    phone,
    carnet,
    birthdate,
    address,
    dateMatricula,
    gender,
    work,
    nameEncargado,
    parentescoEncargado,
    cedulaEncargado,
    phoneEncargado,
    emailEncargado,
    nameSponsor,
    amountSponsor,
    phoneSponsor,
    emailSponsor,
  ]);

  // Validate form
  const validateForm = async () => {
    try {
      await validationSchema.validate(
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          cedula: cedula,
          carnet: carnet,
          birthdate: birthdate,
          address: address,
          date_matricula: dateMatricula,
          gender: gender,
        },
        { abortEarly: false }
      );
      setErrors({});
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

  // Handle create click
  const handleCreateClick = async () => {
    const isValid = await validateForm();
    if (isValid) {
      setShowConfirmDialog(true);
    }
  };

  // Handle actual creation
  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const createData: any = {
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        cedula: cedula.trim(),
        role: role,
        carnet: carnet.trim(),
        birthdate: birthdate,
        address: address.trim(),
        date_matricula: dateMatricula,
        gender: gender,
      };

      // Optional fields
      if (work.trim()) {
        createData.work = work.trim();
      }
      if (nameEncargado.trim()) {
        createData.name_encargado = nameEncargado.trim();
      }
      if (parentescoEncargado.trim()) {
        createData.parentesco_encargado = parentescoEncargado.trim();
      }
      if (cedulaEncargado.trim()) {
        createData.cedula_encargado = cedulaEncargado.trim();
      }
      if (phoneEncargado.trim()) {
        createData.phone_encargado = phoneEncargado.trim();
      }
      if (emailEncargado.trim()) {
        createData.email_encargado = emailEncargado.trim();
      }
      if (nameSponsor.trim()) {
        createData.name_sponsor = nameSponsor.trim();
      }
      if (amountSponsor.trim()) {
        createData.amount_sponsor = parseInt(amountSponsor);
      }
      if (phoneSponsor.trim()) {
        createData.phone_sponsor = phoneSponsor.trim();
      }
      if (emailSponsor.trim()) {
        createData.email_sponsor = emailSponsor.trim();
      }

      const response = await axiosPrivate.post("auth/create-user", createData);

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);

      // Notify parent component
      if (onUserCreated && response.data?.user) {
        const userData = response.data.user;
        const newUser: StudentUser = {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          cedula: userData.cedula || null,
          phone: userData.phone || null,
          role: userData.role,
          is_active:
            userData.is_active !== undefined ? userData.is_active : false,
          is_staff: userData.is_staff !== undefined ? userData.is_staff : false,
          is_superuser:
            userData.is_superuser !== undefined ? userData.is_superuser : false,
          profile: userData.profile || null,
        };
        onUserCreated(newUser);
      }

      // Clear form and localStorage
      clearForm();

      // Close drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Error creating user:", err);
      setShowConfirmDialog(false);

      // Handle duplicate email or cedula errors
      const errorMessage =
        err?.response?.data?.error || err?.response?.data?.detail || "";
      let errorString = "";

      // Handle different error formats (string, tuple, object)
      if (typeof errorMessage === "string") {
        errorString = errorMessage;
      } else if (Array.isArray(errorMessage) && errorMessage.length > 1) {
        // Handle tuple format: (1062, "Duplicate entry...")
        errorString = String(errorMessage[1] || errorMessage[0] || "");
      } else {
        errorString = JSON.stringify(errorMessage);
      }

      // Determine error message
      let errorMsg = "";

      // Check for validation error format: {'cedula': ['Ya existe Usuario con este Cedula.']}
      if (
        typeof errorMessage === "object" &&
        errorMessage !== null &&
        !Array.isArray(errorMessage)
      ) {
        // Check for cedula validation error
        if (
          errorMessage.cedula &&
          Array.isArray(errorMessage.cedula) &&
          errorMessage.cedula.length > 0
        ) {
          const cedulaErrorMsg = errorMessage.cedula[0];
          if (
            cedulaErrorMsg.includes("Ya existe") ||
            cedulaErrorMsg.includes("ya existe")
          ) {
            errorMsg = `La cédula "${cedula}" ya está registrada por otro usuario. Por favor, verifique el número de cédula.`;
          } else {
            errorMsg = cedulaErrorMsg;
          }
        }
        // Check for email validation error
        else if (
          errorMessage.email &&
          Array.isArray(errorMessage.email) &&
          errorMessage.email.length > 0
        ) {
          const emailErrorMsg = errorMessage.email[0];
          if (
            emailErrorMsg.includes("Ya existe") ||
            emailErrorMsg.includes("ya existe")
          ) {
            errorMsg = `El correo electrónico "${email}" ya está en uso por otro usuario. Por favor, use un correo diferente.`;
          } else {
            errorMsg = emailErrorMsg;
          }
        }
      }

      // If no validation error found, check for duplicate entry format
      if (!errorMsg) {
        // Check for "Usuario ya existe" message (from backend check)
        if (
          errorString.includes("Usuario ya existe") ||
          errorString.includes("usuario ya existe")
        ) {
          errorMsg = `El correo electrónico "${email}" ya está en uso por otro usuario. Por favor, use un correo diferente.`;
        }
        // Check for duplicate email error
        else if (
          errorString.includes("Duplicate entry") &&
          (errorString.includes("email") ||
            errorString.includes("api_user_email"))
        ) {
          const emailMatch = errorString.match(
            /Duplicate entry ['"]([^'"]+)['"]/
          );
          const duplicateEmail = emailMatch ? emailMatch[1] : email;
          errorMsg = `El correo electrónico "${duplicateEmail}" ya está en uso por otro usuario. Por favor, use un correo diferente.`;
        }
        // Check for duplicate cedula error
        else if (
          errorString.includes("Duplicate entry") &&
          (errorString.includes("cedula") ||
            errorString.includes("api_user_cedula"))
        ) {
          const cedulaMatch = errorString.match(
            /Duplicate entry ['"]([^'"]+)['"]/
          );
          const duplicateCedula = cedulaMatch ? cedulaMatch[1] : cedula;
          errorMsg = `La cédula "${duplicateCedula}" ya está registrada por otro usuario. Por favor, verifique el número de cédula.`;
        }
        // Check for validation error in string format
        else if (
          errorString.includes("Ya existe Usuario con este Cedula") ||
          errorString.includes("Ya existe Usuario con este cedula")
        ) {
          errorMsg = `La cédula "${cedula}" ya está registrada por otro usuario. Por favor, verifique el número de cédula.`;
        } else if (
          errorString.includes("Ya existe Usuario con este Email") ||
          errorString.includes("Ya existe Usuario con este email")
        ) {
          errorMsg = `El correo electrónico "${email}" ya está en uso por otro usuario. Por favor, use un correo diferente.`;
        }
        // Generic error
        else {
          errorMsg =
            typeof errorMessage === "string"
              ? errorMessage || "Error al crear el estudiante. Por favor, intenta de nuevo."
              : Array.isArray(errorMessage)
              ? String(errorMessage[1] || errorMessage[0])
              : "Error al crear el estudiante. Por favor, intenta de nuevo.";
        }
      }

      // Show error notification
      setErrorNotificationMessage(errorMsg || "Error al crear el estudiante. Por favor, intenta de nuevo.");
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  // Check if required fields are filled and valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isSubmitDisabled =
    !firstName.trim() ||
    firstName.trim().length < 2 ||
    !lastName.trim() ||
    lastName.trim().length < 2 ||
    !email.trim() ||
    !emailRegex.test(email) ||
    !phone.trim() ||
    !cedula.trim() ||
    !carnet.trim() ||
    !birthdate ||
    !address.trim() ||
    !dateMatricula ||
    !gender ||
    isCreating;

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
                <form className="relative flex h-full flex-col bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6 relative">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1 relative">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            Registrar Estudiante
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Completa la información para crear un nuevo
                            estudiante. El usuario recibirá un correo para
                            establecer su contraseña.
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
                      <button
                        type="button"
                        onClick={clearForm}
                        className="text-xs flex items-center absolute right-4 bottom-4 font-medium text-gray-600 hover:text-gray-900 underline"
                        title="Limpiar todo"
                      >
                        <PiBroom className="size-4 mr-1 text-gray-600 hover:text-gray-900" />
                        <span className="sr-only">Limpiar todo</span>
                        <span className="text-xs">Limpiar todo</span>
                      </button>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-6 py-6 sm:space-y-0 sm:py-0">
                      {/* Basic Information Section */}
                      <div className="px-4 sm:px-6 mt-4">
                        <h3 className="text-sm text-center underline underline-offset-3 font-medium text-gray-900 mb-4">
                          Información básica
                        </h3>
                      </div>

                      {/* First Name */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="first_name"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Nombre <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="first_name"
                            name="first_name"
                            type="text"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value);
                              if (errors.first_name) {
                                setErrors({ ...errors, first_name: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.first_name
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.first_name && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.first_name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Last Name */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="last_name"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Apellidos <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="last_name"
                            name="last_name"
                            type="text"
                            value={lastName}
                            onChange={(e) => {
                              setLastName(e.target.value);
                              if (errors.last_name) {
                                setErrors({ ...errors, last_name: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.last_name
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.last_name && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.last_name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Email <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errors.email) {
                                setErrors({ ...errors, email: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.email
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.email}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Con este correo iniciará sesión
                          </p>
                        </div>
                      </div>

                      {/* Cédula */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="cedula"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Cédula <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="cedula"
                            name="cedula"
                            type="text"
                            value={cedula}
                            onChange={(e) => {
                              setCedula(e.target.value);
                              if (errors.cedula) {
                                setErrors({ ...errors, cedula: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.cedula
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.cedula && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.cedula}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="phone"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Teléfono <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (errors.phone) {
                                setErrors({ ...errors, phone: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.phone
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.phone && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Student Information Section */}
                      <div className="px-4 sm:px-6 mt-4 ">
                        <h3 className="text-sm text-center underline underline-offset-3 font-medium text-gray-900 mb-4">
                          Información del estudiante
                        </h3>
                      </div>

                      {/* Carnet */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="carnet"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Carnet <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="carnet"
                            name="carnet"
                            type="text"
                            value={carnet}
                            onChange={(e) => {
                              setCarnet(e.target.value);
                              if (errors.carnet) {
                                setErrors({ ...errors, carnet: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.carnet
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.carnet && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.carnet}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            {lastCarnet ? (
                              <>
                                Último carnet asignado:{" "}
                                <span className="font-medium">
                                  {lastCarnet}
                                </span>
                              </>
                            ) : (
                              "No hay carnet asignado aún"
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Birthdate */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="birthdate"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Fecha de nacimiento{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="birthdate"
                            name="birthdate"
                            type="date"
                            value={birthdate}
                            onChange={(e) => {
                              setBirthdate(e.target.value);
                              if (errors.birthdate) {
                                setErrors({ ...errors, birthdate: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.birthdate
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.birthdate && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.birthdate}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="address"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Dirección <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <textarea
                            id="address"
                            name="address"
                            rows={3}
                            value={address}
                            onChange={(e) => {
                              setAddress(e.target.value);
                              if (errors.address) {
                                setErrors({ ...errors, address: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.address
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.address && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date Matricula */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="date_matricula"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Fecha de matrícula{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="date_matricula"
                            name="date_matricula"
                            type="date"
                            value={dateMatricula}
                            onChange={(e) => {
                              setDateMatricula(e.target.value);
                              if (errors.date_matricula) {
                                setErrors({ ...errors, date_matricula: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.date_matricula
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.date_matricula && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.date_matricula}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="gender"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Género <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <select
                            id="gender"
                            name="gender"
                            value={gender}
                            onChange={(e) => {
                              setGender(e.target.value);
                              if (errors.gender) {
                                setErrors({ ...errors, gender: "" });
                              }
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.gender
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          >
                            <option value="">Seleccionar</option>
                            <option value="F">Femenino</option>
                            <option value="M">Masculino</option>
                          </select>
                          {errors.gender && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.gender}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Work */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="work"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Trabaja en
                          </label>
                        </div>
                        <div className="sm:col-span-2">
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

                      {/* Encargado Section */}
                      <div className="px-4 sm:px-6 mt-4 ">
                        <h3 className="text-sm text-center underline underline-offset-3 font-medium text-gray-900 mb-4">
                          Encargado
                        </h3>
                      </div>

                      {/* Name Encargado */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="name_encargado"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Nombre del encargado
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="name_encargado"
                            name="name_encargado"
                            type="text"
                            value={nameEncargado}
                            onChange={(e) => setNameEncargado(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Parentesco Encargado */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="parentesco_encargado"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Parentesco del encargado
                          </label>
                        </div>
                        <div className="sm:col-span-2">
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
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="cedula_encargado"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Cédula del encargado
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="cedula_encargado"
                            name="cedula_encargado"
                            type="text"
                            value={cedulaEncargado}
                            onChange={(e) => setCedulaEncargado(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Phone Encargado */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="phone_encargado"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Teléfono del encargado
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="phone_encargado"
                            name="phone_encargado"
                            type="tel"
                            value={phoneEncargado}
                            onChange={(e) => setPhoneEncargado(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Email Encargado */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="email_encargado"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Email del encargado
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="email_encargado"
                            name="email_encargado"
                            type="email"
                            value={emailEncargado}
                            onChange={(e) => setEmailEncargado(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Patrocinador Section */}
                      <div className="px-4 sm:px-6 mt-4 ">
                        <h3 className="text-sm text-center underline underline-offset-3 font-medium text-gray-900 mb-4">
                          Patrocinador
                        </h3>
                      </div>

                      {/* Name Sponsor */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="name_sponsor"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Nombre del patrocinador
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="name_sponsor"
                            name="name_sponsor"
                            type="text"
                            value={nameSponsor}
                            onChange={(e) => setNameSponsor(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Amount Sponsor */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="amount_sponsor"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Monto del patrocinador
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="amount_sponsor"
                            name="amount_sponsor"
                            type="number"
                            value={amountSponsor}
                            onChange={(e) => setAmountSponsor(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Phone Sponsor */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="phone_sponsor"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Teléfono del patrocinador
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="phone_sponsor"
                            name="phone_sponsor"
                            type="tel"
                            value={phoneSponsor}
                            onChange={(e) => setPhoneSponsor(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Email Sponsor */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="email_sponsor"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Email del patrocinador
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="email_sponsor"
                            name="email_sponsor"
                            type="email"
                            value={emailSponsor}
                            onChange={(e) => setEmailSponsor(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

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
                      onClick={handleCreateClick}
                      disabled={isSubmitDisabled}
                      className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? "Creando..." : "Crear"}
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
                      ¿Estás seguro de que deseas crear este estudiante? El
                      usuario recibirá un correo electrónico para establecer su
                      contraseña y podrá iniciar sesión una vez que active su
                      cuenta.
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
                          ¡Estudiante creado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          El usuario recibirá un correo para establecer su
                          contraseña.
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
                          <XMarkIconSolid aria-hidden="true" className="size-5" />
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

      {/* Error Notification - Rendered via Portal outside Dialog */}
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
                          Error al crear
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

export default StudentCreateDrawer;
