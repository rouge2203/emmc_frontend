import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { PiStudent } from "react-icons/pi";

import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  BarsArrowUpIcon,
  BanknotesIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import StudentInfoDrawer from "../../components/drawers/StudentInfoDrawer";
import StudentCreateDrawer from "../../components/drawers/StudentCreateDrawer";
import UserObservationsDrawer from "../../components/drawers/UserObservationsDrawer";
import BecadoApplyDrawer from "../../components/drawers/BecadoApplyDrawer";
import { RiMailCloseFill } from "react-icons/ri";
import { HiOutlineAcademicCap } from "react-icons/hi2";
import { LuVote } from "react-icons/lu";
import { GiClarinet } from "react-icons/gi";

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

const StudentUsers = () => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [users, setUsers] = useState<StudentUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isObservationsDrawerOpen, setIsObservationsDrawerOpen] =
    useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderBy, setOrderBy] = useState("-date_joined");
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const [noEmailFilter, setNoEmailFilter] = useState(false);
  const [enrollmentFilter, setEnrollmentFilter] = useState("");
  const [becadoFilter, setBecadoFilter] = useState("");
  const [becadoApplyUserId, setBecadoApplyUserId] = useState<number | null>(
    null,
  );
  const [isBecadoApplyOpen, setIsBecadoApplyOpen] = useState(false);

  const fetchUsers = useCallback(
    async (pageNum: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const requestData: any = {
          role: "student",
          page: pageNum,
          page_size: pageSize,
          order_by: orderBy,
        };

        if (searchQuery.trim()) {
          requestData.search = searchQuery.trim();
        }

        if (statusFilter !== null) {
          requestData.status = statusFilter;
        }

        if (noEmailFilter) {
          requestData.no_email_set = noEmailFilter;
        }

        if (enrollmentFilter) {
          requestData.enrollment_filter = enrollmentFilter;
        }

        if (becadoFilter) {
          requestData.becado = becadoFilter;
        }

        const response = await axiosPrivate.post<PaginatedResponse>(
          "users/get-users",
          requestData,
        );
        setUsers(response.data.results);
        setPagination(response.data.pagination);
      } catch (err: any) {
        setError(
          err?.response?.data?.error || "Error al cargar los estudiantes",
        );
        console.error("Error fetching student users:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      axiosPrivate,
      pageSize,
      searchQuery,
      orderBy,
      statusFilter,
      noEmailFilter,
      enrollmentFilter,
      becadoFilter,
    ],
  );

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    orderBy,
    statusFilter,
    noEmailFilter,
    enrollmentFilter,
    becadoFilter,
  ]);

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

  const handleEdit = (user: StudentUser) => {
    setSelectedUserId(user.id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUserId(null);
  };

  const handleCreateStudent = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const handleObservations = (user: StudentUser) => {
    const fullName =
      `${user.last_name || ""} ${user.first_name || ""}`.trim() || "Sin nombre";
    setSelectedUserId(user.id);
    setSelectedUserName(fullName);
    setIsObservationsDrawerOpen(true);
  };

  const handleCloseObservationsDrawer = () => {
    setIsObservationsDrawerOpen(false);
    setSelectedUserId(null);
    setSelectedUserName("");
  };

  const handleUserCreated = (newUser: StudentUser) => {
    // Add the new user to the current page if there's space, or refresh the table
    if (page === 1 && users.length < pageSize) {
      setUsers((prevUsers) => [...prevUsers, newUser]);
      // Update pagination if needed
      if (pagination) {
        setPagination({
          ...pagination,
          total_count: pagination.total_count + 1,
        });
      }
    } else {
      // Refresh the table to include the new user
      fetchUsers(page);
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setOrderBy("-date_joined");
    setStatusFilter(null);
    setNoEmailFilter(false);
    setEnrollmentFilter("");
    setBecadoFilter("");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    orderBy !== "-date_joined" ||
    statusFilter !== null ||
    noEmailFilter ||
    enrollmentFilter !== "" ||
    becadoFilter !== "";

  const handleOpenBecadoApply = (user: StudentUser) => {
    setBecadoApplyUserId(user.id);
    setIsBecadoApplyOpen(true);
  };

  // Placeholder image URL
  const getPlaceholderImage = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name,
    )}&background=155c95&color=fff&size=128`;
  };

  // if (isLoading) {
  //   return (
  //     <div className="px-4 sm:px-6 lg:px-8">
  //       <div className="flex items-center justify-center py-12">
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
  //           <p className="mt-4 text-sm text-gray-600">
  //             Cargando estudiantes...
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

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
          <PiStudent className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Gestión de estudiantes registrados en el sistema.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex justify-left">
          <button
            type="button"
            onClick={handleCreateStudent}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Registrar estudiante
          </button>
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
                    placeholder="Nombre, apellido, email o cédula..."
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

            {/* Status Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="statusFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <FunnelIcon className="h-4 w-4" />
                Acceso Portal
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="statusFilter"
                  value={
                    statusFilter === null
                      ? "all"
                      : statusFilter
                        ? "active"
                        : "inactive"
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setStatusFilter(
                      value === "all" ? null : value === "active",
                    );
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="all">Todos los accesos</option>
                  <option value="active">Solo activos</option>
                  <option value="inactive">Solo inactivos</option>
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

            {/* Enrollment Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="enrollmentFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <LuVote className="h-4 w-4" />
                Matrículas
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="enrollmentFilter"
                  value={enrollmentFilter}
                  onChange={(e) => setEnrollmentFilter(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todas</option>
                  <option value="matriculados">Matriculados</option>
                  <option value="sin_matricula">Sin matrícula</option>
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

            {/* Becado Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="becadoFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <AcademicCapIcon className="h-4 w-4" />
                Becado
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="becadoFilter"
                  value={becadoFilter}
                  onChange={(e) => setBecadoFilter(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos</option>
                  <option value="solo_becados">Solo becados</option>
                  <option value="sin_becado">Sin becado</option>
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
          {/* No Email Filter - Below search input */}
          <div className="flex items-center   justify-endstart sm:mt-2 mt-4">
            <input
              id="noEmailFilter"
              type="checkbox"
              checked={noEmailFilter}
              onChange={(e) => setNoEmailFilter(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label
              htmlFor="noEmailFilter"
              className="ml-2 text-xs font-medium text-gray-700"
            >
              Falta asignar correo
            </label>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">
                Cargando estudiantes...
              </p>
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
                        Acceso Portal
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Matrícula
                      </th>

                      <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                        <span className="sr-only">Editar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                        >
                          No se encontraron estudiantes
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
                                  <div className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                                    <span>
                                      {fullName}
                                      {user.profile?.carnet
                                        ? ` (${user.profile.carnet})`
                                        : ""}
                                    </span>
                                    {user.profile?.is_becado && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                        <AcademicCapIcon className="h-3 w-3" />
                                        Becado
                                        {user.profile.becado_percentage
                                          ? ` ${user.profile.becado_percentage}%`
                                          : ""}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-gray-500">
                                    {displayEmail}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                  user.is_active
                                    ? "bg-green-50 text-green-700 ring-green-600/20"
                                    : "bg-red-50 text-red-400 ring-red-600/20"
                                }`}
                              >
                                {user.is_active ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                              {user.has_active_enrollment ? (
                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                                  Activa
                                  {user.active_enrollment_period &&
                                  user.active_enrollment_year
                                    ? ` ${["I", "II", "III", "IV", "V"][user.active_enrollment_period - 1] || user.active_enrollment_period}-${user.active_enrollment_year}`
                                    : ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                  Inactiva
                                </span>
                              )}
                            </td>
                            {/* <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                              {user.profile?.carnet || "—"}
                            </td> */}
                            <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    // If last_name is null or blank, search only by first_name
                                    // If both exist, search only by last_name
                                    const searchTerm = user.last_name?.trim()
                                      ? user.last_name.trim()
                                      : user.first_name?.trim() || "";
                                    navigate(
                                      `/admin/cursos-matriculados?student_search=${encodeURIComponent(
                                        searchTerm,
                                      )}`,
                                    );
                                  }}
                                  className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm flex items-center gap-1"
                                >
                                  <HiOutlineAcademicCap className="h-4 w-4" />
                                  Cursos
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/admin/centro-de-pagos?student_id=${user.id}`,
                                    )
                                  }
                                  className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm flex items-center gap-1"
                                >
                                  <BanknotesIcon className="h-4 w-4" />
                                  Pagos
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const searchTerm =
                                      `${user.first_name || ""} ${user.last_name || ""}`.trim();
                                    navigate(
                                      `/admin/instrumentos/alquileres?user_search=${encodeURIComponent(
                                        searchTerm,
                                      )}`,
                                    );
                                  }}
                                  className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm flex items-center gap-1"
                                >
                                  <GiClarinet className="h-4 w-4" />
                                  Alquileres
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                                {user.profile?.is_becado && (
                                  <button
                                    onClick={() => handleOpenBecadoApply(user)}
                                    className="text-amber-800 bg-amber-50 hover:bg-amber-100 shadow-sm hover:cursor-pointer border border-amber-300 font-semibold py-0.5 px-2 rounded-sm flex items-center gap-1"
                                    title="Aplicar becado a pagos pendientes"
                                  >
                                    <AcademicCapIcon className="h-4 w-4" />
                                    Becado
                                    <span className="sr-only">
                                      , {fullName}
                                    </span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(user)}
                                  className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                                >
                                  Detalles
                                  <span className="sr-only">, {fullName}</span>
                                </button>
                                <button
                                  onClick={() => handleObservations(user)}
                                  className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                                >
                                  Observaciones
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
        userId={selectedUserId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onSaveSuccess={(updatedUser) => {
          // Update the specific user in the table without refetching
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === updatedUser.id ? updatedUser : user,
            ),
          );
        }}
      />

      {/* Student Create Drawer */}
      <StudentCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        onUserCreated={handleUserCreated}
      />

      {/* User Observations Drawer */}
      <UserObservationsDrawer
        userId={selectedUserId}
        userName={selectedUserName}
        isOpen={isObservationsDrawerOpen}
        onClose={handleCloseObservationsDrawer}
      />

      {/* Becado Apply Drawer */}
      <BecadoApplyDrawer
        isOpen={isBecadoApplyOpen}
        onClose={() => {
          setIsBecadoApplyOpen(false);
          setBecadoApplyUserId(null);
        }}
        studentId={becadoApplyUserId}
        onApplied={() => fetchUsers(page)}
      />
    </div>
  );
};

export default StudentUsers;
