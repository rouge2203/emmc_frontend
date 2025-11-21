import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { LuListChecks } from "react-icons/lu";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import CourseEnrollmentCreateDrawer from "../../components/drawers/CourseEnrollmentCreateDrawer";
import CourseEnrollmentEditDrawer from "../../components/drawers/CourseEnrollmentEditDrawer";
import CourseEnrollmentScheduleDrawer from "../../components/drawers/CourseEnrollmentScheduleDrawer";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";

interface Career {
  id: number;
  name: string;
}

interface CourseEnrollment {
  id: number;
  course: {
    id: number;
    code: string;
    name: string;
    career_name: string | null;
  };
  course_name: string;
  course_code: string;
  course_career_name: string | null;
  student: {
    id: number;
    first_name: string;
    last_name: string;
  };
  student_full_name: string;
  professor: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  professor_full_name: string | null;
  period: number;
  period_display: string;
  year: number;
  price: number;
  week_duration: number;
  status: string;
  grade: number | null;
  professor_observation: string | null;
  schedule_set: boolean;
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
  results: CourseEnrollment[];
  pagination: PaginationInfo;
  counts: {
    missing_professor_count: number;
    missing_schedule_count: number;
  };
}

interface CareersResponse {
  careers: Career[];
}

interface YearsResponse {
  years: number[];
}

const CourseEnrollments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const axiosPrivate = useAxiosPrivate();
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [counts, setCounts] = useState<{
    missing_professor_count: number;
    missing_schedule_count: number;
  }>({ missing_professor_count: 0, missing_schedule_count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const urlParamsProcessed = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [careerFilter, setCareerFilter] = useState<number | null>(null);
  const [missingProfessorFilter, setMissingProfessorFilter] = useState(false);
  const [missingScheduleFilter, setMissingScheduleFilter] = useState(false);

  // Drawers
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<
    number | null
  >(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  const [selectedEnrollmentForSchedule, setSelectedEnrollmentForSchedule] =
    useState<number | null>(null);

  const fetchCareers = async () => {
    try {
      const response = await axiosPrivate.get<CareersResponse>(
        "courses/manage-careers"
      );
      setCareers(response.data.careers);
    } catch (err: any) {
      console.error("Error fetching careers:", err);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const response = await axiosPrivate.get<YearsResponse>(
        "courses/enrollment-years"
      );
      setAvailableYears(response.data.years);
    } catch (err: any) {
      console.error("Error fetching available years:", err);
    }
  };

  const fetchEnrollments = async (pageNum: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {
        page: pageNum,
        page_size: pageSize,
      };
      if (studentSearch) params.student_search = studentSearch;
      if (yearFilter) params.year = yearFilter;
      if (careerFilter) params.career_id = careerFilter;
      if (missingProfessorFilter) params.missing_professor = true;
      if (missingScheduleFilter) params.missing_schedule = true;

      const response = await axiosPrivate.get<PaginatedResponse>(
        "courses/manage-enrollments",
        { params }
      );
      setEnrollments(response.data.results);
      setPagination(response.data.pagination);
      setCounts(response.data.counts);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar las matrículas");
      console.error("Error fetching enrollments:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  };

  useEffect(() => {
    fetchCareers();
    fetchAvailableYears();
  }, [axiosPrivate]);

  // Handle URL params - this should run before fetchEnrollments
  useEffect(() => {
    if (!isInitialized) {
      const courseCodeParam = searchParams.get("course_code");
      const studentSearchParam = searchParams.get("student_search");
      
      if (courseCodeParam && !urlParamsProcessed.current) {
        setStudentSearch(courseCodeParam);
        setStudentSearchInput(courseCodeParam);
        setPage(1);
        urlParamsProcessed.current = true;
        setSearchParams({}, { replace: true });
      } else if (studentSearchParam && !urlParamsProcessed.current) {
        setStudentSearch(studentSearchParam);
        setStudentSearchInput(studentSearchParam);
        setPage(1);
        urlParamsProcessed.current = true;
        setSearchParams({}, { replace: true });
      }
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isInitialized]);

  useEffect(() => {
    // Only fetch after initialization is complete
    if (isInitialized) {
      fetchEnrollments(page);
    }
  }, [
    axiosPrivate,
    page,
    pageSize,
    studentSearch,
    yearFilter,
    careerFilter,
    missingProfessorFilter,
    missingScheduleFilter,
    isInitialized,
  ]);

  const handleSearch = () => {
    setStudentSearch(studentSearchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setStudentSearch("");
    setStudentSearchInput("");
    setYearFilter(null);
    setCareerFilter(null);
    setMissingProfessorFilter(false);
    setMissingScheduleFilter(false);
    setPage(1);
  };

  const hasActiveFilters =
    studentSearch !== "" ||
    yearFilter !== null ||
    careerFilter !== null ||
    missingProfessorFilter ||
    missingScheduleFilter;

  const handleEdit = (enrollment: CourseEnrollment) => {
    setSelectedEnrollmentId(enrollment.id);
    setIsEditDrawerOpen(true);
  };

  const handleCloseEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setSelectedEnrollmentId(null);
  };

  const handleCreateEnrollment = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const handleEnrollmentCreated = () => {
    fetchEnrollments(page);
  };

  const handleEnrollmentUpdated = (updatedEnrollment: CourseEnrollment) => {
    setEnrollments((prevEnrollments) =>
      prevEnrollments.map((enrollment) =>
        enrollment.id === updatedEnrollment.id ? updatedEnrollment : enrollment
      )
    );
  };

  const handleEnrollmentDeleted = () => {
    fetchEnrollments(page);
  };

  const handleCountsUpdate = () => {
    fetchEnrollments(page);
  };

  const handleAssignProfessor = (enrollment: CourseEnrollment) => {
    setSelectedEnrollmentId(enrollment.id);
    setIsEditDrawerOpen(true);
  };

  const handleAssignSchedule = (enrollment: CourseEnrollment) => {
    setSelectedEnrollmentForSchedule(enrollment.id);
    setIsScheduleDrawerOpen(true);
  };

  const handleCloseScheduleDrawer = () => {
    setIsScheduleDrawerOpen(false);
    setSelectedEnrollmentForSchedule(null);
  };

  const handleScheduleUpdated = () => {
    fetchEnrollments(page);
  };

  const toggleMissingProfessorFilter = () => {
    setMissingProfessorFilter(!missingProfessorFilter);
    setMissingScheduleFilter(false);
    setPage(1);
  };

  const toggleMissingScheduleFilter = () => {
    setMissingScheduleFilter(!missingScheduleFilter);
    setMissingProfessorFilter(false);
    setPage(1);
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
          <LuListChecks className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Gestión de cursos matriculados en el sistema.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateEnrollment}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Registrar matrícula
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 mt-6">
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
                htmlFor="studentSearch"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Buscar por estudiante
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
                    id="studentSearch"
                    type="text"
                    value={studentSearchInput}
                    onChange={(e) => setStudentSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nombre, apellido, código o nombre del curso..."
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

            {/* Year Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="yearFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <CalendarDaysIcon className="h-4 w-4" />
                Año
              </label>
              <select
                id="yearFilter"
                value={yearFilter || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setYearFilter(value ? parseInt(value) : null);
                  setPage(1);
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Todos los años</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Career Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="careerFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <HiOutlineBuildingLibrary className="h-4 w-4" />
                Cátedra
              </label>
              <select
                id="careerFilter"
                value={careerFilter || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setCareerFilter(value ? parseInt(value) : null);
                  setPage(1);
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Todas las cátedras</option>
                {careers.map((career) => (
                  <option key={career.id} value={career.id}>
                    {career.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Filter Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border ${
                missingProfessorFilter
                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon
                  className={`size-4 ${
                    missingProfessorFilter ? "text-red-500" : "text-red-400"
                  }`}
                />
                <p className="text-xs font-medium text-gray-900">
                  {counts.missing_professor_count} estudiantes faltan de asignar
                  profesor
                </p>
              </div>
              {counts.missing_professor_count > 0 && (
                <button
                  type="button"
                  onClick={toggleMissingProfessorFilter}
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    missingProfessorFilter
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {missingProfessorFilter ? "Ocultar" : "Ver"}
                </button>
              )}
            </div>
            <div
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border ${
                missingScheduleFilter
                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon
                  className={`h-4 w-4 ${
                    missingScheduleFilter
                      ? "text-yellow-500"
                      : "text-yellow-400"
                  }`}
                />
                <p className="text-xs font-medium text-gray-900">
                  {counts.missing_schedule_count} estudiantes faltan de asignar
                  horario
                </p>
              </div>
              {counts.missing_schedule_count > 0 && (
                <button
                  type="button"
                  onClick={toggleMissingScheduleFilter}
                  className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    missingScheduleFilter
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {missingScheduleFilter ? "Ocultar" : "Ver"}
                </button>
              )}
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
                Cargando matrículas...
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
                        Curso
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Código
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Estudiante
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
                        Período - Año
                      </th>
                      <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {enrollments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                        >
                          No se encontraron matrículas
                        </td>
                      </tr>
                    ) : (
                      enrollments.map((enrollment) => (
                        <tr key={enrollment.id}>
                          <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                            <div className="font-medium text-gray-900">
                              {enrollment.course_name}
                            </div>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {enrollment.course_code}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {enrollment.student_full_name}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                enrollment.status === "cursando"
                                  ? "bg-blue-100 text-blue-800"
                                  : enrollment.status === "aprobado"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {enrollment.status}
                            </span>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {enrollment.period_display} - {enrollment.year}
                          </td>
                          <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                            <div className="flex gap-2 justify-end">
                              {!enrollment.professor && (
                                <button
                                  onClick={() =>
                                    handleAssignProfessor(enrollment)
                                  }
                                  className="text-gray-900 flex items-center gap-1 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-mediu hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                                >
                                  <ExclamationCircleIcon className="h-4 w-4 text-red-500 animate-pulse" />
                                  Asignar profesor
                                  <span className="sr-only">
                                    , {enrollment.course_code}
                                  </span>
                                </button>
                              )}
                              {!enrollment.schedule_set && (
                                <button
                                  onClick={() =>
                                    handleAssignSchedule(enrollment)
                                  }
                                  className="text-gray-900 flex items-center gap-1 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-mediu hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                                >
                                  <ExclamationCircleIcon className="h-4 w-4 text-yellow-500 animate-pulse" />
                                  Asignar horario
                                  <span className="sr-only">
                                    , {enrollment.course_code}
                                  </span>
                                </button>
                              )}
                              {enrollment.schedule_set && (
                                <button
                                  onClick={() =>
                                    handleAssignSchedule(enrollment)
                                  }
                                  className="text-gray-900 flex items-center gap-1 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-mediu hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                                >
                                  <ClockIcon className="h-4 w-4 text-gray-600" />
                                  Ver horario
                                  <span className="sr-only">
                                    , {enrollment.course_code}
                                  </span>
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(enrollment)}
                                className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                              >
                                Detalles
                                <span className="sr-only">
                                  , {enrollment.course_code}
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
      <CourseEnrollmentCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        onEnrollmentCreated={handleEnrollmentCreated}
      />

      {/* Edit Drawer */}
      <CourseEnrollmentEditDrawer
        enrollmentId={selectedEnrollmentId}
        isOpen={isEditDrawerOpen}
        onClose={handleCloseEditDrawer}
        onEnrollmentUpdated={handleEnrollmentUpdated}
        onEnrollmentDeleted={handleEnrollmentDeleted}
        onCountsUpdate={handleCountsUpdate}
      />

      {/* Schedule Drawer */}
      <CourseEnrollmentScheduleDrawer
        enrollmentId={selectedEnrollmentForSchedule}
        isOpen={isScheduleDrawerOpen}
        onClose={handleCloseScheduleDrawer}
        onScheduleUpdated={handleScheduleUpdated}
      />
    </div>
  );
};

export default CourseEnrollments;
