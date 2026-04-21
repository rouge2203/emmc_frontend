import React, { useEffect, useState } from "react";
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
  InformationCircleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { IoMdBook } from "react-icons/io";
import { PiStudent } from "react-icons/pi";
import { useNavigate } from "react-router-dom";

interface Course {
  id: number;
  code: string;
  name: string;
  career_name: string | null;
  special_price: number | null;
  course_type_price: number | null;
  week_duration: number;
  is_matricula: boolean;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

interface CourseEnrollment {
  id: number;
  course: {
    id: number;
    code: string;
    name: string;
    career_name: string | null;
    is_matricula: boolean;
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
  retired_at: string | null;
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

interface CourseEnrollmentEditDrawerProps {
  enrollmentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentUpdated?: (updatedEnrollment: CourseEnrollment) => void;
  onEnrollmentDeleted?: () => void;
  onCountsUpdate?: () => void;
}

interface EnrollmentResponse {
  enrollment: CourseEnrollment;
}

interface EnrollmentsResponse {
  results: CourseEnrollment[];
  pagination: any;
}

interface UsersResponse {
  users: User[];
}

const CourseEnrollmentEditDrawer: React.FC<CourseEnrollmentEditDrawerProps> = ({
  enrollmentId,
  isOpen,
  onClose,
  onEnrollmentUpdated,
  onEnrollmentDeleted,
  onCountsUpdate,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRetireCourseDialog, setShowRetireCourseDialog] = useState(false);

  // Searchable selects state
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const [professors, setProfessors] = useState<User[]>([]);
  const [professorSearch, setProfessorSearch] = useState("");
  const [showProfessorDropdown, setShowProfessorDropdown] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<User | null>(null);
  const [professorDropdownActive, setProfessorDropdownActive] = useState(false);

  // Form state
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [period, setPeriod] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [weekDuration, setWeekDuration] = useState<number>(12);
  const [status, setStatus] = useState<string>("cursando");
  const [grade, setGrade] = useState<string>("");
  const [professorObservation, setProfessorObservation] = useState<string>("");

  // Fetch enrollment data
  useEffect(() => {
    if (isOpen && enrollmentId) {
      fetchEnrollmentData();
    }
  }, [isOpen, enrollmentId]);

  useEffect(() => {
    if (!isOpen) {
      setShowRetireCourseDialog(false);
    }
  }, [isOpen]);

  // Fetch professors only when the user activates the professor dropdown
  useEffect(() => {
    if (!professorDropdownActive) return;
    const fetchProfessors = async () => {
      try {
        const params: any = {
          role: "teacher",
        };
        if (professorSearch) {
          params.search = professorSearch;
        }
        const response = await axiosPrivate.get<UsersResponse>(
          "courses/list-users-for-enrollment",
          {
            params,
          },
        );
        setProfessors(response.data.users);
      } catch (err: any) {
        console.error("Error fetching professors:", err);
      }
    };
    const timeoutId = setTimeout(fetchProfessors, 300);
    return () => clearTimeout(timeoutId);
  }, [professorDropdownActive, professorSearch, axiosPrivate]);

  const fetchEnrollmentData = async () => {
    if (!enrollmentId) return;

    try {
      setIsLoading(true);
      setError(null);
      // Fetch the specific enrollment by ID
      const response = await axiosPrivate.get<EnrollmentsResponse>(
        "courses/manage-enrollments",
        {
          params: {
            enrollment_id: enrollmentId,
          },
        },
      );
      const foundEnrollment = response.data.results?.[0] ?? null;
      if (foundEnrollment) {
        setEnrollment(foundEnrollment);
        const course: Course = {
          id: foundEnrollment.course.id,
          code: foundEnrollment.course.code,
          name: foundEnrollment.course.name,
          career_name: foundEnrollment.course.career_name,
          special_price: null,
          course_type_price: null,
          week_duration: foundEnrollment.week_duration,
          is_matricula: foundEnrollment.course.is_matricula,
        };
        setSelectedCourse(course);
        setCourseSearch(`${course.code} - ${course.name}`);
        setSelectedStudent(foundEnrollment.student);
        setStudentSearch(foundEnrollment.student_full_name);
        if (foundEnrollment.professor) {
          setSelectedProfessor(foundEnrollment.professor);
          setProfessorSearch(foundEnrollment.professor_full_name || "");
        } else {
          setSelectedProfessor(null);
          setProfessorSearch("");
        }
        setYear(foundEnrollment.year);
        setPeriod(foundEnrollment.period);
        setPrice(foundEnrollment.price.toString());
        setWeekDuration(foundEnrollment.week_duration);
        setStatus(foundEnrollment.status);
        setGrade(foundEnrollment.grade?.toString() || "");
        setProfessorObservation(foundEnrollment.professor_observation || "");
      } else {
        setError("Matrícula no encontrada");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Error al cargar la información de la matrícula",
      );
      console.error("Error fetching enrollment data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdowns when clicking outside (only for professor since course and student are not editable)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".searchable-select-container")) {
        setShowProfessorDropdown(false);
      }
    };

    if (showProfessorDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showProfessorDropdown]);

  const handleSave = async () => {
    if (!enrollmentId || !selectedCourse || !selectedStudent) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: any = {
        enrollment_id: enrollmentId,
      };

      // Course and Student are not editable, so we don't update them
      if (selectedProfessor?.id !== enrollment?.professor?.id) {
        updateData.professor_id = selectedProfessor?.id || null;
      }
      if (year !== enrollment?.year) {
        updateData.year = year;
      }
      if (period !== enrollment?.period) {
        updateData.period = period;
      }
      if (price !== enrollment?.price.toString()) {
        updateData.price = parseInt(price);
      }
      if (weekDuration !== enrollment?.week_duration) {
        updateData.week_duration = weekDuration;
      }
      if (status !== enrollment?.status) {
        updateData.status = status;
      }
      if (grade !== (enrollment?.grade?.toString() || "")) {
        updateData.grade = grade ? parseInt(grade) : null;
      }
      if (professorObservation !== (enrollment?.professor_observation || "")) {
        updateData.professor_observation = professorObservation.trim() || null;
      }

      const response = await axiosPrivate.put<EnrollmentResponse>(
        "courses/manage-enrollments",
        updateData,
      );

      const updatedEnrollment = response.data.enrollment;
      if (updatedEnrollment) {
        setEnrollment(updatedEnrollment);
        const course: Course = {
          id: updatedEnrollment.course.id,
          code: updatedEnrollment.course.code,
          name: updatedEnrollment.course.name,
          career_name: updatedEnrollment.course.career_name,
          special_price: null,
          course_type_price: null,
          week_duration: updatedEnrollment.week_duration,
          is_matricula: updatedEnrollment.course.is_matricula,
        };
        setSelectedCourse(course);
        setCourseSearch(`${course.code} - ${course.name}`);
        setSelectedStudent(updatedEnrollment.student);
        setStudentSearch(updatedEnrollment.student_full_name);
        if (updatedEnrollment.professor) {
          setSelectedProfessor(updatedEnrollment.professor);
          setProfessorSearch(updatedEnrollment.professor_full_name || "");
        } else {
          setSelectedProfessor(null);
          setProfessorSearch("");
        }
        setYear(updatedEnrollment.year);
        setPeriod(updatedEnrollment.period);
        setPrice(updatedEnrollment.price.toString());
        setWeekDuration(updatedEnrollment.week_duration);
        setStatus(updatedEnrollment.status);
        setGrade(updatedEnrollment.grade?.toString() || "");
        setProfessorObservation(updatedEnrollment.professor_observation || "");

        // Notify parent component to update the list
        if (onEnrollmentUpdated) {
          onEnrollmentUpdated(updatedEnrollment);
        }

        // Update counts if professor was added or removed
        const professorChanged =
          (selectedProfessor?.id || null) !==
          (enrollment?.professor?.id || null);
        if (professorChanged && onCountsUpdate) {
          onCountsUpdate();
        }
      }

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error || "Error al guardar los cambios";
      setErrorNotificationMessage(errorMessage);
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
      console.error("Error saving enrollment data:", err);
      setShowConfirmDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!enrollmentId) return;

    setIsDeleting(true);
    try {
      await axiosPrivate.delete("courses/manage-enrollments", {
        data: { enrollment_id: enrollmentId },
      });
      setShowDeleteDialog(false);
      onClose();
      if (onEnrollmentDeleted) {
        onEnrollmentDeleted();
      }

      // Always update counts when enrollment is deleted
      if (onCountsUpdate) {
        onCountsUpdate();
      }
    } catch (err: any) {
      console.error("Error deleting enrollment:", err);
      setError(err?.response?.data?.error || "Error al eliminar la matrícula");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const handleAssignSchedule = () => {
    // Placeholder - no action for now
    console.log("Asignar horario clicked");
  };

  // Course and Student are not editable, so handlers are not needed

  // Handle professor select
  const handleProfessorSelect = (professor: User) => {
    setSelectedProfessor(professor);
    setProfessorSearch(
      `${professor.last_name || ""} ${professor.first_name}`.trim(),
    );
    setShowProfessorDropdown(false);
    setProfessorDropdownActive(false);
  };

  // Handle professor input blur - clear if no professor selected
  const handleProfessorBlur = () => {
    // Use setTimeout to allow click events on dropdown to fire first
    setTimeout(() => {
      if (!selectedProfessor) {
        setProfessorSearch("");
      }
      setShowProfessorDropdown(false);
    }, 200);
  };

  // Handle change professor button click
  const handleChangeProfessor = () => {
    setSelectedProfessor(null);
    setProfessorSearch("");
    setProfessorDropdownActive(true);
    setShowProfessorDropdown(true);
  };

  // Handle create new professor navigation
  const handleCreateNewProfessor = () => {
    navigate("/admin/profesores", { state: { openCreateDrawer: true } });
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-gray-900 px-4 py-20 sm:px-6">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-white">
                          Información de la Matrícula
                        </DialogTitle>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            onClick={onClose}
                            className="relative rounded-md text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-300">
                          Edita la información de la matrícula.
                        </p>
                      </div>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="mt-4 text-sm text-gray-600">
                            Cargando información...
                          </p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      </div>
                    ) : enrollment ? (
                      <div className="divide-y divide-gray-200 px-4 sm:px-6 py-6">
                        <div className="space-y-3.5">
                          {selectedCourse?.is_matricula ? (
                            <div className="rounded-md bg-primary/10 border border-primary/30 px-2 py-4 mb-4">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <InformationCircleIcon
                                    className="h-5 w-5 text-primary"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3 flex-1">
                                  <h3 className="text-sm font-medium text-primary">
                                    Esto es una matrícula, no un curso en
                                    específico
                                  </h3>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Professor Alert */}
                              {!enrollment.professor && (
                                <div className="rounded-md bg-red-50 border border-red-200 px-2 py-4 mb-4">
                                  <div className="flex">
                                    <div className="flex-shrink-0">
                                      <ExclamationTriangleIcon
                                        className="h-5 w-5 text-red-400"
                                        aria-hidden="true"
                                      />
                                    </div>
                                    <div className="ml-3 flex-1">
                                      <h3 className="text-sm font-medium text-red-800">
                                        Falta asignar profesor
                                      </h3>
                                      <div className="mt-2 text-xs text-red-700">
                                        <p>
                                          Esta matrícula aún no tiene un
                                          profesor asignado.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Schedule Alert */}
                              {!enrollment.schedule_set && (
                                <div className="rounded-md bg-yellow-50 border border-yellow-200 px-2 py-4 mb-4">
                                  <div className="flex">
                                    <div className="flex-shrink-0">
                                      <ExclamationTriangleIcon
                                        className="h-5 w-5 text-yellow-400"
                                        aria-hidden="true"
                                      />
                                    </div>
                                    <div className="ml-3 flex-1">
                                      <h3 className="text-sm font-medium text-yellow-800">
                                        Falta asignar horario
                                      </h3>
                                      <div className="mt-2 text-xs text-yellow-700">
                                        <p>
                                          Esta matrícula aún no tiene un horario
                                          asignado.
                                        </p>
                                      </div>
                                      <div className="mt-4">
                                        <button
                                          type="button"
                                          onClick={handleAssignSchedule}
                                          className="rounded-md bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-800 hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                                        >
                                          Asignar horario
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Course */}
                          <div>
                            <label
                              htmlFor="course"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Curso <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2 relative">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <IoMdBook
                                    className="h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <input
                                  id="course"
                                  name="course"
                                  type="text"
                                  value={courseSearch}
                                  readOnly
                                  disabled
                                  className="block w-full rounded-md pl-10 pr-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 bg-gray-50 cursor-not-allowed sm:text-sm/6"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Student */}
                          <div>
                            <label
                              htmlFor="student"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Estudiante <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2 relative">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <PiStudent
                                    className="h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <input
                                  id="student"
                                  name="student"
                                  type="text"
                                  value={studentSearch}
                                  readOnly
                                  disabled
                                  className="block w-full rounded-md pl-10 pr-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 bg-gray-50 cursor-not-allowed sm:text-sm/6"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Professor */}
                          {!selectedCourse?.is_matricula && (
                            <div>
                              <label
                                htmlFor="professor"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Profesor
                              </label>
                              <div className="mt-2 relative searchable-select-container">
                                {selectedProfessor ? (
                                  <div className="flex gap-2">
                                    <div className="relative flex-1">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon
                                          className="h-5 w-5 text-gray-400"
                                          aria-hidden="true"
                                        />
                                      </div>
                                      <input
                                        id="professor"
                                        name="professor"
                                        type="text"
                                        value={professorSearch}
                                        readOnly
                                        disabled
                                        className="block rounded-md w-full pl-10 pr-3 py-1.5 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 bg-gray-50 cursor-not-allowed sm:text-sm/6"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleChangeProfessor}
                                      className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                    >
                                      <ArrowPathIcon className="size-5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon
                                          className="h-5 w-5 text-gray-400"
                                          aria-hidden="true"
                                        />
                                      </div>
                                      <input
                                        id="professor"
                                        name="professor"
                                        type="text"
                                        value={professorSearch}
                                        onChange={(e) => {
                                          setProfessorSearch(e.target.value);
                                          setShowProfessorDropdown(true);
                                        }}
                                        onFocus={() =>
                                          setShowProfessorDropdown(true)
                                        }
                                        onBlur={handleProfessorBlur}
                                        className="block rounded-md w-full pl-10 pr-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                        placeholder="Buscar profesor..."
                                      />
                                    </div>
                                    {showProfessorDropdown && (
                                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                        {professors.length > 0 ? (
                                          professors.map((professor) => (
                                            <div
                                              key={professor.id}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleProfessorSelect(
                                                  professor,
                                                );
                                              }}
                                              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                            >
                                              <div className="flex items-center">
                                                <span className="font-medium text-gray-900">
                                                  {professor.last_name || ""}{" "}
                                                  {professor.first_name}
                                                </span>
                                              </div>
                                            </div>
                                          ))
                                        ) : professorSearch.trim() ? (
                                          <div
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleCreateNewProfessor();
                                            }}
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                          >
                                            <div className="flex items-center">
                                              <span className="font-medium text-primary">
                                                + Registrar nuevo profesor
                                              </span>
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Year */}
                          <div>
                            <label
                              htmlFor="year"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Año <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                              <input
                                id="year"
                                name="year"
                                type="number"
                                min="2000"
                                max="2100"
                                value={year}
                                onChange={(e) =>
                                  setYear(
                                    parseInt(e.target.value) ||
                                      new Date().getFullYear(),
                                  )
                                }
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Period */}
                          <div>
                            <label
                              htmlFor="period"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Período <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2 grid grid-cols-1">
                              <select
                                id="period"
                                name="period"
                                value={period}
                                onChange={(e) =>
                                  setPeriod(parseInt(e.target.value))
                                }
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              >
                                <option value={1}>I</option>
                                <option value={2}>II</option>
                                <option value={3}>III</option>
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

                          {/* Price */}
                          <div>
                            <label
                              htmlFor="price"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Precio (₡) <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                              <input
                                id="price"
                                name="price"
                                type="number"
                                min="0"
                                value={price}
                                onChange={(e) => {
                                  setPrice(e.target.value);
                                }}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Week Duration */}
                          <div>
                            <label
                              htmlFor="week_duration"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Duración (semanas){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                              <input
                                id="week_duration"
                                name="week_duration"
                                type="number"
                                min="1"
                                value={weekDuration}
                                disabled={selectedCourse?.is_matricula}
                                onChange={(e) =>
                                  setWeekDuration(
                                    parseInt(e.target.value) || 12,
                                  )
                                }
                                className={`block w-full rounded-md px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6 ${selectedCourse?.is_matricula ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                              />
                            </div>
                          </div>

                          {/* Status */}
                          <div>
                            <label
                              htmlFor="status"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Estado <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2 grid grid-cols-1">
                              <select
                                id="status"
                                name="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              >
                                {status === "retirado" ? (
                                  <>
                                    <option value="cursando">Cursando</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="reprobado">Reprobado</option>
                                    <option value="retirado">Retirado</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="cursando">Cursando</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="reprobado">Reprobado</option>
                                  </>
                                )}
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
                            {status !== "retirado" && (
                              <button
                                type="button"
                                onClick={() => setShowRetireCourseDialog(true)}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
                              >
                                <ArrowRightOnRectangleIcon
                                  className="size-5 text-gray-500"
                                  aria-hidden
                                />
                                Retirar curso
                              </button>
                            )}
                          </div>

                          {/* Retired At Info */}
                          {status === "retirado" && (
                            <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                              {enrollment?.retired_at ? (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium text-gray-900">
                                    Fecha de retiro:
                                  </span>{" "}
                                  {new Date(enrollment.retired_at).toLocaleDateString(
                                    "es-CR",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium text-gray-900">
                                    Fecha de retiro:
                                  </span>{" "}
                                  Se registrará al guardar los cambios.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Grade */}
                          {!selectedCourse?.is_matricula && (
                            <div>
                              <label
                                htmlFor="grade"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Calificación
                              </label>
                              <div className="mt-2">
                                <input
                                  id="grade"
                                  name="grade"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={grade}
                                  onChange={(e) => setGrade(e.target.value)}
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  placeholder="0-100"
                                />
                              </div>
                            </div>
                          )}

                          {/* Professor Observation */}
                          {!selectedCourse?.is_matricula && (
                            <div>
                              <label
                                htmlFor="professor_observation"
                                className="block text-sm/6 font-medium text-gray-900"
                              >
                                Observación del profesor
                              </label>
                              <div className="mt-2">
                                <textarea
                                  id="professor_observation"
                                  name="professor_observation"
                                  rows={3}
                                  value={professorObservation}
                                  onChange={(e) =>
                                    setProfessorObservation(e.target.value)
                                  }
                                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  placeholder="Observaciones del profesor..."
                                />
                              </div>
                            </div>
                          )}

                          {/* Account Information */}
                          <div className="space-y-4 pt-4 border-t border-gray-200">
                            <h3 className="text-sm/6 font-medium text-gray-900">
                              Información adicional
                            </h3>

                            {/* Created At */}
                            <div className="flex items-start">
                              <div className="shrink-0">
                                <CalendarDaysIcon
                                  className="size-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Fecha de creación
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {enrollment.created_at
                                    ? new Date(
                                        enrollment.created_at,
                                      ).toLocaleString("es-CR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Updated At */}
                            <div className="flex items-start">
                              <div className="shrink-0">
                                <ClockIcon
                                  className="size-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Última actualización
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {enrollment.updated_at
                                    ? new Date(
                                        enrollment.updated_at,
                                      ).toLocaleString("es-CR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Created By */}
                            {enrollment.created_by && (
                              <div className="flex items-start">
                                <div className="shrink-0">
                                  <ClockIcon
                                    className="size-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Creado por
                                  </p>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {`${enrollment.created_by.first_name} ${enrollment.created_by.last_name}`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Updated By */}
                            {enrollment.updated_by && (
                              <div className="flex items-start">
                                <div className="shrink-0">
                                  <ClockIcon
                                    className="size-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Actualizado por
                                  </p>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {`${enrollment.updated_by.first_name} ${enrollment.updated_by.last_name}`}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 justify-between border-t border-gray-200 bg-white px-4 py-4">
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      disabled={isSaving || isDeleting}
                      className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-xs ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Eliminar
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        disabled={isSaving || isDeleting}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={isSaving || isDeleting}
                        className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? "Cargando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleConfirmCancel}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 text-gray-900"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar cambios
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas guardar los cambios en la
                      matrícula? Esta acción actualizará los datos.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isSaving ? "Cargando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isSaving}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:ml-3 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Success Notification - Rendered via Portal outside Dialog */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showSuccessNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-6 text-primary"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          ¡Guardado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los cambios en la matrícula se han actualizado
                          correctamente.
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSuccessNotification(false);
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
          document.body,
        )}

      {/* Retirar curso confirmation */}
      <Dialog
        open={showRetireCourseDialog}
        onClose={() => setShowRetireCourseDialog(false)}
        className="relative z-[100]"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />
        <div className="fixed inset-0 z-[100] w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-6 text-red-600"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar retiro del curso
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Cuando pulse <span className="font-medium text-gray-900">Guardar</span> en
                      este formulario, se enviará un correo al estudiante (y al encargado si
                      aplica) notificando el retiro del curso, y se cancelarán los pagos
                      pendientes de esta matrícula. Los pagos ya realizados no se verán
                      afectados.
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      ¿Desea marcar esta matrícula como retirada?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("retirado");
                    setShowRetireCourseDialog(false);
                  }}
                  className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-gray-800 sm:ml-3 sm:w-auto"
                >
                  Sí, continuar
                </button>
                <button
                  type="button"
                  onClick={() => setShowRetireCourseDialog(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={handleDeleteCancel}
        className="relative z-[100]"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />
        <div className="fixed inset-0 z-[100] w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-6 text-red-900"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar eliminación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas eliminar la matrícula de{" "}
                      {enrollment?.student_full_name} en el curso{" "}
                      {enrollment?.course_code} - {enrollment?.course_name}?
                      Esta acción es irreversible y no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="inline-flex w-full justify-center rounded-md bg-red-900 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-900/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Error Notification - Rendered via Portal outside Dialog */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[9999]"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              <Transition show={showErrorNotification}>
                <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 ring-1 ring-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
                  <div className="p-4">
                    <div className="flex items-start">
                      <div className="shrink-0">
                        <XCircleIcon
                          aria-hidden="true"
                          className="size-6 text-red-600"
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          Error al guardar
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {errorNotificationMessage}
                        </p>
                      </div>
                      <div className="ml-4 flex shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowErrorNotification(false);
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
          document.body,
        )}
    </>
  );
};

export default CourseEnrollmentEditDrawer;
