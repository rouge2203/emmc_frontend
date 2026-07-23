import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "../api/axios";
import useAuth from "../hooks/useAuth";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { ImCancelCircle } from "react-icons/im";
import { CgPiano } from "react-icons/cg";

const LOGIN_URL = "auth/login";
const instruments_images = [
  "/guiseppe_sinopoli.jpg",
  "/guitar.jpg",
  "/orchestra.jpg",
  "/piano.png",
  "/saxophone.png",
  "/violin.jpg",
];

type PianoKey = {
  note: string;
  label: string;
  midi: number;
  keyboard: string;
};

const WHITE_KEYS: PianoKey[] = [
  { note: "C4", label: "Do", midi: 60, keyboard: "a" },
  { note: "D4", label: "Re", midi: 62, keyboard: "s" },
  { note: "E4", label: "Mi", midi: 64, keyboard: "d" },
  { note: "F4", label: "Fa", midi: 65, keyboard: "f" },
  { note: "G4", label: "Sol", midi: 67, keyboard: "g" },
  { note: "A4", label: "La", midi: 69, keyboard: "h" },
  { note: "B4", label: "Si", midi: 71, keyboard: "j" },
  { note: "C5", label: "Do", midi: 72, keyboard: "k" },
];

// position = number of white keys to the left of the black key's slot
const BLACK_KEYS: (PianoKey & { position: number })[] = [
  { note: "C#4", label: "Do♯", midi: 61, keyboard: "w", position: 1 },
  { note: "D#4", label: "Re♯", midi: 63, keyboard: "e", position: 2 },
  { note: "F#4", label: "Fa♯", midi: 66, keyboard: "t", position: 4 },
  { note: "G#4", label: "Sol♯", midi: 68, keyboard: "y", position: 5 },
  { note: "A#4", label: "La♯", midi: 70, keyboard: "u", position: 6 },
];

const PIANO_KEYS = [...WHITE_KEYS, ...BLACK_KEYS];

const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// [harmonic multiple, gain, waveform, detune in cents]
const PARTIALS: [number, number, OscillatorType, number][] = [
  [1, 0.5, "triangle", 0],
  [1, 0.18, "triangle", 5],
  [2, 0.22, "sine", 0],
  [3, 0.08, "sine", 0],
  [4, 0.04, "sine", 0],
];

type AudioEngine = { ctx: AudioContext; out: GainNode };

const Login = () => {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const userRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);
  const isLoggingIn = useRef(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [heroImage] = useState(
    () =>
      instruments_images[Math.floor(Math.random() * instruments_images.length)],
  );

  // Focus on username input on mount
  useEffect(() => {
    userRef.current?.focus();
  }, []);

  // Clear error message when user types
  useEffect(() => {
    setErrMsg("");
  }, [username, password]);

  // Redirect if already logged in (but not during login process)
  useEffect(() => {
    if (auth && !isLoggingIn.current) {
      const role = auth.user?.role;

      // Navigate based on user role instead of blindly going to 'from'
      // This prevents redirecting back to login when 'from' is '/'
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "teacher") {
        navigate("/teacher/dashboard", { replace: true });
      } else if (role === "student") {
        navigate("/student/dashboard", { replace: true });
      } else if (from !== "/" && from !== "/login") {
        // Only use 'from' if it's not the login page itself
        navigate(from, { replace: true });
      } else {
        // Fallback: if role is unknown and from is login, go to a default page
        navigate("/", { replace: true });
      }
    }
  }, [auth, from, navigate]);

  // Reset isLoggingIn flag when component unmounts (after navigation)
  useEffect(() => {
    return () => {
      isLoggingIn.current = false;
    };
  }, []);

  const audioRef = useRef<AudioEngine | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(() => new Set());

  const playNote = useCallback((midi: number) => {
    let engine = audioRef.current;
    if (!engine || engine.ctx.state === "closed") {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      // Shared compressor keeps chords and glissandos from clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.15;
      const out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(compressor);
      compressor.connect(ctx.destination);
      engine = { ctx, out };
      audioRef.current = engine;
    }
    const { ctx, out } = engine;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const freq = midiToFreq(midi);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(Math.min(freq * 7, 9000), now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.8, now + 1.1);

    filter.connect(master);
    master.connect(out);

    PARTIALS.forEach(([ratio, gain, type, detune], i) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      osc.detune.value = detune;
      const oscGain = ctx.createGain();
      oscGain.gain.value = gain;
      osc.connect(oscGain);
      oscGain.connect(filter);
      if (i === 0) {
        osc.onended = () => {
          filter.disconnect();
          master.disconnect();
        };
      }
      osc.start(now);
      osc.stop(now + 1.6);
    });
  }, []);

  const pressKey = useCallback(
    (key: PianoKey) => {
      playNote(key.midi);
      setActiveNotes((prev) => {
        if (prev.has(key.note)) return prev;
        const next = new Set(prev);
        next.add(key.note);
        return next;
      });
    },
    [playNote],
  );

  const releaseKey = useCallback((note: string) => {
    setActiveNotes((prev) => {
      if (!prev.has(note)) return prev;
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  }, []);

  // Play the piano with the computer keyboard, except while typing in a field
  useEffect(() => {
    const findKey = (e: KeyboardEvent) =>
      PIANO_KEYS.find((k) => k.keyboard === e.key.toLowerCase());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const key = findKey(e);
      if (key) pressKey(key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = findKey(e);
      if (key) releaseKey(key.note);
    };
    const clearAll = () => {
      setActiveNotes((prev) => (prev.size ? new Set() : prev));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearAll);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearAll);
    };
  }, [pressKey, releaseKey]);

  // Release audio resources when leaving the page
  useEffect(() => {
    return () => {
      audioRef.current?.ctx.close().catch(() => {});
    };
  }, []);

  const keyHandlers = (key: PianoKey) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      // Give up implicit capture so dragging across keys plays a glissando
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      pressKey(key);
    },
    onPointerEnter: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.buttons === 1) pressKey(key);
    },
    onPointerUp: () => releaseKey(key.note),
    onPointerLeave: () => releaseKey(key.note),
    onPointerCancel: () => releaseKey(key.note),
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.repeat) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pressKey(key);
      }
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") releaseKey(key.note);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    isLoggingIn.current = true;

    try {
      const response = await axios.post(
        LOGIN_URL,
        JSON.stringify({ username, password }),
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );

      const access = response?.data?.access;
      const user = response?.data?.user;

      setAuth({ access, user });
      setUsername("");
      setPassword("");

      // Navigate based on user role
      const role = user?.role;
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "teacher") {
        navigate("/teacher/dashboard", { replace: true });
      } else if (role === "student") {
        navigate("/student/dashboard", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      isLoggingIn.current = false;
      if (!err?.response) {
        setErrMsg("Intento de conexión fallido");
      } else if (err.response?.status === 400) {
        setErrMsg("Faltan correo electrónico o contraseña");
      } else if (err.response?.status === 401) {
        setErrMsg("Credenciales incorrectas");
      } else {
        setErrMsg("Intento de conexión fallido");
      }
      errRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sm:h-screen bg-white flex items-center justify-center sm:py-4 lg:py-16">
      <div className="lg:max-w-5xl sm:max-w-xl  h-full w-full flex items-center justify-center ">
        <div className="bg-white sm:rounded-2xl w-full h-full shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          {/* Left Section with Piano Image */}
          <div className="lg:w-1/2 relative">
            <img
              alt="Instrumento musical"
              src={`${heroImage}`}
              className="w-full h-48 lg:h-full object-cover"
            />
            <div className="absolute inset-0  bg-opacity-40 flex items-center justify-center lg:justify-start lg:items-end lg:p-8">
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

          {/* Right Section with Login Form */}
          <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center overflow-y-auto">
            <div className="w-full max-w-md mx-auto h-full">
              <img
                src="/emmc_logo.png"
                alt="Logo"
                className=" h-22 sm:h-26 mx-auto mb-8"
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
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Correo Electrónico
                  </label>
                  <input
                    type="text"
                    id="username"
                    ref={userRef}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Ingresa tu correo electrónico"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Ingresa tu contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? (
                        <FaEyeSlash className="w-5 h-5" />
                      ) : (
                        <FaEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    to="/recuperar-contrasena"
                    className="text-sm text-primary hover:underline -mt-3"
                  >
                    Recuperar contraseña
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center"
                >
                  {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>
              </form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      {" "}
                      <CgPiano className="h-4 w-4 sm:h-5 sm:w-5 text-gray-900" />{" "}
                    </span>
                  </div>
                </div>

                <div className="mt-6 sm:pb-4">
                  <div
                    role="group"
                    aria-label="Piano interactivo"
                    className="select-none touch-none overflow-hidden rounded-xl border border-gray-200 bg-gray-900 shadow-md"
                  >
                    <div className="h-2 bg-gray-900" />
                    <div className="h-1 bg-red-800" />
                    <div className="relative h-36 sm:h-32">
                      <div className="flex h-full gap-px px-px pb-px">
                        {WHITE_KEYS.map((key, i) => {
                          const isActive = activeNotes.has(key.note);
                          // End keys follow the case's 12px curve (11px = 12 - 1px gap)
                          const cornerClass =
                            i === 0
                              ? "rounded-br rounded-bl-[11px]"
                              : i === WHITE_KEYS.length - 1
                                ? "rounded-bl rounded-br-[11px]"
                                : "rounded-b";
                          return (
                            <button
                              key={key.note}
                              type="button"
                              aria-label={`Nota ${key.label} (${key.note})`}
                              title={`${key.label} · tecla ${key.keyboard.toUpperCase()}`}
                              {...keyHandlers(key)}
                              className={`relative flex-1 ${cornerClass} transition-colors duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                                isActive
                                  ? "translate-y-px bg-linear-to-b from-gray-200 to-gray-300 shadow-inner"
                                  : "bg-linear-to-b from-white to-gray-100"
                              }`}
                            >
                              <span
                                className={`pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[10px] font-medium tracking-wide ${
                                  isActive ? "text-gray-700" : "text-gray-400"
                                }`}
                              >
                                {key.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {BLACK_KEYS.map((key) => {
                        const isActive = activeNotes.has(key.note);
                        return (
                          <button
                            key={key.note}
                            type="button"
                            aria-label={`Nota ${key.label.replace("♯", " sostenido")} (${key.note})`}
                            title={`${key.label} · tecla ${key.keyboard.toUpperCase()}`}
                            {...keyHandlers(key)}
                            style={{
                              left: `${key.position * 12.5}%`,
                              width: "8.5%",
                              transform: "translateX(-50%)",
                            }}
                            className={`absolute top-0 z-10 rounded-b-md border-x border-b border-black/70 transition-all duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                              isActive
                                ? "h-[56%] bg-linear-to-b from-gray-600 to-gray-800"
                                : "h-[60%] bg-linear-to-b from-gray-700 via-gray-900 to-black shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-2.5 text-center text-xs text-gray-400">
                    Toca una melodía
                    <span className="hidden sm:inline">
                      {" "}
                      · también suena con tu teclado (A–K)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
