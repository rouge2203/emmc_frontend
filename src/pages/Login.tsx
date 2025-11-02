import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "../api/axios";
import useAuth from "../hooks/useAuth";
import { FaRegNewspaper, FaEye, FaEyeSlash } from "react-icons/fa";
import { TbPasswordUser } from "react-icons/tb";
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

const Login = () => {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const userRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [heroImage] = useState(
    () =>
      instruments_images[Math.floor(Math.random() * instruments_images.length)]
  );

  // Focus on username input on mount
  useEffect(() => {
    userRef.current?.focus();
  }, []);

  // Clear error message when user types
  useEffect(() => {
    setErrMsg("");
  }, [username, password]);

  // Redirect if already logged in
  useEffect(() => {
    if (auth) {
      navigate(from, { replace: true });
    }
  }, [auth, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(
        LOGIN_URL,
        JSON.stringify({ username, password }),
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
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
              alt="Piano keyboard"
              src={`${heroImage}`}
              className="w-full h-48 lg:h-full object-cover"
            />
            <div className="absolute inset-0  bg-opacity-40 flex items-center justify-center lg:justify-start lg:items-end lg:p-8">
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

          {/* Right Section with Login Form */}
          <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">
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

                <div className="mt-6 space-y-3">
                  <button className="w-full text-primary flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <FaRegNewspaper className="w-5 h-5 mr-3" />
                    Información de matrícula 2026
                  </button>

                  <button className="w-full  flex items-center justify-center px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
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
  );
};

export default Login;
