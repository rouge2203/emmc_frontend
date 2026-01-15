import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { PiArrowCounterClockwiseFill } from "react-icons/pi";
import { GiTrumpet } from "react-icons/gi";
import {
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BarsArrowUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import { Transition } from "@headlessui/react";
import InstrumentLoanCreateDrawer from "../../components/drawers/InstrumentLoanCreateDrawer";
import InstrumentLoanEditDrawer from "../../components/drawers/InstrumentLoanEditDrawer";
import InstrumentReturnDrawer from "../../components/drawers/InstrumentReturnDrawer";

interface InstrumentType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface Instrument {
  id: number;
  instrument_type: InstrumentType;
  serial_number: string | null;
}

interface LoanUser {
  id: number;
  first_name: string;
  last_name: string;
}

interface InstrumentLoan {
  id: number;
  instrument: Instrument;
  loan_user: LoanUser;
  loan_date: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  updated_by: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
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
  results: InstrumentLoan[];
  pagination: PaginationInfo;
}

interface InstrumentTypesResponse {
  instrument_types: InstrumentType[];
}

const InstrumentLoans = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const axiosPrivate = useAxiosPrivate();
  const [loans, setLoans] = useState<InstrumentLoan[]>([]);
  const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<string>("asc");
  const [userSearch, setUserSearch] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [instrumentTypeFilter, setInstrumentTypeFilter] = useState<
    number | null
  >(null);

  // Drawers
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<
    number | null
  >(null);
  const [isReturnDrawerOpen, setIsReturnDrawerOpen] = useState(false);
  const [showLoanNotFoundNotification, setShowLoanNotFoundNotification] =
    useState(false);
  const [missingLoanInstrumentId, setMissingLoanInstrumentId] = useState<
    number | null
  >(null);

  const fetchInstrumentTypes = async () => {
    try {
      const response = await axiosPrivate.get<InstrumentTypesResponse>(
        "instruments/manage-instruments-types"
      );
      setInstrumentTypes(response.data.instrument_types);
    } catch (err: any) {
      console.error("Error fetching instrument types:", err);
    }
  };

  const fetchLoans = async (pageNum: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {
        page: pageNum,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (orderBy) params.order_by = orderBy;
      if (userSearch) params.user_search = userSearch;
      if (instrumentTypeFilter)
        params.instrument_type_id = instrumentTypeFilter;

      const response = await axiosPrivate.get<PaginatedResponse>(
        "instruments/manage-instruments-loans",
        { params }
      );
      setLoans(response.data.results);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar los alquileres");
      console.error("Error fetching loans:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  };

  useEffect(() => {
    fetchInstrumentTypes();
  }, [axiosPrivate]);

  // Handle URL params on mount
  useEffect(() => {
    const action = searchParams.get("action");
    const instrumentIdParam = searchParams.get("instrument_id");

    if (instrumentIdParam && action === "view") {
      const instrumentId = parseInt(instrumentIdParam);
      if (!isNaN(instrumentId)) {
        // Fetch loans for this instrument and find the active one (status="prestado")
        fetchLoanByInstrument(instrumentId);
        // Clear URL params after reading them
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams]);

  const fetchLoanByInstrument = async (instrumentId: number) => {
    try {
      const response = await axiosPrivate.get<PaginatedResponse>(
        "instruments/manage-instruments-loans",
        {
          params: {
            instrument_id: instrumentId,
            status: "prestado",
            page: 1,
            page_size: 10,
          },
        }
      );
      // Find the most recent loan (should be the active one)
      if (response.data.results.length > 0) {
        const activeLoan = response.data.results[0]; // Results are ordered by created_at desc
        setSelectedLoanId(activeLoan.id);
        setIsEditDrawerOpen(true);
      } else {
        // No loan found - show notification
        setMissingLoanInstrumentId(instrumentId);
        setShowLoanNotFoundNotification(true);
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          setShowLoanNotFoundNotification(false);
        }, 20000);
      }
    } catch (err: any) {
      console.error("Error fetching loan by instrument:", err);
      // Show notification even on error
      setMissingLoanInstrumentId(instrumentId);
      setShowLoanNotFoundNotification(true);
      setTimeout(() => {
        setShowLoanNotFoundNotification(false);
      }, 20000);
    }
  };

  useEffect(() => {
    fetchLoans(page);
  }, [
    axiosPrivate,
    page,
    pageSize,
    statusFilter,
    orderBy,
    userSearch,
    instrumentTypeFilter,
  ]);

  const handleUserSearch = () => {
    setUserSearch(userSearchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleUserSearch();
    }
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setOrderBy("asc");
    setUserSearch("");
    setUserSearchInput("");
    setInstrumentTypeFilter(null);
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter !== null ||
    orderBy !== "asc" ||
    userSearch !== "" ||
    instrumentTypeFilter !== null;

  const handleEdit = (loan: InstrumentLoan) => {
    setSelectedLoanId(loan.id);
    setIsEditDrawerOpen(true);
  };

  const handleCloseEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setSelectedLoanId(null);
  };

  const handleCreateLoan = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
    setMissingLoanInstrumentId(null);
  };

  const handleLoanCreated = () => {
    fetchLoans(page);
  };

  const handleLoanUpdated = (updatedLoan: InstrumentLoan) => {
    setLoans((prevLoans) =>
      prevLoans.map((loan) => (loan.id === updatedLoan.id ? updatedLoan : loan))
    );
  };

  const handleLoanDeleted = () => {
    fetchLoans(page);
  };

  const handleRegisterReturn = (loan: InstrumentLoan) => {
    setSelectedLoanForReturn(loan.id);
    setIsReturnDrawerOpen(true);
  };

  const handleCloseReturnDrawer = () => {
    setIsReturnDrawerOpen(false);
    setSelectedLoanForReturn(null);
  };

  const handleReturnRegistered = () => {
    fetchLoans(page);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-CR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  if (error && !isLoading) {
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
          <PiArrowCounterClockwiseFill className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Alquileres de instrumentos en el sistema.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex justify-left">
          <button
            type="button"
            onClick={handleCreateLoan}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Registrar alquiler
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
            {/* User Search */}
            <div className="flex-1">
              <label
                htmlFor="userSearch"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Buscar por usuario
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
                    id="userSearch"
                    type="text"
                    value={userSearchInput}
                    onChange={(e) => setUserSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nombre o apellido del usuario..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUserSearch}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Instrument Type Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="instrumentTypeFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <GiTrumpet className="h-4 w-4" />
                Tipo de instrumento
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="instrumentTypeFilter"
                  value={instrumentTypeFilter || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInstrumentTypeFilter(value ? parseInt(value) : null);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos los tipos</option>
                  {instrumentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
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
                Estado
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="statusFilter"
                  value={statusFilter || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStatusFilter(value || null);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos los estados</option>
                  <option value="prestado">Prestado</option>
                  <option value="devuelto">Devuelto</option>
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

            {/* Order By Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="orderByFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <BarsArrowUpIcon className="h-4 w-4" />
                Ordenar por fecha de retorno
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="orderByFilter"
                  value={orderBy}
                  onChange={(e) => {
                    setOrderBy(e.target.value);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
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
              <p className="mt-4 text-sm text-gray-600">
                Cargando alquileres...
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
                        Tipo de instrumento
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Número de serie
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Usuario
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Fecha de préstamo
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Fecha de retorno esperada
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Estado
                      </th>
                      <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loans.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                        >
                          No se encontraron alquileres
                        </td>
                      </tr>
                    ) : (
                      loans.map((loan) => (
                        <tr key={loan.id}>
                          <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                            <div className="font-medium text-gray-900">
                              {loan.instrument.instrument_type.name}
                            </div>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {loan.instrument.serial_number || "N/A"}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {`${loan.loan_user.first_name} ${loan.loan_user.last_name}`}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(loan.loan_date)}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(loan.expected_return_date)}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                loan.status === "prestado"
                                  ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                                  : "bg-green-50 text-green-700 ring-green-600/20"
                              }`}
                            >
                              {loan.status === "prestado"
                                ? "Prestado"
                                : "Devuelto"}
                            </span>
                          </td>
                          <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                            <div className="flex gap-2 justify-end">
                              {loan.status === "prestado" && (
                                <button
                                  onClick={() => handleRegisterReturn(loan)}
                                  className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                                >
                                  Registrar retorno
                                  <span className="sr-only">
                                    , {loan.instrument.instrument_type.name}
                                  </span>
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(loan)}
                                className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                              >
                                Detalles
                                <span className="sr-only">
                                  , {loan.instrument.instrument_type.name}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && (
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
                  pagination.total_count
                )}
              </span>{" "}
              de <span className="font-medium">{pagination.total_count}</span>{" "}
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

      {/* Create Drawer */}
      <InstrumentLoanCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        onLoanCreated={handleLoanCreated}
        defaultInstrumentId={missingLoanInstrumentId}
      />

      {/* Edit Drawer */}
      <InstrumentLoanEditDrawer
        loanId={selectedLoanId}
        isOpen={isEditDrawerOpen}
        onClose={handleCloseEditDrawer}
        onLoanUpdated={handleLoanUpdated}
        onLoanDeleted={handleLoanDeleted}
      />

      {/* Return Drawer */}
      <InstrumentReturnDrawer
        loanId={selectedLoanForReturn}
        isOpen={isReturnDrawerOpen}
        onClose={handleCloseReturnDrawer}
        onReturnRegistered={handleReturnRegistered}
      />

      {/* Loan Not Found Notification */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showLoanNotFoundNotification}>
                <div className="pointer-events-auto w-full max-w-sm sm:max-w-lg rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <ExclamationTriangleIcon
                          aria-hidden="true"
                          className="size-6 text-yellow-600"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Registro de alquiler no encontrado
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          No se encontró un registro de alquiler activo para
                          este instrumento. Por favor, verifica si el
                          instrumento está realmente alquilado. Si es así, te
                          recomendamos encarecidamente registrarlo aquí
                          indicando a quién se le prestó.
                        </p>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowLoanNotFoundNotification(false);
                              setIsCreateDrawerOpen(true);
                            }}
                            className="text-sm font-medium text-primary hover:text-primary/90"
                          >
                            Registrar alquiler ahora
                          </button>
                        </div>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowLoanNotFoundNotification(false);
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
    </div>
  );
};

export default InstrumentLoans;
