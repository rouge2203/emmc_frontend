import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { MdOutlineInventory } from "react-icons/md";
import { GiTrumpet } from "react-icons/gi";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import InstrumentCreateDrawer from "../../components/drawers/InstrumentCreateDrawer";
import InstrumentEditDrawer from "../../components/drawers/InstrumentEditDrawer";

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
  condition: string | null;
  status: string | null;
  location: string | null;
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
  results: Instrument[];
  pagination: PaginationInfo;
}

interface InstrumentTypesResponse {
  instrument_types: InstrumentType[];
}

const Inventario = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters
  const [instrumentTypeFilter, setInstrumentTypeFilter] = useState<
    number | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [serialNumberSearch, setSerialNumberSearch] = useState("");
  const [serialNumberInput, setSerialNumberInput] = useState("");

  // Drawers
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<
    number | null
  >(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [defaultInstrumentTypeId, setDefaultInstrumentTypeId] = useState<
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

  const fetchInstruments = async (pageNum: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {
        page: pageNum,
        page_size: pageSize,
      };
      if (instrumentTypeFilter)
        params.instrument_type_id = instrumentTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (serialNumberSearch) params.serial_number = serialNumberSearch;

      const response = await axiosPrivate.get<PaginatedResponse>(
        "instruments/manage-instruments",
        { params }
      );
      setInstruments(response.data.results);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Error al cargar los instrumentos"
      );
      console.error("Error fetching instruments:", err);
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
    const instrumentTypeIdParam = searchParams.get("instrument_type_id");

    if (instrumentTypeIdParam) {
      const instrumentTypeId = parseInt(instrumentTypeIdParam);
      if (!isNaN(instrumentTypeId)) {
        if (action === "create") {
          setDefaultInstrumentTypeId(instrumentTypeId);
          setIsCreateDrawerOpen(true);
          // Clear URL params after reading them
          setSearchParams({});
        } else if (action === "view") {
          setInstrumentTypeFilter(instrumentTypeId);
          setPage(1);
          // Clear URL params after reading them
          setSearchParams({});
        }
      }
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchInstruments(page);
  }, [
    axiosPrivate,
    page,
    pageSize,
    instrumentTypeFilter,
    statusFilter,
    serialNumberSearch,
  ]);

  const handleSearch = () => {
    setSerialNumberSearch(serialNumberInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setInstrumentTypeFilter(null);
    setStatusFilter(null);
    setSerialNumberSearch("");
    setSerialNumberInput("");
    setPage(1);
  };

  const hasActiveFilters =
    instrumentTypeFilter !== null ||
    statusFilter !== null ||
    serialNumberSearch !== "";

  const handleEdit = (instrument: Instrument) => {
    setSelectedInstrumentId(instrument.id);
    setIsEditDrawerOpen(true);
  };

  const handleCloseEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setSelectedInstrumentId(null);
  };

  const handleCreateInstrument = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
    setDefaultInstrumentTypeId(null);
  };

  const handleInstrumentCreated = () => {
    fetchInstruments(page);
  };

  const handleInstrumentUpdated = (updatedInstrument: Instrument) => {
    setInstruments((prevInstruments) =>
      prevInstruments.map((inst) =>
        inst.id === updatedInstrument.id ? updatedInstrument : inst
      )
    );
  };

  const handleInstrumentDeleted = () => {
    fetchInstruments(page);
  };

  const handleViewLoan = (instrument: Instrument) => {
    navigate(
      `/admin/instrumentos/alquileres?action=view&instrument_id=${instrument.id}`
    );
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
          <MdOutlineInventory className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Inventario de instrumentos disponibles en el sistema.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex justify-left">
          <button
            type="button"
            onClick={handleCreateInstrument}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Registrar unidad
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
            {/* Serial Number Search */}
            <div className="flex-1">
              <label
                htmlFor="serialNumber"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Buscar por número de serie
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
                    id="serialNumber"
                    type="text"
                    value={serialNumberInput}
                    onChange={(e) => setSerialNumberInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Número de serie..."
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

            {/* Instrument Type Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="instrumentTypeFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <GiTrumpet className="h-4 w-4" />
                Tipo de instrumento
              </label>
              <select
                id="instrumentTypeFilter"
                value={instrumentTypeFilter || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setInstrumentTypeFilter(value ? parseInt(value) : null);
                  setPage(1);
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Todos los tipos</option>
                {instrumentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
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
              <select
                id="statusFilter"
                value={statusFilter || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setStatusFilter(value || null);
                  setPage(1);
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Todos los estados</option>
                <option value="libre">Libre</option>
                <option value="alquilado">Alquilado</option>
              </select>
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
                Cargando instrumentos...
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
                        Condición
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Estado
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Ubicación
                      </th>
                      <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {instruments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                        >
                          No se encontraron instrumentos
                        </td>
                      </tr>
                    ) : (
                      instruments.map((instrument) => (
                        <tr key={instrument.id}>
                          <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                            <div className="font-medium text-gray-900">
                              {instrument.instrument_type.name}
                            </div>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {instrument.serial_number || "N/A"}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {instrument.condition || "N/A"}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                instrument.status === "alquilado"
                                  ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                                  : "bg-green-50 text-green-700 ring-green-600/20"
                              }`}
                            >
                              {instrument.status === "alquilado"
                                ? "Alquilado"
                                : "Libre"}
                            </span>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {instrument.location || "N/A"}
                          </td>
                          <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                            <div className="flex gap-2 justify-end">
                              {instrument.status === "alquilado" && (
                                <button
                                  onClick={() => handleViewLoan(instrument)}
                                  className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                                >
                                  Ver alquiler
                                  <span className="sr-only">
                                    , {instrument.instrument_type.name}
                                  </span>
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(instrument)}
                                className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                              >
                                Detalles
                                <span className="sr-only">
                                  , {instrument.instrument_type.name}
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
      <InstrumentCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        onInstrumentCreated={handleInstrumentCreated}
        instrumentTypes={instrumentTypes}
        defaultInstrumentTypeId={defaultInstrumentTypeId}
      />

      {/* Edit Drawer */}
      <InstrumentEditDrawer
        instrumentId={selectedInstrumentId}
        isOpen={isEditDrawerOpen}
        onClose={handleCloseEditDrawer}
        onInstrumentUpdated={handleInstrumentUpdated}
        onInstrumentDeleted={handleInstrumentDeleted}
      />
    </div>
  );
};

export default Inventario;
