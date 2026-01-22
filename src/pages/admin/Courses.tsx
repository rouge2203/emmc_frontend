import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { HiOutlineAcademicCap } from "react-icons/hi2";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import CourseCreateDrawer from "../../components/drawers/CourseCreateDrawer";
import CourseEditDrawer from "../../components/drawers/CourseEditDrawer";
import CourseTypeConfigDrawer from "../../components/drawers/CourseTypeConfigDrawer";
import { IoMdBook } from "react-icons/io";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";

interface Career {
  id: number;
  name: string;
}

interface CourseType {
  id: number;
  name: string;
  price: number;
}

interface Course {
  id: number;
  code: string;
  name: string;
  career: Career;
  career_name: string;
  prerequisite_code: string | null;
  estudiantes_count: number;
  course_type: CourseType;
  course_type_name: string;
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
  results: Course[];
  pagination: PaginationInfo;
}

interface CareersResponse {
  careers: Career[];
}

interface CourseTypesResponse {
  course_types: CourseType[];
}

const Courses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const urlParamsProcessed = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filters
  const [careerFilter, setCareerFilter] = useState<number | null>(null);
  const [courseTypeFilter, setCourseTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Drawers
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isCourseTypeConfigDrawerOpen, setIsCourseTypeConfigDrawerOpen] =
    useState(false);

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

  const fetchCourseTypes = async () => {
    try {
      const response = await axiosPrivate.get<CourseTypesResponse>(
        "courses/manage-course-types"
      );
      setCourseTypes(response.data.course_types);
    } catch (err: any) {
      console.error("Error fetching course types:", err);
    }
  };

  const fetchCourses = async (pageNum: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {
        page: pageNum,
        page_size: pageSize,
      };
      if (careerFilter) params.career_id = careerFilter;
      if (courseTypeFilter) params.course_type_id = courseTypeFilter;
      if (search) params.search = search;

      const response = await axiosPrivate.get<PaginatedResponse>(
        "courses/manage-courses",
        { params }
      );
      setCourses(response.data.results);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar los cursos");
      console.error("Error fetching courses:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  };

  useEffect(() => {
    fetchCareers();
    fetchCourseTypes();
  }, [axiosPrivate]);

  // Handle URL params - this should run before fetchCourses
  useEffect(() => {
    if (!isInitialized) {
      const careerIdParam = searchParams.get("career_id");
      if (careerIdParam && !urlParamsProcessed.current) {
        const careerId = parseInt(careerIdParam);
        if (!isNaN(careerId)) {
          setCareerFilter(careerId);
          setPage(1);
          urlParamsProcessed.current = true;
          // Clear URL params after reading them
          setSearchParams({}, { replace: true });
        }
      }
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isInitialized]);

  useEffect(() => {
    // Only fetch after initialization is complete
    if (isInitialized) {
      fetchCourses(page);
    }
  }, [
    axiosPrivate,
    page,
    pageSize,
    careerFilter,
    courseTypeFilter,
    search,
    isInitialized,
  ]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setCareerFilter(null);
    setCourseTypeFilter(null);
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  const hasActiveFilters =
    careerFilter !== null || courseTypeFilter !== null || search !== "";

  const handleEdit = (course: Course) => {
    setSelectedCourseId(course.id);
    setIsEditDrawerOpen(true);
  };

  const handleCloseEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setSelectedCourseId(null);
  };

  const handleCreateCourse = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const handleCourseCreated = () => {
    fetchCourses(page);
  };

  const handleCourseUpdated = (updatedCourse: Course) => {
    setCourses((prevCourses) =>
      prevCourses.map((course) =>
        course.id === updatedCourse.id ? updatedCourse : course
      )
    );
  };

  const handleCourseDeleted = () => {
    fetchCourses(page);
  };

  const handleEstudiantes = (course: Course) => {
    navigate(`/admin/cursos-matriculados?course_code=${course.code}`);
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
          <HiOutlineAcademicCap className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">
            Gestión de cursos disponibles en el sistema.
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex justify-left gap-2">
          <button
            type="button"
            onClick={() => setIsCourseTypeConfigDrawerOpen(true)}
            className="block rounded-md bg-gray-700 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 flex items-center gap-2"
          >
            <Cog6ToothIcon className="h-5 w-5" />
            Configuración de cursos
          </button>
          <button
            type="button"
            onClick={handleCreateCourse}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Crear curso
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
                Buscar por código o nombre
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
                    placeholder="Código o nombre del curso..."
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

            {/* Career Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="careerFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <HiOutlineBuildingLibrary className="h-4 w-4" />
                Carrera
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="careerFilter"
                  value={careerFilter || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCareerFilter(value ? parseInt(value) : null);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todas las carreras</option>
                  {careers.map((career) => (
                    <option key={career.id} value={career.id}>
                      {career.name}
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

            {/* Course Type Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="courseTypeFilter"
                className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <IoMdBook className="h-4 w-4" />
                Tipo de curso
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="courseTypeFilter"
                  value={courseTypeFilter || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCourseTypeFilter(value ? parseInt(value) : null);
                    setPage(1);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos los tipos</option>
                  {courseTypes.map((type) => (
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
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Cargando cursos...</p>
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
                        Código
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Nombre
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Carrera
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Prerequisito
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        Estudiantes
                      </th>
                      <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-0">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {courses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-5 pr-3 pl-4 text-sm text-center text-gray-500 sm:pl-0"
                        >
                          No se encontraron cursos
                        </td>
                      </tr>
                    ) : (
                      courses.map((course) => (
                        <tr key={course.id}>
                          <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                            <div className="font-medium text-gray-900">
                              {course.code}
                            </div>
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {course.name}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {course.career_name || "N/A"}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {course.prerequisite_code || "N/A"}
                          </td>
                          <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500">
                            {course.estudiantes_count}
                          </td>
                          <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEstudiantes(course)}
                                className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                              >
                                Matrículas
                                <span className="sr-only">, {course.code}</span>
                              </button>
                              <button
                                onClick={() => handleEdit(course)}
                                className="text-gray-900 hover:bg-gray-100 hover:text-primary shadow-sm hover:cursor-pointer border-gray-300 font-semibold hover:text-gray-70 border py-0.5 px-2 rounded-sm"
                              >
                                Detalles
                                <span className="sr-only">, {course.code}</span>
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
      <CourseCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        onCourseCreated={handleCourseCreated}
        careers={careers}
        courseTypes={courseTypes}
      />

      {/* Edit Drawer */}
      <CourseEditDrawer
        courseId={selectedCourseId}
        isOpen={isEditDrawerOpen}
        onClose={handleCloseEditDrawer}
        onCourseUpdated={handleCourseUpdated}
        onCourseDeleted={handleCourseDeleted}
        careers={careers}
        courseTypes={courseTypes}
      />

      {/* Course Type Config Drawer */}
      <CourseTypeConfigDrawer
        isOpen={isCourseTypeConfigDrawerOpen}
        onClose={() => setIsCourseTypeConfigDrawerOpen(false)}
        courseTypes={courseTypes}
        onCourseTypesUpdated={fetchCourseTypes}
      />
    </div>
  );
};

export default Courses;
