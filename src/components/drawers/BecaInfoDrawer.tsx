import React, { useEffect, useMemo, useState } from "react";
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
  AcademicCapIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { formatGrade } from "../../utils/grades";

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

interface EnrollmentRow {
  id: number;
  course: {
    id: number;
    code: string;
    name: string;
    career_name: string | null;
    is_matricula: boolean;
  } | null;
  course_name: string | null;
  course_code: string | null;
  period: number;
  period_display: string;
  year: number;
  price: number;
  status: string;
  grade: number | null;
}

interface BecaInfoDrawerProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (updatedUser: StudentUser) => void;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return "—";
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
};

const STATUS_BADGE: Record<string, string> = {
  cursando: "bg-blue-100 text-blue-800",
  aprobado: "bg-green-100 text-green-800",
  retirado: "bg-gray-100 text-gray-800",
  reprobado: "bg-red-100 text-red-800",
};

const BecaInfoDrawer: React.FC<BecaInfoDrawerProps> = ({
  userId,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [user, setUser] = useState<StudentUser | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [isBecado, setIsBecado] = useState(false);
  const [becadoPercentage, setBecadoPercentage] = useState("");

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        const [userResponse, enrollmentsResponse] = await Promise.all([
          axiosPrivate.get("users/get-user-info", { params: { id: userId } }),
          axiosPrivate.get("courses/manage-enrollments", {
            params: { student_id: userId, page: 1, page_size: 10000 },
          }),
        ]);
        if (cancelled) return;

        const fetched: StudentUser = userResponse.data.user;
        setUser(fetched);
        const becado = Boolean(fetched.profile?.is_becado);
        const pct = fetched.profile?.becado_percentage;
        setIsBecado(becado);
        setBecadoPercentage(pct != null ? String(pct) : "");
        setEnrollments(enrollmentsResponse.data.results || []);
      } catch {
        if (cancelled) return;
        setErrorMessage("Error al cargar la información de la beca");
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, axiosPrivate]);

  // "Matrículas abiertas" are every open enrollment, including the annual
  // matrícula item. "Historial de cursos" counts only real courses, matching
  // the courses_taken_count column on the Becados table.
  const matriculasAbiertas = useMemo(
    () => enrollments.filter((e) => e.status === "cursando"),
    [enrollments],
  );
  const historial = useMemo(
    () => enrollments.filter((e) => !e.course?.is_matricula),
    [enrollments],
  );
  const totalAbiertas = useMemo(
    () => matriculasAbiertas.reduce((sum, e) => sum + (e.price || 0), 0),
    [matriculasAbiertas],
  );

  const handleSave = async () => {
    if (!userId) return;

    const profileData: Record<string, boolean | number | null> = {};
    const currentIsBecado = Boolean(user?.profile?.is_becado);
    if (isBecado !== currentIsBecado) {
      profileData.is_becado = isBecado;
    }
    const currentPct = user?.profile?.becado_percentage ?? null;
    const rawPct = becadoPercentage.trim();
    const newPct = isBecado && rawPct !== "" ? parseInt(rawPct, 10) : null;
    if (newPct !== currentPct) {
      profileData.becado_percentage = newPct;
    }

    if (Object.keys(profileData).length === 0) {
      onClose();
      return;
    }

    if (newPct != null && (newPct < 0 || newPct > 100)) {
      setErrorMessage("El porcentaje debe estar entre 0 y 100");
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
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
        const becado = Boolean(updatedUser.profile?.is_becado);
        const pct = updatedUser.profile?.becado_percentage;
        setIsBecado(becado);
        setBecadoPercentage(pct != null ? String(pct) : "");
        onSaveSuccess?.(updatedUser);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      onClose();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { error?: string } } };
      setErrorMessage(
        anyErr?.response?.data?.error || "Error al guardar la información de la beca",
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
  const savedIsBecado = Boolean(user?.profile?.is_becado);
  const savedPct = user?.profile?.becado_percentage ?? null;

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
                className="pointer-events-auto w-screen max-w-3xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <div className="relative flex h-full flex-col bg-white shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-purple-700 px-4 py-5 sm:px-6 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <AcademicCapIcon className="size-6 text-purple-100 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <DialogTitle className="text-base font-semibold text-white">
                            Información de la beca
                          </DialogTitle>
                          <p className="mt-1 text-sm text-purple-100 truncate">
                            {studentName
                              ? `${studentName}${carnet ? ` (${carnet})` : ""}`
                              : "Cargando..."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md text-purple-100 hover:text-white shrink-0"
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
                      </div>
                    ) : !user ? (
                      <p className="text-center text-sm text-gray-500 py-8">
                        Sin información disponible.
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {/* Beca form */}
                        <div className="rounded-lg border border-gray-200 bg-gray-50/90 p-4 space-y-3.5">
                          <h3 className="text-sm/6 font-medium text-gray-900">
                            Datos de la beca
                          </h3>

                          <div className="flex items-center">
                            <input
                              id="beca_is_becado"
                              name="beca_is_becado"
                              type="checkbox"
                              checked={isBecado}
                              onChange={(e) => {
                                setIsBecado(e.target.checked);
                                if (!e.target.checked) setBecadoPercentage("");
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label
                              htmlFor="beca_is_becado"
                              className="ml-2 text-sm font-medium text-gray-900"
                            >
                              Es estudiante becado
                            </label>
                          </div>

                          <div>
                            <label
                              htmlFor="beca_percentage"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Porcentaje de descuento (%)
                            </label>
                            <div className="mt-2">
                              <input
                                id="beca_percentage"
                                name="beca_percentage"
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={becadoPercentage}
                                disabled={!isBecado}
                                onChange={(e) =>
                                  setBecadoPercentage(e.target.value)
                                }
                                className={`block w-full rounded-md px-3 py-1.5 text-base outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6 ${
                                  isBecado
                                    ? "bg-white text-gray-900"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                              />
                            </div>
                            <p className="mt-1 ml-0.5 text-xs text-gray-500">
                              Descuento aplicado a nuevos pagos generados. Para
                              pagos ya existentes, usa el botón «Aplicar becado»
                              de la tabla.
                            </p>
                          </div>

                          {savedIsBecado && savedPct == null && (
                            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
                              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-900">
                                Este estudiante está marcado como becado pero no
                                tiene un porcentaje de descuento asignado.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Matrículas abiertas */}
                        <div>
                          <h3 className="text-sm/6 font-medium text-gray-900">
                            Matrículas abiertas ({matriculasAbiertas.length})
                          </h3>
                          {matriculasAbiertas.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">
                              No hay matrículas abiertas.
                            </p>
                          ) : (
                            <div className="mt-2 overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                      Curso
                                    </th>
                                    <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                      Período
                                    </th>
                                    <th className="py-2 px-2 text-right font-semibold text-gray-900">
                                      Paga
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {matriculasAbiertas.map((e) => (
                                    <tr key={e.id}>
                                      <td className="py-2 px-2 text-gray-900">
                                        <span className="font-medium">
                                          {e.course_code || "—"}
                                        </span>
                                        <span className="text-gray-500">
                                          {e.course_name
                                            ? ` · ${e.course_name}`
                                            : ""}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2 whitespace-nowrap text-gray-500">
                                        {e.period_display} - {e.year}
                                      </td>
                                      <td className="py-2 px-2 text-right whitespace-nowrap text-gray-900">
                                        {formatCurrency(e.price)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="border-t border-gray-300">
                                  <tr>
                                    <td
                                      colSpan={2}
                                      className="py-2 px-2 text-right font-semibold text-gray-900"
                                    >
                                      Total
                                    </td>
                                    <td className="py-2 px-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                                      {formatCurrency(totalAbiertas)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Historial de cursos */}
                        <div>
                          <h3 className="text-sm/6 font-medium text-gray-900">
                            Historial de cursos ({historial.length})
                          </h3>
                          {historial.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">
                              Sin cursos registrados.
                            </p>
                          ) : (
                            <div className="mt-2 overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                      Curso
                                    </th>
                                    <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                      Período
                                    </th>
                                    <th className="py-2 px-2 text-left font-semibold text-gray-900">
                                      Estado
                                    </th>
                                    <th className="py-2 px-2 text-right font-semibold text-gray-900">
                                      Nota
                                    </th>
                                    <th className="py-2 px-2 text-right font-semibold text-gray-900">
                                      Precio
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {historial.map((e) => (
                                    <tr key={e.id}>
                                      <td className="py-2 px-2 text-gray-900">
                                        <span className="font-medium">
                                          {e.course_code || "—"}
                                        </span>
                                        <span className="text-gray-500">
                                          {e.course_name
                                            ? ` · ${e.course_name}`
                                            : ""}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2 whitespace-nowrap text-gray-500">
                                        {e.period_display} - {e.year}
                                      </td>
                                      <td className="py-2 px-2 whitespace-nowrap">
                                        <span
                                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                            STATUS_BADGE[e.status] ||
                                            "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          {e.status}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2 text-right whitespace-nowrap text-gray-500">
                                        {formatGrade(e.grade, "—")}
                                      </td>
                                      <td className="py-2 px-2 text-right whitespace-nowrap text-gray-900">
                                        {formatCurrency(e.price)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
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
                      className="inline-flex justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <CheckCircleIcon className="size-6 text-purple-700" />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Beca actualizada
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los datos de la beca se guardaron correctamente.
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

export default BecaInfoDrawer;
