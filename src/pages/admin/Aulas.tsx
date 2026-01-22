import { useEffect, useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import ClassroomDrawer from "../../components/drawers/ClassroomDrawer";

interface Classroom {
  id: number;
  number: number;
  name: string;
  display_name: string;
  enrollment_count: number;
  created_at: string | null;
}

export default function Aulas() {
  const axiosPrivate = useAxiosPrivate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const periods = [
    { value: "1", label: "Periodo 1" },
    { value: "2", label: "Periodo 2" },
    { value: "3", label: "Periodo 3" },
  ];

  useEffect(() => {
    // Generate available years (current year +/- 2)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    setAvailableYears(years);
    setSelectedYear(currentYear.toString());
  }, []);

  const fetchClassrooms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedPeriod) params.period = selectedPeriod;
      if (selectedYear) params.year = selectedYear;

      const response = await axiosPrivate.get<{ classrooms: Classroom[] }>(
        "courses/classrooms",
        { params }
      );
      setClassrooms(response.data.classrooms);
    } catch (err: any) {
      console.error("Error fetching classrooms:", err);
      setError("Error al cargar las aulas");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, [selectedPeriod, selectedYear]);

  const handleOpenCreate = () => {
    setEditingClassroom(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingClassroom(null);
  };

  const handleClassroomSaved = () => {
    fetchClassrooms();
    handleCloseDrawer();
  };

  const handleDeleteClick = (classroom: Classroom) => {
    setClassroomToDelete(classroom);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!classroomToDelete) return;
    setIsDeleting(true);
    try {
      await axiosPrivate.delete("courses/classrooms", {
        data: { classroom_id: classroomToDelete.id },
      });
      setDeleteDialogOpen(false);
      setClassroomToDelete(null);
      fetchClassrooms();
    } catch (err: any) {
      console.error("Error deleting classroom:", err);
      alert(err?.response?.data?.error || "Error al eliminar el aula");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setSelectedPeriod("");
    const currentYear = new Date().getFullYear();
    setSelectedYear(currentYear.toString());
    setSearchTerm("");
    setSearchInput("");
  };

  const hasActiveFilters =
    selectedPeriod !== "" ||
    selectedYear !== new Date().getFullYear().toString() ||
    searchTerm !== "";

  const filteredClassrooms = classrooms.filter((classroom) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      classroom.name.toLowerCase().includes(searchLower) ||
      classroom.number.toString().includes(searchLower) ||
      classroom.display_name.toLowerCase().includes(searchLower)
    );
  });

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
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto flex items-start sm:items-center gap-2">
          <HiOutlineBuildingOffice2 className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Gestión de aulas disponibles para los cursos.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Crear aula
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
            {/* Search */}
            <div className="flex-1">
              <label
                htmlFor="search"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Buscar por número o descripción
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
                    placeholder="Número o descripción del aula..."
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

            {/* Period filter */}
            <div className="sm:w-48">
              <label
                htmlFor="periodFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <CalendarIcon className="h-4 w-4" />
                Periodo
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="periodFilter"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos los periodos</option>
                  {periods.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
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

            {/* Year filter */}
            <div className="sm:w-48">
              <label
                htmlFor="yearFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <CalendarIcon className="h-4 w-4" />
                Año
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="yearFilter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos los años</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
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
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Cargando aulas...</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="mt-2 sm:mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="sm:border sm:border-gray-300 sm:rounded-x-md sm:rounded-md sm:py-2 sm:px-4">
                <table className="relative min-w-full divide-y divide-gray-300">
                  <thead className="">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                      >
                        Aula
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Descripción
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Matrículas Activas
                      </th>
                      <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredClassrooms.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                        >
                          {searchTerm
                            ? "No se encontraron aulas que coincidan con la búsqueda"
                            : "No hay aulas registradas"}
                        </td>
                      </tr>
                    ) : (
                      filteredClassrooms.map((classroom) => (
                        <tr key={classroom.id}>
                          <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                            <div className="font-medium text-gray-900">
                              Aula {classroom.number}
                            </div>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {classroom.name || "—"}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {classroom.enrollment_count}
                          </td>
                          <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleOpenEdit(classroom)}
                                className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                              >
                                Detalles
                                <span className="sr-only">
                                  , {classroom.display_name}
                                </span>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(classroom)}
                                className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={classroom.enrollment_count > 0}
                                title={
                                  classroom.enrollment_count > 0
                                    ? "No se puede eliminar un aula con matrículas activas"
                                    : "Eliminar aula"
                                }
                              >
                                <TrashIcon className="h-5 w-5" />
                                <span className="sr-only">
                                  Eliminar {classroom.display_name}
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

      {/* Classroom Drawer */}
      <ClassroomDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onClassroomSaved={handleClassroomSaved}
        editingClassroom={editingClassroom}
      />

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500/75 bg-opacity-75 transition-opacity"
              onClick={() => setDeleteDialogOpen(false)}
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    Eliminar Aula
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas eliminar{" "}
                      <span className="font-medium text-gray-900">
                        Aula {classroomToDelete?.number}
                      </span>
                      ? Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setClassroomToDelete(null);
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
