import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import { FaRegNewspaper } from "react-icons/fa";
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

const RECOVER_PASSWORD_URL = "auth/recover-password";
const instrumentsImages = [
  "/guiseppe_sinopoli.jpg",
  "/guitar.jpg",
  "/orchestra.jpg",
  "/piano.png",
  "/saxophone.png",
  "/violin.jpg",
];

const RecoverPassword = () => {
  const errRef = useRef<HTMLParagraphElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [heroImage] = useState(
    () =>
      instrumentsImages[Math.floor(Math.random() * instrumentsImages.length)]
  );

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
    if (email) {
      setSuccessMsg("");
    }
  }, [email]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(RECOVER_PASSWORD_URL, JSON.stringify({ email }), {
        headers: { "Content-Type": "application/json" },
      });

      setSuccessMsg(
        "Hemos enviado instrucciones a tu correo. Revisa tu bandeja de entrada y sigue los pasos para restablecer tu contraseña."
      );

      setIsDialogOpen(true);
      setEmail("");
    } catch (error: any) {
      if (!error?.response) {
        setErrMsg("No hay respuesta del servidor");
      } else if (error.response?.status === 404) {
        setErrMsg("Usuario no encontrado");
      } else if (error.response?.status === 400) {
        setErrMsg("Debes ingresar un correo electrónico válido");
      } else {
        setErrMsg("No se pudo procesar la solicitud");
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
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      id="email"
                      ref={emailRef}
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setIsDialogOpen(false);
                      }}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Ingresa tu correo electrónico"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center"
                  >
                    {isLoading
                      ? "Enviando solicitud..."
                      : "Solicitar recuperación"}
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

                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">
                        <CgPiano className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button className="w-full text-primary flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <FaRegNewspaper className="w-5 h-5 mr-3" />
                      Información de matrícula 2026
                    </button>

                    <button className="w-full flex items-center justify-center px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                      <TbPasswordUser className="w-5 h-5 mr-3" />
                      Solicitar acceso
                    </button>
                  </div>
                </div>
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
                    Solicitud enviada
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
                  onClick={() => setIsDialogOpen(false)}
                  className="inline-flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  De acuerdo
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default RecoverPassword;
