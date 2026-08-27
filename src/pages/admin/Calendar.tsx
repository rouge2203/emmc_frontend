import { useEffect, useState, useRef } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  UserIcon,
  ClockIcon,
  PencilIcon,
  CalendarIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import CourseEnrollmentCreateDrawer from "../../components/drawers/CourseEnrollmentCreateDrawer";
import CourseEnrollmentEditDrawer from "../../components/drawers/CourseEnrollmentEditDrawer";
import CourseEnrollmentScheduleDrawer from "../../components/drawers/CourseEnrollmentScheduleDrawer";
import {
  HiOutlineBuildingLibrary,
  HiOutlineAcademicCap,
} from "react-icons/hi2";
import { PiStudent } from "react-icons/pi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";

interface Career {
  id: number;
  name: string;
}

interface CourseEnrollment {
  id: number;
  course_code: string;
  course_name: string;
  student_full_name: string;
  professor_full_name: string | null;
  status: string;
  schedule_set: boolean;
  schedules?: CourseEnrollmentSchedule[];
}

interface CourseEnrollmentSchedule {
  id: number;
  course_enrollment: number;
  day: string;
  day_display: string;
  hour: string | null;
}

interface CalendarScheduleEvent {
  id: number;
  enrollment_id: number;
  schedule_id: number;
  course_code: string;
  course_name: string;
  student_name: string;
  professor_name: string | null;
  day: string;
  hour: string | null;
}

interface DayEvents {
  day: string;
  dayDisplay: string;
  events: CalendarScheduleEvent[];
}

interface CareersResponse {
  careers: Career[];
}

interface Professor {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
}

interface ProfessorsResponse {
  professors: Professor[];
}

interface YearsResponse {
  years: number[];
}

interface EnrollmentsResponse {
  results: CourseEnrollment[];
  pagination: any;
  counts: {
    missing_professor_count: number;
    missing_schedule_count: number;
  };
}

// Color palette for events
const eventColors = [
  {
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    text: "text-blue-700",
    textLight: "text-blue-600",
  },
  {
    bg: "bg-green-50",
    hover: "hover:bg-green-100",
    text: "text-green-700",
    textLight: "text-green-600",
  },
  {
    bg: "bg-purple-50",
    hover: "hover:bg-purple-100",
    text: "text-purple-700",
    textLight: "text-purple-600",
  },
  {
    bg: "bg-pink-50",
    hover: "hover:bg-pink-100",
    text: "text-pink-700",
    textLight: "text-pink-600",
  },
  {
    bg: "bg-yellow-50",
    hover: "hover:bg-yellow-100",
    text: "text-yellow-700",
    textLight: "text-yellow-600",
  },
  {
    bg: "bg-indigo-50",
    hover: "hover:bg-primary",
    text: "text-primary",
    textLight: "text-primary",
  },
  {
    bg: "bg-red-50",
    hover: "hover:bg-red-100",
    text: "text-red-700",
    textLight: "text-red-600",
  },
  {
    bg: "bg-teal-50",
    hover: "hover:bg-teal-100",
    text: "text-teal-700",
    textLight: "text-teal-600",
  },
];

// The calendar always shows one academic year; it opens on the current one.
const DEFAULT_YEAR = new Date().getFullYear();

const PERIOD_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Todos" },
  { value: 1, label: "I" },
  { value: 2, label: "II" },
  { value: 3, label: "III" },
];

const Calendar = () => {
  const axiosPrivate = useAxiosPrivate();
  const [dayEvents, setDayEvents] = useState<DayEvents[]>([]);
  const enrollmentColorsRef = useRef<Map<number, number>>(new Map());
  const [careers, setCareers] = useState<Career[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [counts, setCounts] = useState<{
    missing_professor_count: number;
    missing_schedule_count: number;
  }>({ missing_professor_count: 0, missing_schedule_count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentsMissingSchedule, setEnrollmentsMissingSchedule] = useState<
    CourseEnrollment[]
  >([]);
  const [enrollmentsMissingProfessor, setEnrollmentsMissingProfessor] =
    useState<CourseEnrollment[]>([]);

  // Main view selectors: which academic year/period the calendar shows.
  // These are not part of "Limpiar filtros" — a year is always selected.
  const [yearFilter, setYearFilter] = useState<number>(DEFAULT_YEAR);
  // null = every period of the selected year
  const [periodFilter, setPeriodFilter] = useState<number | null>(null);

  // Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [careerFilter, setCareerFilter] = useState<number | null>(null);
  const [professorFilter, setProfessorFilter] = useState<number | null>(null);
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

  // Utility functions
  const formatTime = (hour: string | null): string => {
    if (!hour) return "Sin hora";
    try {
      const [hours, minutes] = hour.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    } catch {
      return hour;
    }
  };

  const getDayDisplay = (day: string): string => {
    const dayMap: Record<string, string> = {
      L: "Lunes",
      K: "Martes",
      M: "Miércoles",
      J: "Jueves",
      V: "Viernes",
      S: "Sábado",
      D: "Domingo",
    };
    return dayMap[day] || day;
  };

  const getEnrollmentColor = (enrollmentId: number): number => {
    if (!enrollmentColorsRef.current.has(enrollmentId)) {
      const colorIndex = enrollmentColorsRef.current.size % eventColors.length;
      enrollmentColorsRef.current.set(enrollmentId, colorIndex);
    }
    return enrollmentColorsRef.current.get(enrollmentId)!;
  };

  const sortEventsByHour = (
    events: CalendarScheduleEvent[],
  ): CalendarScheduleEvent[] => {
    return [...events].sort((a, b) => {
      if (!a.hour && !b.hour) return 0;
      if (!a.hour) return 1;
      if (!b.hour) return -1;
      return a.hour.localeCompare(b.hour);
    });
  };

  const fetchCareers = async () => {
    try {
      const response = await axiosPrivate.get<CareersResponse>(
        "courses/manage-careers",
      );
      setCareers(response.data.careers);
    } catch (err: any) {
      console.error("Error fetching careers:", err);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const response = await axiosPrivate.get<YearsResponse>(
        "courses/enrollment-years",
      );
      setAvailableYears(response.data.years);
    } catch (err: any) {
      console.error("Error fetching available years:", err);
    }
  };

  const fetchProfessors = async () => {
    try {
      const response = await axiosPrivate.get<ProfessorsResponse>(
        "courses/enrollment-professors",
      );
      setProfessors(response.data.professors);
    } catch (err: any) {
      console.error("Error fetching professors:", err);
    }
  };

  const fetchEnrollmentsMissingSchedule = async () => {
    try {
      const params: any = {
        status: "cursando",
        missing_schedule: true,
        page_size: 1000,
        year: yearFilter,
      };
      if (periodFilter) params.period = periodFilter;
      if (studentSearch) params.student_search = studentSearch;
      if (careerFilter) params.career_id = careerFilter;
      if (professorFilter) params.professor_id = professorFilter;

      const response = await axiosPrivate.get<EnrollmentsResponse>(
        "courses/manage-enrollments",
        { params },
      );
      setEnrollmentsMissingSchedule(response.data.results);
      // Update counts to keep filter buttons accurate
      setCounts(response.data.counts);
    } catch (err: any) {
      console.error("Error fetching enrollments missing schedule:", err);
    }
  };

  const fetchEnrollmentsMissingProfessor = async () => {
    try {
      const params: any = {
        status: "cursando",
        missing_professor: true,
        page_size: 1000,
        year: yearFilter,
      };
      if (periodFilter) params.period = periodFilter;
      if (studentSearch) params.student_search = studentSearch;
      if (careerFilter) params.career_id = careerFilter;
      if (professorFilter) params.professor_id = professorFilter;

      const response = await axiosPrivate.get<EnrollmentsResponse>(
        "courses/manage-enrollments",
        { params },
      );
      setEnrollmentsMissingProfessor(response.data.results);
      // Update counts to keep filter buttons accurate
      setCounts(response.data.counts);
    } catch (err: any) {
      console.error("Error fetching enrollments missing professor:", err);
    }
  };

  const fetchCalendarSchedules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {
        include_schedules: true,
        status: "cursando",
        page_size: 1000, // Get all matching enrollments
        year: yearFilter,
      };
      if (periodFilter) params.period = periodFilter;
      if (studentSearch) params.student_search = studentSearch;
      if (careerFilter) params.career_id = careerFilter;
      if (professorFilter) params.professor_id = professorFilter;
      // Don't filter calendar by missing_professor - always show all enrollments

      const response = await axiosPrivate.get<EnrollmentsResponse>(
        "courses/manage-enrollments",
        { params },
      );

      // Filter enrollments that have schedules and schedule_set=true
      const enrollmentsWithSchedules = response.data.results.filter(
        (enrollment) =>
          enrollment.schedule_set &&
          enrollment.schedules &&
          enrollment.schedules.length > 0,
      );

      // Map schedules to calendar events
      const calendarEvents: CalendarScheduleEvent[] = [];
      enrollmentsWithSchedules.forEach((enrollment) => {
        if (enrollment.schedules) {
          enrollment.schedules.forEach((schedule) => {
            calendarEvents.push({
              id: schedule.id,
              enrollment_id: enrollment.id,
              schedule_id: schedule.id,
              course_code: enrollment.course_code,
              course_name: enrollment.course_name,
              student_name: enrollment.student_full_name,
              professor_name: enrollment.professor_full_name,
              day: schedule.day,
              hour: schedule.hour,
            });
          });
        }
      });

      // Group events by day and assign colors
      const dayMap = new Map<string, CalendarScheduleEvent[]>();
      calendarEvents.forEach((event) => {
        if (!dayMap.has(event.day)) {
          dayMap.set(event.day, []);
        }
        dayMap.get(event.day)!.push(event);
      });

      // Convert to DayEvents array and sort events by hour
      const dayOrder = ["L", "K", "M", "J", "V", "S", "D"];
      const days: DayEvents[] = dayOrder.map((day) => ({
        day,
        dayDisplay: getDayDisplay(day),
        events: sortEventsByHour(dayMap.get(day) || []),
      }));

      setDayEvents(days);
      setCounts(response.data.counts);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar los horarios");
      console.error("Error fetching calendar schedules:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  };

  useEffect(() => {
    fetchCareers();
    fetchProfessors();
    fetchAvailableYears();
  }, [axiosPrivate]);

  useEffect(() => {
    // Always fetch calendar schedules (don't depend on missing filters)
    fetchCalendarSchedules();
  }, [
    axiosPrivate,
    yearFilter,
    periodFilter,
    studentSearch,
    careerFilter,
    professorFilter,
    // Don't include missingProfessorFilter or missingScheduleFilter here
    // so calendar doesn't update when toggling these filters
  ]);

  // Separate effect for fetching missing items when filters are toggled
  useEffect(() => {
    if (missingScheduleFilter) {
      fetchEnrollmentsMissingSchedule();
    } else {
      setEnrollmentsMissingSchedule([]);
    }
  }, [
    missingScheduleFilter,
    axiosPrivate,
    yearFilter,
    periodFilter,
    studentSearch,
    careerFilter,
    professorFilter,
  ]);

  useEffect(() => {
    if (missingProfessorFilter) {
      fetchEnrollmentsMissingProfessor();
    } else {
      setEnrollmentsMissingProfessor([]);
    }
  }, [
    missingProfessorFilter,
    axiosPrivate,
    yearFilter,
    periodFilter,
    studentSearch,
    careerFilter,
    professorFilter,
  ]);

  const handleSearch = () => {
    setStudentSearch(studentSearchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setStudentSearch("");
    setStudentSearchInput("");
    setCareerFilter(null);
    setProfessorFilter(null);
    setMissingProfessorFilter(false);
    setMissingScheduleFilter(false);
    setEnrollmentsMissingSchedule([]);
    setEnrollmentsMissingProfessor([]);
  };

  const hasActiveFilters =
    studentSearch !== "" ||
    careerFilter !== null ||
    professorFilter !== null ||
    missingProfessorFilter ||
    missingScheduleFilter;

  const handleEventClick = (enrollmentId: number) => {
    setSelectedEnrollmentId(enrollmentId);
    setIsEditDrawerOpen(true);
  };

  const handleScheduleClick = (e: React.MouseEvent, enrollmentId: number) => {
    e.stopPropagation();
    setSelectedEnrollmentForSchedule(enrollmentId);
    setIsScheduleDrawerOpen(true);
  };

  const handleCloseEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setSelectedEnrollmentId(null);
  };

  const handleCloseScheduleDrawer = () => {
    setIsScheduleDrawerOpen(false);
    setSelectedEnrollmentForSchedule(null);
  };

  const handleCreateEnrollment = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleCloseCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const handleEnrollmentCreated = () => {
    fetchCalendarSchedules();
  };

  const handleEnrollmentUpdated = () => {
    fetchCalendarSchedules();
    if (missingProfessorFilter) {
      fetchEnrollmentsMissingProfessor();
    }
    if (missingScheduleFilter) {
      fetchEnrollmentsMissingSchedule();
    }
  };

  const handleScheduleUpdated = () => {
    fetchCalendarSchedules();
    if (missingScheduleFilter) {
      fetchEnrollmentsMissingSchedule();
    }
    if (missingProfessorFilter) {
      fetchEnrollmentsMissingProfessor();
    }
  };

  const toggleMissingProfessorFilter = () => {
    setMissingProfessorFilter(!missingProfessorFilter);
    setMissingScheduleFilter(false);
    // useEffect will handle fetching
  };

  const toggleMissingScheduleFilter = () => {
    setMissingScheduleFilter(!missingScheduleFilter);
    setMissingProfessorFilter(false);
    // useEffect will handle fetching
  };

  // Always offer the selected year even if the years endpoint hasn't
  // answered (or has no enrollments for it yet), so the select never shows blank.
  const yearOptions = availableYears.includes(yearFilter)
    ? availableYears
    : [yearFilter, ...availableYears].sort((a, b) => b - a);

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
          <CalendarIcon className="lg:size-6 size-9 h-full text-gray-700" />
          <h1 className="text-sm text-gray-700">Calendario de Cursos</h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateEnrollment}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Registrar matrícula/curso
          </button>
        </div>
      </div>

      {/* Main selectors: year + period */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="sm:w-44">
          <label
            htmlFor="calendarYear"
            className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Año
          </label>
          <div className="mt-1 grid grid-cols-1">
            <select
              id="calendarYear"
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value, 10))}
              className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2.5 pr-10 pl-4 text-lg font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900"
            >
              {yearOptions.map((year) => (
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
              className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-500"
            >
              <path
                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
                fillRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1">
          <span
            id="calendarPeriodLabel"
            className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Período
          </span>
          <div
            role="group"
            aria-labelledby="calendarPeriodLabel"
            className="mt-1 flex w-full rounded-md shadow-xs isolate sm:inline-flex sm:w-auto"
          >
            {PERIOD_OPTIONS.map((option, index, all) => {
              const isActive = periodFilter === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setPeriodFilter(option.value)}
                  aria-pressed={isActive}
                  className={`relative -ml-px flex-1 px-4 py-2.5 text-base font-semibold ring-1 ring-inset focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-colors sm:flex-none sm:px-8 sm:text-lg ${
                    index === 0 ? "ml-0 rounded-l-md" : ""
                  } ${index === all.length - 1 ? "rounded-r-md" : ""} ${
                    isActive
                      ? "z-10 bg-primary text-white ring-primary hover:bg-primary/90"
                      : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 mt-4">
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

            {/* Career Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="careerFilter"
                className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
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

            {/* Professor Filter */}
            <div className="sm:w-48">
              <label
                htmlFor="professorFilter"
                className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                <UserIcon className="h-4 w-4" />
                Profesor/a
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="professorFilter"
                  value={professorFilter || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProfessorFilter(value ? parseInt(value) : null);
                  }}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                >
                  <option value="">Todos los profesores</option>
                  {professors.map((professor) => (
                    <option key={professor.id} value={professor.id}>
                      {professor.full_name}
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

      {/* Missing Professor Enrollments Section */}
      {missingProfessorFilter && enrollmentsMissingProfessor.length > 0 && (
        <div className="mb-4 mt-4 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">
              Estudiantes sin profesor asignado
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Haz clic en una matrícula para asignar su profesor
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollmentsMissingProfessor.map((enrollment) => (
              <button
                key={enrollment.id}
                onClick={() => {
                  setSelectedEnrollmentId(enrollment.id);
                  setIsEditDrawerOpen(true);
                }}
                className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow-sm sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
              >
                <dt className="truncate text-sm font-medium text-gray-500 flex items-center gap-2">
                  <HiOutlineAcademicCap className="h-5 w-5" />
                  {enrollment.course_code}
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 flex items-center gap-2">
                  <PiStudent className="h-5 w-5" />
                  {enrollment.student_full_name}
                </dd>
              </button>
            ))}
          </dl>
        </div>
      )}

      {/* Missing Schedule Enrollments Section */}
      {missingScheduleFilter && enrollmentsMissingSchedule.length > 0 && (
        <div className="mb-4 mt-4 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">
              Estudiantes sin horario asignado
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Haz clic en una matrícula para asignar su horario
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollmentsMissingSchedule.map((enrollment) => (
              <button
                key={enrollment.id}
                onClick={() => {
                  setSelectedEnrollmentForSchedule(enrollment.id);
                  setIsScheduleDrawerOpen(true);
                }}
                className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow-sm sm:p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
              >
                <dt className="truncate text-sm font-medium text-gray-500 flex items-center gap-2">
                  <HiOutlineAcademicCap className="h-5 w-5" />
                  {enrollment.course_code}
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 flex items-center gap-2">
                  <PiStudent className="h-5 w-5" />
                  {enrollment.student_full_name}
                </dd>
              </button>
            ))}
          </dl>
        </div>
      )}

      {/* Calendar */}
      <div className="mt-2 sm:mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle max-sm:block sm:px-6 lg:px-8">
            <div className="sm:border sm:border-gray-300 sm:rounded-lg overflow-hidden bg-white">
              <div className="flex flex-auto flex-col">
                <div className="flex flex-auto">
                  {/* Day columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-7 divide-gray-200 max-sm:divide-y sm:divide-x flex-1 w-full">
                    {dayEvents.map((dayData) => {
                      return (
                        <div key={dayData.day} className="flex flex-col">
                          {/* Day header — below sm it also carries the class count */}
                          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {dayData.dayDisplay}
                            </h3>
                            {dayData.events.length > 0 && (
                              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 sm:hidden">
                                {dayData.events.length}{" "}
                                {dayData.events.length === 1
                                  ? "clase"
                                  : "clases"}
                              </span>
                            )}
                          </div>

                          {/* Events for this day */}
                          <div className="flex-1 p-2 space-y-2 max-sm:px-4 max-sm:py-3">
                            {dayData.events.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4 sm:hidden">
                                Sin horarios
                              </p>
                            ) : (
                              dayData.events.map((event) => {
                                const eventColorIndex = getEnrollmentColor(
                                  event.enrollment_id,
                                );
                                const eventColors_ =
                                  eventColors[
                                    eventColorIndex % eventColors.length
                                  ];

                                return (
                                  <div
                                    key={`${event.enrollment_id}-${event.schedule_id}`}
                                    onClick={() =>
                                      handleEventClick(event.enrollment_id)
                                    }
                                    className={`relative rounded-lg ${eventColors_.bg} ${eventColors_.hover} p-3 shadow-sm border border-gray-200 cursor-pointer`}
                                  >
                                    {/* Edit button and warning icon in top right */}
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                      {!event.professor_name && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEventClick(
                                              event.enrollment_id,
                                            );
                                          }}
                                          className="p-1  rounded-md hover:bg-white/50 transition-colors"
                                          title="Asignar profesor"
                                        >
                                          <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleScheduleClick(
                                            e,
                                            event.enrollment_id,
                                          );
                                        }}
                                        className="p-1 rounded-md hover:bg-white/50 transition-colors"
                                        title="Editar horario"
                                      >
                                        <PencilIcon
                                          className={`h-4 w-4 ${eventColors_.text}`}
                                        />
                                      </button>
                                    </div>

                                    {/* Course code */}
                                    <p
                                      className={`font-semibold ${
                                        eventColors_.text
                                      } mb-2 ${
                                        !event.professor_name ? "pr-12" : "pr-6"
                                      }`}
                                    >
                                      {event.course_code}
                                    </p>

                                    {/* Time with clock icon */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <ClockIcon
                                        className={`h-4 w-4 ${eventColors_.textLight}`}
                                      />
                                      <span
                                        className={`text-xs ${eventColors_.textLight}`}
                                      >
                                        {formatTime(event.hour)}
                                      </span>
                                    </div>

                                    {/* Student with student icon */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <PiStudent
                                        className={`h-4 w-4 ${eventColors_.textLight}`}
                                      />
                                      <span
                                        className={`text-xs ${eventColors_.textLight} sm:truncate`}
                                      >
                                        {event.student_name}
                                      </span>
                                    </div>

                                    {/* Professor with professor icon */}
                                    <div className="flex items-center gap-2">
                                      <LiaChalkboardTeacherSolid
                                        className={`size-4 sm:size-5 
                                               ${eventColors_.textLight}
                                              
                                          `}
                                      />
                                      <span
                                        className={`text-xs ${eventColors_.textLight} sm:truncate`}
                                      >
                                        {event.professor_name ||
                                          "Falta asignar profesor"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Cargando horarios...</p>
          </div>
        </div>
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
        onEnrollmentDeleted={handleEnrollmentUpdated}
        onCountsUpdate={handleEnrollmentUpdated}
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

export default Calendar;
