import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "../api/axios";
import { FaRegNewspaper, FaEye, FaEyeSlash } from "react-icons/fa";
import { TbPasswordUser } from "react-icons/tb";
import { ImCancelCircle } from "react-icons/im";
import { CgPiano } from "react-icons/cg";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/24/outline";
import * as Yup from "yup";

const SET_NEW_PASSWORD_URL = "auth/set-new-password";
const instrumentsImages = [
  "/guiseppe_sinopoli.jpg",
  "/guitar.jpg",
  "/orchestra.jpg",
  "/piano.png",
  "/saxophone.png",
  "/violin.jpg",
];

const passwordSchema = Yup.object({
  password: Yup.string()
    .min(9, "La contraseña debe tener más de 8 caracteres")
    .matches(/[A-Z]/, "La contraseña debe incluir al menos una mayúscula")
    .matches(
      /[^A-Za-z0-9]/,
      "La contraseña debe incluir al menos un carácter especial"
    )
    .required("Debes ingresar una contraseña"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Las contraseñas deben coincidir")
    .required("Debes confirmar la contraseña"),
});

type FormErrors = {
  password?: string;
  confirmPassword?: string;
};

const ResetPassword = () => {
  const errRef = useRef<HTMLParagraphElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [errMsg, setErrMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [heroImage] = useState(
    () =>
      instrumentsImages[Math.floor(Math.random() * instrumentsImages.length)]
  );

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const isLinkInvalid = !uid || !token;

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
    setFormErrors((prev) => ({ ...prev, password: undefined }));
  }, [password]);

  useEffect(() => {
    setErrMsg("");
    setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
  }, [confirmPassword]);

  const passwordRequirements = useMemo(() => {
    return [
      {
        id: "length",
        label: "Más de 8 caracteres",
        satisfied: password.length >= 9,
      },
      {
        id: "uppercase",
        label: "Al menos una letra mayúscula",
        satisfied: /[A-Z]/.test(password),
      },
      {
        id: "special",
        label: "Al menos un carácter especial",
        satisfied: /[^A-Za-z0-9]/.test(password),
      },
      {
        id: "match",
        label: "Las contraseñas coinciden",
        satisfied:
          password.length > 0 &&
          confirmPassword.length > 0 &&
          password === confirmPassword,
      },
    ];
  }, [password, confirmPassword]);

  const isSubmitDisabled = useMemo(() => {
    return (
      isLinkInvalid ||
      passwordRequirements.some((requirement) => !requirement.satisfied) ||
      isLoading
    );
  }, [isLinkInvalid, isLoading, passwordRequirements]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLinkInvalid) {
      setErrMsg("El enlace de recuperación no es válido o ha expirado");
      errRef.current?.focus();
      return;
    }

    try {
      await passwordSchema.validate(
        { password, confirmPassword },
        { abortEarly: false }
      );
      setFormErrors({});
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const fieldErrors: FormErrors = {};
        validationError.inner.forEach((err) => {
          if (err.path && !fieldErrors[err.path as keyof FormErrors]) {
            fieldErrors[err.path as keyof FormErrors] = err.message;
          }
        });
        setFormErrors(fieldErrors);
        setErrMsg("Por favor corrige los campos marcados");
        errRef.current?.focus();
        return;
      }
    }

    setIsLoading(true);
    setErrMsg("");

    try {
      await axios.post(
        SET_NEW_PASSWORD_URL,
        JSON.stringify({ uid, token, password }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      setSuccessMsg(
        "Tu contraseña se actualizó correctamente. Inicia sesión con tus nuevas credenciales."
      );
      setIsDialogOpen(true);
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (!error?.response) {
        setErrMsg("No hay respuesta del servidor");
      } else if (error.response?.status === 400) {
        const detail =
          error.response?.data?.error || "Datos de recuperación inválidos";
        setErrMsg(detail);
      } else if (error.response?.status === 404) {
        setErrMsg("Usuario no encontrado");
      } else {
        setErrMsg("No se pudo restablecer la contraseña");
      }
      errRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="sm:h-screen bg-white flex items-center justify-center sm:py-4 lg:py-16">
        <div className="lg:max-w-5xl sm:max-w-xl h-full w-full flex items-center justify-center">
          <div className="bg-white sm:rounded-2xl w-full h-full shadow-2xl overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-1/2 relative">
              <img
                alt="Instrumento musical"
                src={heroImage}
                className="w-full h-48 lg:h-full object-cover"
              />
              <div className="absolute inset-0 bg-opacity-40 flex items-center justify-center lg:justify-start lg:items-end lg:p-8">
                <div className="text-white text-center lg:text-left">
                  <h1 className="text-3xl lg:text-4xl lg:font-semibold font-bold mb-2">
                    Portal Educativo
                  </h1>
                  <p className="text-lg lg:text-base font-roboto">
                    Escuela de Música de Cartago
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
              <div className="w-full max-w-md mx-auto">
                <img
                  src="/emmc_logo.png"
                  alt="Logo"
                  className="h-22 sm:h-26 mx-auto mb-8"
                />

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <p
                    ref={errRef}
                    className={
                      errMsg
                        ? "rounded-md flex items-center border border-red-900/50 bg-red-900/25 px-3 py-2 text-sm text-red-900 font-semibold"
                        : "sr-only"
                    }
                    aria-live="assertive"
                    role="alert"
                  >
                    <ImCancelCircle className="w-4 h-4 mr-1" />
                    {errMsg}
                  </p>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        ref={passwordRef}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="Ingresa tu nueva contraseña"
                        disabled={isLinkInvalid}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                        aria-label={
                          showPassword
                            ? "Ocultar contraseñas"
                            : "Mostrar contraseñas"
                        }
                      >
                        {showPassword ? (
                          <FaEyeSlash className="w-5 h-5" />
                        ) : (
                          <FaEye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="mt-2 text-sm text-red-600">
                        {formErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirmar contraseña
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirm-password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Repite tu nueva contraseña"
                      disabled={isLinkInvalid}
                    />
                    {formErrors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">
                        {formErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="px-4 -mt-2 pb-4 sm:px-0">
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold text-primary">
                        Requisitos de contraseña
                      </legend>
                      {passwordRequirements.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center space-x-3 text-sm text-gray-600"
                        >
                          <input
                            type="checkbox"
                            className="size-4 rounded border-gray-300 accent-primary/75 focus:ring-primary"
                            checked={item.satisfied}
                            readOnly
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center"
                  >
                    {isLoading
                      ? "Guardando nueva contraseña..."
                      : "Restablecer contraseña"}
                  </button>

                  <div className="flex items-center justify-center">
                    <Link
                      to="/login"
                      className="text-sm text-primary hover:underline"
                    >
                      Volver a iniciar sesión
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onClose={setIsDialogOpen}
        className="relative z-10"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/25">
                  <CheckIcon
                    aria-hidden="true"
                    className="size-6 text-primary"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    ¡Contraseña actualizada!
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{successMsg}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-1">
                <button
                  type="button"
                  data-autofocus
                  onClick={() => navigate("/login", { replace: true })}
                  className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Ir a iniciar sesión
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default ResetPassword;
