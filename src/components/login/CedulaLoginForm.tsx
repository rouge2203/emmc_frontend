import { useEffect, useRef, useState } from "react";
import axios from "../../api/axios";
import useRefreshToken from "../../hooks/useRefreshToken";
import { isValidCedula, normalizeCedula } from "../../utils/cedula";
import { subscribeToLogin } from "../../utils/authBroadcast";
import type {
  EmailLoginError,
  EmailLoginRequestResponse,
  EmailLoginVerifyResponse,
} from "../../types/emailLogin";
import { ImCancelCircle } from "react-icons/im";

const REQUEST_URL = "auth/email-login/request";
const VERIFY_URL = "auth/email-login/verify-code";
const RESEND_SECONDS = 60;
// How long the emailed code and magic link remain valid. Keep in sync with
// the backend's actual expiry (see the two email templates on that side).
const CODE_VALIDITY_MINUTES = 15;

const CEDULA_HELP_TEXT = "La cédula debe tener al menos 9 dígitos";
const GENERIC_CONNECTION_ERROR = "Intento de conexión fallido";

type Step = "cedula" | "code" | "detected";

interface CedulaLoginFormProps {
  onLoggedIn: (data: EmailLoginVerifyResponse) => void;
}

/**
 * Primary login option: authenticate with a cédula/DIMEX number instead of
 * email+password. The backend emails a 6-digit code and a magic link. This
 * component drives a three-step flow (cedula -> code -> detected) and also
 * listens for the case where the user finishes the login from the magic
 * link in another tab, via `subscribeToLogin`.
 */
const CedulaLoginForm = ({ onLoggedIn }: CedulaLoginFormProps) => {
  const cedulaRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);
  const refreshingRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const refresh = useRefreshToken();

  const [step, setStep] = useState<Step>("cedula");
  const [cedulaInput, setCedulaInput] = useState("");
  const [normalizedCedula, setNormalizedCedula] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Focus the active field whenever the step changes
  useEffect(() => {
    if (step === "cedula") cedulaRef.current?.focus();
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  // Clear error message when the user types
  useEffect(() => {
    setErrMsg("");
  }, [cedulaInput, code]);

  const clearCountdown = () => {
    if (countdownIntervalRef.current != null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startCountdown = (seconds: number) => {
    clearCountdown();
    setResendSeconds(seconds);
    countdownIntervalRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          clearCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clear any pending countdown timer on unmount
  useEffect(() => clearCountdown, []);

  // Cross-tab detection: while waiting on the code step, notice if the user
  // finished logging in from the magic link in another tab.
  useEffect(() => {
    if (step !== "code") return;
    const unsubscribe = subscribeToLogin(() => {
      clearCountdown();
      setStep("detected");
    });
    return unsubscribe;
  }, [step]);

  const requestCode = async (cedulaToSend: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await axios.post<EmailLoginRequestResponse>(
        REQUEST_URL,
        { cedula: cedulaToSend },
        { withCredentials: true },
      );
      setMaskedEmail(response.data.masked_email);
      setNormalizedCedula(cedulaToSend);
      setCode("");
      setIsLocked(false);
      setStep("code");
      startCountdown(RESEND_SECONDS);
      return true;
    } catch (err: any) {
      const data: EmailLoginError | undefined = err?.response?.data;
      if (!err?.response) {
        setErrMsg(GENERIC_CONNECTION_ERROR);
      } else if (err.response.status === 404) {
        setErrMsg("Usuario no encontrado. Verifica tu cédula.");
      } else if (err.response.status === 409) {
        setErrMsg(data?.error || "No se pudo enviar el correo.");
      } else if (err.response.status === 429) {
        setErrMsg(data?.error || "Demasiados intentos. Intenta más tarde.");
        if (data?.retry_after) startCountdown(data.retry_after);
      } else if (err.response.status === 400) {
        setErrMsg(data?.error || CEDULA_HELP_TEXT);
      } else {
        setErrMsg(GENERIC_CONNECTION_ERROR);
      }
      errRef.current?.focus();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCedulaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCedula(cedulaInput)) {
      setErrMsg(CEDULA_HELP_TEXT);
      errRef.current?.focus();
      return;
    }
    await requestCode(normalizeCedula(cedulaInput));
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await axios.post<EmailLoginVerifyResponse>(
        VERIFY_URL,
        { cedula: normalizedCedula, code },
        { withCredentials: true },
      );
      onLoggedIn(response.data);
    } catch (err: any) {
      const data: EmailLoginError | undefined = err?.response?.data;
      if (!err?.response) {
        setErrMsg(GENERIC_CONNECTION_ERROR);
      } else if (err.response.status === 401) {
        const base = data?.error || "Código incorrecto.";
        setErrMsg(
          data?.attempts_left != null
            ? `${base} Te quedan ${data.attempts_left} intentos.`
            : base,
        );
        // No attempts left: lock right away instead of waiting for the user
        // to submit once more just to receive the 403 that would do it.
        if (data?.attempts_left === 0) setIsLocked(true);
      } else if (err.response.status === 403) {
        setErrMsg(data?.error || "Demasiados intentos.");
        setIsLocked(true);
      } else if (err.response.status === 410) {
        setErrMsg(data?.error || "El código ha expirado.");
      } else if (err.response.status === 400) {
        setErrMsg(data?.error || "Solicitud inválida.");
      } else if (err.response.status === 429) {
        setErrMsg(data?.error || "Demasiados intentos. Intenta más tarde.");
        if (data?.retry_after) startCountdown(data.retry_after);
      } else {
        setErrMsg(GENERIC_CONNECTION_ERROR);
      }
      errRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || isLoading) return;
    await requestCode(normalizedCedula);
  };

  const handleBackToCedula = () => {
    clearCountdown();
    setStep("cedula");
    setCode("");
    setErrMsg("");
    setIsLocked(false);
    setResendSeconds(0);
    setNormalizedCedula("");
    setMaskedEmail("");
  };

  const handleContinueToPortal = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    setErrMsg("");
    try {
      await refresh();
      // On success, populating `auth` (inside `refresh`) makes Login.tsx's
      // existing effect navigate by role. Nothing else to do here.
    } catch {
      setErrMsg("No se pudo continuar. Intenta de nuevo.");
      errRef.current?.focus();
      refreshingRef.current = false;
    } finally {
      setIsRefreshing(false);
    }
  };

  const errorParagraph = (
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
      <ImCancelCircle className="w-4 h-4 mr-1 shrink-0" />
      {errMsg}
    </p>
  );

  if (step === "detected") {
    return (
      <div className="space-y-6">
        {errorParagraph}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            ¡Sesión iniciada!
          </h2>
          <p className="text-sm text-gray-600">
            Iniciaste sesión desde el enlace que enviamos a tu correo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleContinueToPortal}
          disabled={isRefreshing}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center"
        >
          {isRefreshing ? "Conectando..." : "Continuar al portal"}
        </button>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form className="space-y-6" onSubmit={handleCodeSubmit}>
        {errorParagraph}

        <div className="text-sm text-gray-600 space-y-1">
          <p>
            Hemos enviado un correo a{" "}
            <span className="font-semibold text-gray-900">
              {maskedEmail}
            </span>
            .
          </p>
          <p>
            Ingresa el código de 6 dígitos a continuación, o presiona el
            botón en el correo para iniciar sesión desde ahí. Ambos vencen en{" "}
            {CODE_VALIDITY_MINUTES} minutos.
          </p>
        </div>

        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Código de verificación
          </label>
          <input
            type="text"
            id="code"
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={isLocked}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:bg-gray-100 disabled:text-gray-400 text-center text-lg tracking-[0.5em]"
            placeholder="000000"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isLocked || code.length !== 6}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center"
        >
          {isLoading ? "Verificando..." : "Verificar código"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleBackToCedula}
            className="text-primary hover:underline"
          >
            Usar otra cédula
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendSeconds > 0 || isLoading}
            className="text-primary hover:underline disabled:text-gray-400 disabled:hover:no-underline disabled:cursor-not-allowed"
          >
            {resendSeconds > 0
              ? `Reenviar código (${resendSeconds}s)`
              : "Reenviar código"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleCedulaSubmit}>
      {errorParagraph}

      <div>
        <label
          htmlFor="cedula"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Ingrese su cédula o DIMEX
        </label>
        <input
          type="text"
          id="cedula"
          ref={cedulaRef}
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          value={cedulaInput}
          onChange={(e) => setCedulaInput(e.target.value.replace(/\D/g, ""))}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          placeholder="Ej. 123456789"
        />
        <p className="mt-2 text-xs text-gray-500">{CEDULA_HELP_TEXT}</p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center"
      >
        {isLoading ? "Enviando..." : "Enviar código"}
      </button>
    </form>
  );
};

export default CedulaLoginForm;
