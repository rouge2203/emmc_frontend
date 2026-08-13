import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import {
  MagnifyingGlassIcon,
  XMarkIcon,
  BarsArrowUpIcon,
  BanknotesIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import StudentInfoDrawer from "../../components/drawers/StudentInfoDrawer";
import BecaInfoDrawer from "../../components/drawers/BecaInfoDrawer";
import BecadoApplyDrawer from "../../components/drawers/BecadoApplyDrawer";
import { RiMailCloseFill } from "react-icons/ri";

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
  has_active_enrollment?: boolean;
  active_enrollment_period?: number | null;
  active_enrollment_year?: number | null;
  open_enrollments_count?: number | null;
  courses_taken_count?: number | null;
}

interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
}

interface PaginatedResponse {
  results: StudentUser[];
  pagination: PaginationInfo;
}

// Same size as the Profesores action buttons (inherits the cell's text-sm).
const ACTION_BUTTON_CLASS =
  "inline-flex items-center gap-1 rounded-sm border border-gray-300 px-2 py-0.5 font-semibold text-gray-900 shadow-sm hover:bg-gray-100 hover:text-primary hover:cursor-pointer whitespace-nowrap";

const Becados = () => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [users, setUsers] = useState<StudentUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderBy, setOrderBy] = useState("-open_enrollments_count");

  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [becaUserId, setBecaUserId] = useState<number | null>(null);
  const [isBecaOpen, setIsBecaOpen] = useState(false);
  const [applyUserId, setApplyUserId] = useState<number | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  const fetchUsers = useCallback(
    async (pageNum: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const requestData: Record<string, string | number> = {
          role: "student",
          page: pageNum,
          page_size: pageSize,
          order_by: orderBy,
          becado: "solo_becados",
        };

        if (searchQuery.trim()) {
          requestData.search = searchQuery.trim();
        }

        const response = await axiosPrivate.post<PaginatedResponse>(
          "users/get-users",
          requestData,
        );
        setUsers(response.data.results);
        setPagination(response.data.pagination);
      } catch (err: unknown) {
        const anyErr = err as { response?: { data?: { error?: string } } };
        setError(
          anyErr?.response?.data?.error ||
            "Error al cargar los estudiantes becados",
        );
        console.error("Error fetching becado students:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [axiosPrivate, pageSize, searchQuery, orderBy],
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, orderBy]);

  useEffect(() => {
    fetchUsers(page);
  }, [fetchUsers, page]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setOrderBy("-open_enrollments_count");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || orderBy !== "-open_enrollments_count";

  // Placeholder image URL. Names can carry markers like "(B)" — strip
  // anything that isn't a letter so the avatar initials stay clean.
  const getPlaceholderImage = (name: string) => {
    const cleanName =
      name
        .replace(/\([^)]*\)/g, " ")
        .replace(/[^\p{L}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim() || "?";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      cleanName,
    )}&background=155c95&color=fff&size=128`;
  };

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto flex items-start sm:items-center gap-2">
          <AcademicCapIcon className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Estudiantes con beca activa, su descuento y su carga de cursos.
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 sm:mt-6 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Filtros</h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <XMarkIcon className="h-4 w-4" />
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <label
                htmlFor="search"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Buscar
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="search"
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nombre, apellido, email, cédula o carnet..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Order By */}
            <div className="sm:w-48">
              <label
                htmlFor="orderBy"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <BarsArrowUpIcon className="h-4 w-4" />
                Ordenar por
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="orderBy"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="-open_enrollments_count">
                    Más matrículas abiertas
                  </option>
                  <option value="-date_joined">Más recientes primero</option>
                  <option value="date_joined">Más antiguos primero</option>
                  <option value="first_name">Nombre A-Z</option>
                  <option value="-first_name">Nombre Z-A</option>
                </select>
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  data-slot="icon"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                >
                  <path
                    d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Cargando becados...</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="mt-2 sm:mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="sm:border sm:border-gray-300 sm:rounded-x-md sm:rounded-t-md sm:py-2 sm:px-4">
                <table className="relative min-w-full divide-y divide-gray-300">
                  <thead className="">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Nombre
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Porcentaje de descuento
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Matrículas abiertas
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Cursos concretados
                      </th>
                      <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                        >
                          No se encontraron estudiantes becados
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const fullName =
                          `${user.last_name || ""} ${
                            user.first_name || ""
                          }`.trim() || "Sin nombre";
                        const displayEmail = user.email || (
                          <span className="flex items-center">
                            <RiMailCloseFill className="size-4 text-gray-500 mr-1" />
                            Falta asignar correo
                          </span>
                        );
                        const percentage = user.profile?.becado_percentage;
                        return (
                          <tr key={user.id}>
                            <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                              <div className="flex items-center">
                                <div className="size-11 shrink-0">
                                  <img
                                    alt=""
                                    src={getPlaceholderImage(fullName)}
                                    className="size-11 rounded-full"
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="font-medium text-gray-900">
                                    {fullName}
                                    {user.profile?.carnet
                                      ? ` (${user.profile.carnet})`
                                      : ""}
                                  </div>
                                  <div className="mt-1 text-gray-500">
                                    {displayEmail}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                              {percentage != null ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  <AcademicCapIcon className="h-3.5 w-3.5" />
                                  {percentage}%
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20"
                                  title="Becado sin porcentaje de descuento asignado"
                                >
                                  <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                                  Sin porcentaje
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                              <span
                                className={
                                  (user.open_enrollments_count ?? 0) > 0
                                    ? "font-semibold text-green-600"
                                    : ""
                                }
                              >
                                {user.open_enrollments_count ?? 0}
                              </span>
                            </td>
                            <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                              {user.courses_taken_count ?? 0}
                            </td>
                            <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setDetailUserId(user.id);
                                    setIsDetailOpen(true);
                                  }}
                                  className={ACTION_BUTTON_CLASS}
                                >
                                  Detalles
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setBecaUserId(user.id);
                                    setIsBecaOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-sm border border-purple-300 bg-purple-50 px-2 py-0.5 font-semibold text-purple-800 shadow-sm hover:bg-purple-100 hover:cursor-pointer whitespace-nowrap"
                                  title="Información de la beca, matrículas abiertas y cursos"
                                >
                                  <AcademicCapIcon className="h-4 w-4" />
                                  Beca
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/admin/centro-de-pagos?student_id=${user.id}`,
                                    )
                                  }
                                  className={ACTION_BUTTON_CLASS}
                                >
                                  <BanknotesIcon className="h-4 w-4" />
                                  Pagos
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setApplyUserId(user.id);
                                    setIsApplyOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-sm border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 shadow-sm hover:bg-amber-100 hover:cursor-pointer whitespace-nowrap"
                                  title="Aplicar becado a pagos pendientes"
                                >
                                  <AcademicCapIcon className="h-4 w-4" />
                                  Aplicar
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.total_pages > 1 && !isLoading && (
                <nav
                  aria-label="Pagination"
                  className="flex items-center justify-between sm:shadow-sm sm:border-b sm:border-x sm:border-gray-300 sm:rounded-b-md bg-white px-4 py-3 sm:px-6"
                >
                  <div className="hidden sm:block">
                    <p className="text-sm text-gray-700">
                      Mostrando{" "}
                      <span className="font-medium">
                        {pagination.page_size * (pagination.page - 1) + 1}
                      </span>{" "}
                      a{" "}
                      <span className="font-medium">
                        {Math.min(
                          pagination.page_size * pagination.page,
                          pagination.total_count,
                        )}
                      </span>{" "}
                      de{" "}
                      <span className="font-medium">
                        {pagination.total_count}
                      </span>{" "}
                      resultados
                    </p>
                  </div>
                  <div className="flex flex-1 justify-between sm:justify-end">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.has_previous || isLoading}
                      className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.has_next || isLoading}
                      className="relative ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </nav>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Info Drawer */}
      <StudentInfoDrawer
        userId={detailUserId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailUserId(null);
        }}
        onSaveSuccess={() => fetchUsers(page)}
      />

      {/* Beca Info Drawer */}
      <BecaInfoDrawer
        userId={becaUserId}
        isOpen={isBecaOpen}
        onClose={() => {
          setIsBecaOpen(false);
          setBecaUserId(null);
        }}
        onSaveSuccess={() => fetchUsers(page)}
      />

      {/* Becado Apply Drawer */}
      <BecadoApplyDrawer
        studentId={applyUserId}
        isOpen={isApplyOpen}
        onClose={() => {
          setIsApplyOpen(false);
          setApplyUserId(null);
        }}
        onApplied={() => fetchUsers(page)}
      />
    </div>
  );
};

export default Becados;
