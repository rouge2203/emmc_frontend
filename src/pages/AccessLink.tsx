import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "../api/axios";
import useAuth from "../hooks/useAuth";
import useLogout from "../hooks/useLogout";
import { broadcastLogin } from "../utils/authBroadcast";
import { ImCancelCircle } from "react-icons/im";
import type {
  EmailLoginError,
  EmailLoginVerifyResponse,
} from "../types/emailLogin";

const VERIFY_TOKEN_URL = "auth/email-login/verify-token";
const GENERIC_CONNECTION_ERROR = "Intento de conexión fallido";
// Brief on-screen confirmation before we hand the user off to their portal.
const SUCCESS_REDIRECT_DELAY_MS = 900;

const instrumentsImages = [
  "/guiseppe_sinopoli.jpg",
  "/guitar.jpg",
  "/orchestra.jpg",
  "/piano.png",
  "/saxophone.png",
  "/violin.jpg",
];

function getRoleLadderPath(role: string | null | undefined): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "student") return "/student/dashboard";
  return "/";
}

const PRIMARY_BUTTON_CLASS =
  "w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center";

type Status = "idle" | "verifying" | "success" | "error";

/**
 * Destination of the magic link emailed by the passwordless login flow
 * (`{FRONTEND_URL}/acceso?token=...`).
 *
 * Security requirement: the token is never verified on mount. Corporate
 * mail scanners follow links automatically, and a token is single-use, so
 * verifying it as soon as the page loads would let a scanner burn it
 * before the real user clicks anything. Verification only happens after an
 * explicit click on "Continuar".
 */
const AccessLink = () => {
  const errRef = useRef<HTMLParagraphElement>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Guards against a second POST firing (e.g. a fast double click) before
  // React re-renders with the "verifying" status — state updates are not
  // synchronous, so checking `status` alone is not a reliable guard. Same
  // pattern as `refreshingRef` in CedulaLoginForm.tsx / `isLoggingIn` in
  // Login.tsx.
  const verifyingRef = useRef(false);
  // Guards against a double click on "usar este enlace con otra cuenta"
  // while the logout request is in flight.
  const switchingAccountRef = useRef(false);
  // Where the "success" state should send the user, decided once from the
  // verify-token response and read by both the auto-redirect timer and the
  // manual "Continuar" button, so the two paths can never disagree.
  const destinationRef = useRef<string | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();
  const logout = useLogout();

  // Captured once, on mount — before any verification can happen — so it
  // reflects only a session PersistLogin restored ahead of this page
  // rendering, never a session this page itself just created. `setAuth`
  // (called synchronously right before `setStatus("success")` inside
  // `handleVerify`) gets batched into the very next render together with
  // the status update; if this check read live `auth?.access` instead, a
  // fresh successful verification would immediately satisfy it too, and
  // since it's checked ahead of `status === "success"` in the render
  // switch below, the success confirmation would never be reachable and
  // "Ir a mi portal" (which ignores password_setup_required) would fire
  // instead of the required /establecer-contrasena redirect.
  const hadSessionOnMountRef = useRef(Boolean(auth?.access));

  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [heroImage] = useState(
    () =>
      instrumentsImages[Math.floor(Math.random() * instrumentsImages.length)],
  );

  const token = searchParams.get("token");

  // Clear any pending auto-redirect timer on unmount.
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current != null) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === "error") errRef.current?.focus();
  }, [status]);

  const handleVerify = async () => {
    if (!token || verifyingRef.current) return;
    verifyingRef.current = true;

    setStatus("verifying");
    setErrMsg("");

    try {
      // Public instance: the user isn't authenticated yet at this point.
      const response = await axios.post<EmailLoginVerifyResponse>(
        VERIFY_TOKEN_URL,
        { token },
        { withCredentials: true },
      );
      const data = response.data;

      // Decide the post-success destination from the response BEFORE
      // touching auth/status, so it can't be influenced by the render that
      // follows, and store it for both the timer and the manual button.
      destinationRef.current = data.password_setup_required
        ? "/establecer-contrasena"
        : getRoleLadderPath(data.user.role);

      setAuth({ access: data.access, user: data.user });
      broadcastLogin(); // wakes any other tab waiting on the code screen
      setStatus("success");

      redirectTimeoutRef.current = setTimeout(() => {
        navigate(destinationRef.current ?? "/", { replace: true });
      }, SUCCESS_REDIRECT_DELAY_MS);
    } catch (err: any) {
      const data: EmailLoginError | undefined = err?.response?.data;
      setErrMsg(
        err?.response
          ? data?.error || GENERIC_CONNECTION_ERROR
          : GENERIC_CONNECTION_ERROR,
      );
      setStatus("error");
      verifyingRef.current = false; // allow a subsequent click to retry
    }
  };

  const handleGoToPortal = () => {
    navigate(getRoleLadderPath(auth?.user?.role), { replace: true });
  };

  // Escape hatch for a shared device: the visitor holding the emailed link
  // may not be the person whose session is already active in this browser.
  // `useLogout` blacklists the refresh token and clears local auth, but it
  // also client-navigates to `/login` — so we follow it with a full page
  // reload back to this same `/acceso` URL (token and all) rather than a
  // client-side `navigate`. A client-side navigate isn't guaranteed to
  // remount this component (React Router may keep this instance alive
  // across the two navigations), and `hadSessionOnMountRef` above only
  // re-evaluates on a fresh mount. A real reload guarantees that. The token
  // itself is never spent here: verify-token only runs when the user
  // presses "Continuar" on the resulting idle screen.
  const handleUseDifferentAccount = async () => {
    if (switchingAccountRef.current) return;
    switchingAccountRef.current = true;
    setIsSwitchingAccount(true);
    try {
      await logout();
    } finally {
      window.location.replace(`/acceso?${searchParams.toString()}`);
    }
  };

  const handleContinueManually = () => {
    if (redirectTimeoutRef.current != null) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    navigate(destinationRef.current ?? "/", { replace: true });
  };

  let content: ReactNode;

  if (hadSessionOnMountRef.current) {
    // PersistLogin may already have restored a session in this tab before
    // this page renders — don't spend the one-time token in that case.
    // (Checked against the mount-time snapshot, not live `auth`, so this
    // branch cannot start winning again once a fresh verification below
    // sets `auth` itself — see the comment on `hadSessionOnMountRef`.)
    content = (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Ya tienes una sesión activa
        </h2>
        <p className="text-sm text-gray-600">
          Ya iniciaste sesión en este navegador. Continúa a tu portal.
        </p>
        <button
          type="button"
          onClick={handleGoToPortal}
          className={PRIMARY_BUTTON_CLASS}
        >
          Ir a mi portal
        </button>
        <p className="text-sm text-gray-600">
          ¿Este enlace era para otra cuenta?{" "}
          <button
            type="button"
            onClick={handleUseDifferentAccount}
            disabled={isSwitchingAccount}
            className="text-primary hover:underline disabled:text-gray-400 disabled:hover:no-underline disabled:cursor-not-allowed"
          >
            {isSwitchingAccount
              ? "Cerrando sesión..."
              : "Cierra esta sesión y úsalo aquí"}
          </button>
        </p>
      </div>
    );
  } else if (!token) {
    content = (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Enlace inválido</h2>
        <p
          className="rounded-md flex items-center border border-red-900/50 bg-red-900/25 px-3 py-2 text-sm text-red-900 font-semibold text-left"
          role="alert"
        >
          <ImCancelCircle className="w-4 h-4 mr-1 shrink-0" />
          Este enlace no incluye la información necesaria para iniciar
          sesión. Puede estar incompleto o dañado.
        </p>
        <Link
          to="/login"
          className="inline-block text-sm text-primary hover:underline"
        >
          Solicitar un nuevo código
        </Link>
      </div>
    );
  } else if (status === "error") {
    content = (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            No pudimos confirmar tu inicio de sesión
          </h2>
        </div>
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
        <div className="flex items-center justify-center">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Solicitar un nuevo código
          </Link>
        </div>
      </div>
    );
  } else if (status === "success") {
    content = (
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            ¡Sesión iniciada!
          </h2>
          <p className="text-sm text-gray-600">Te llevamos a tu portal…</p>
        </div>
        <button
          type="button"
          onClick={handleContinueManually}
          className={PRIMARY_BUTTON_CLASS}
        >
          Continuar
        </button>
      </div>
    );
  } else {
    // idle or verifying
    content = (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Confirma tu inicio de sesión
        </h2>
        <p className="text-sm text-gray-600">
          Abriste este enlace desde el correo que te enviamos. Presiona
          continuar para iniciar sesión de forma segura.
        </p>
        <button
          type="button"
          onClick={handleVerify}
          disabled={status === "verifying"}
          className={PRIMARY_BUTTON_CLASS}
        >
          {status === "verifying" && (
            <span
              aria-hidden="true"
              className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {status === "verifying" ? "Confirmando..." : "Continuar"}
        </button>
      </div>
    );
  }

  return (
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
                  Escuela Municipal de Música de Cartago
                </p>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center overflow-y-auto">
            <div className="w-full max-w-md mx-auto h-full">
              <img
                src="/emmc_logo.png"
                alt="Logo"
                className="h-22 sm:h-26 mx-auto mb-8"
              />
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessLink;
