import React, { useState, useEffect, useRef } from "react";
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
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import {
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import * as Yup from "yup";

interface Course {
  id: number;
  code: string;
  name: string;
  career_name: string | null;
  special_price: number | null;
  course_type_price: number | null;
  week_duration: number;
  prerequisite_code: string | null;
  prerequisite_name: string | null;
}

interface PrerequisiteStatus {
  hasPrerequisite: boolean;
  prerequisiteCode: string | null;
  prerequisiteName: string | null;
  studentHasPassed: boolean | null;
  isChecking: boolean;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

interface CourseEnrollmentCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentCreated?: () => void;
}

interface CoursesResponse {
  courses: Course[];
}

interface UsersResponse {
  users: User[];
}

interface EnrollmentResponse {
  enrollment: any;
}

const validationSchema = Yup.object({
  course_id: Yup.number()
    .required("El curso es obligatorio")
    .positive("Debe seleccionar un curso válido"),
  student_id: Yup.number()
    .required("El estudiante es obligatorio")
    .positive("Debe seleccionar un estudiante válido"),
  professor_id: Yup.number()
    .nullable()
    .positive("Debe seleccionar un profesor válido"),
  year: Yup.number()
    .required("El año es obligatorio")
    .min(2000, "El año debe ser válido")
    .max(2100, "El año debe ser válido"),
  period: Yup.number()
    .required("El período es obligatorio")
    .oneOf([1, 2, 3], "El período debe ser I, II o III"),
  price: Yup.number()
    .required("El precio es obligatorio")
    .min(0, "El precio debe ser mayor o igual a 0"),
  week_duration: Yup.number()
    .required("La duración en semanas es obligatoria")
    .min(1, "La duración debe ser al menos 1 semana"),
});

const CourseEnrollmentCreateDrawer: React.FC<
  CourseEnrollmentCreateDrawerProps
> = ({ isOpen, onClose, onEnrollmentCreated }) => {
  const axiosPrivate = useAxiosPrivate();
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Searchable selects state
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [students, setStudents] = useState<User[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const [professors, setProfessors] = useState<User[]>([]);
  const [professorSearch, setProfessorSearch] = useState("");
  const [showProfessorDropdown, setShowProfessorDropdown] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<User | null>(null);

  // Form state
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [period, setPeriod] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const priceManuallyEdited = useRef(false);
  const [weekDuration, setWeekDuration] = useState<number>(12);

  // Prerequisite status state
  const [prerequisiteStatus, setPrerequisiteStatus] =
    useState<PrerequisiteStatus>({
      hasPrerequisite: false,
      prerequisiteCode: null,
      prerequisiteName: null,
      studentHasPassed: null,
      isChecking: false,
    });

  // Fetch courses
  useEffect(() => {
    if (isOpen) {
      const fetchCourses = async () => {
        try {
          const response = await axiosPrivate.get<CoursesResponse>(
            "courses/list-courses-for-enrollment",
          );
          setCourses(response.data.courses);
        } catch (err: any) {
          console.error("Error fetching courses:", err);
        }
      };
      fetchCourses();
    }
  }, [isOpen, axiosPrivate]);

  // Fetch students
  useEffect(() => {
    if (isOpen && studentSearch) {
      const fetchStudents = async () => {
        try {
          const response = await axiosPrivate.get<UsersResponse>(
            "courses/list-users-for-enrollment",
            {
              params: {
                role: "student",
                search: studentSearch,
              },
            },
          );
          setStudents(response.data.users);
        } catch (err: any) {
          console.error("Error fetching students:", err);
        }
      };
      const timeoutId = setTimeout(fetchStudents, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setStudents([]);
    }
  }, [isOpen, studentSearch, axiosPrivate]);

  // Fetch professors
  useEffect(() => {
    if (isOpen && professorSearch) {
      const fetchProfessors = async () => {
        try {
          const response = await axiosPrivate.get<UsersResponse>(
            "courses/list-users-for-enrollment",
            {
              params: {
                role: "teacher",
                search: professorSearch,
              },
            },
          );
          setProfessors(response.data.users);
        } catch (err: any) {
          console.error("Error fetching professors:", err);
        }
      };
      const timeoutId = setTimeout(fetchProfessors, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setProfessors([]);
    }
  }, [isOpen, professorSearch, axiosPrivate]);

  // Update price and week_duration when course changes
  useEffect(() => {
    if (selectedCourse && !priceManuallyEdited.current) {
      const coursePrice =
        selectedCourse.special_price || selectedCourse.course_type_price || 0;
      setPrice(coursePrice.toString());
      setWeekDuration(selectedCourse.week_duration);
    }
  }, [selectedCourse]);

  // Update prerequisite status when course changes
  useEffect(() => {
    if (selectedCourse?.prerequisite_code) {
      setPrerequisiteStatus((prev) => ({
        ...prev,
        hasPrerequisite: true,
        prerequisiteCode: selectedCourse.prerequisite_code,
        prerequisiteName: selectedCourse.prerequisite_name,
        studentHasPassed: null, // Reset when course changes
      }));
    } else {
      setPrerequisiteStatus({
        hasPrerequisite: false,
        prerequisiteCode: null,
        prerequisiteName: null,
        studentHasPassed: null,
        isChecking: false,
      });
    }
  }, [selectedCourse]);

  // Check prerequisite status when both course and student are selected
  useEffect(() => {
    const checkPrerequisite = async () => {
      if (selectedCourse?.prerequisite_code && selectedStudent?.id) {
        setPrerequisiteStatus((prev) => ({ ...prev, isChecking: true }));
        try {
          const response = await axiosPrivate.get(
            "courses/check-prerequisite-status",
            {
              params: {
                student_id: selectedStudent.id,
                prerequisite_code: selectedCourse.prerequisite_code,
              },
            },
          );
          setPrerequisiteStatus((prev) => ({
            ...prev,
            studentHasPassed: response.data.has_passed,
            isChecking: false,
          }));
        } catch (err: any) {
          console.error("Error checking prerequisite status:", err);
          setPrerequisiteStatus((prev) => ({
            ...prev,
            studentHasPassed: null,
            isChecking: false,
          }));
        }
      } else if (!selectedCourse?.prerequisite_code) {
        setPrerequisiteStatus((prev) => ({
          ...prev,
          studentHasPassed: null,
          isChecking: false,
        }));
      }
    };

    checkPrerequisite();
  }, [selectedCourse, selectedStudent, axiosPrivate]);

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCourse(null);
      setCourseSearch("");
      setSelectedStudent(null);
      setStudentSearch("");
      setSelectedProfessor(null);
      setProfessorSearch("");
      setYear(new Date().getFullYear());
      setPeriod(1);
      setPrice("");
      setWeekDuration(12);
      setErrors({});
      setShowCourseDropdown(false);
      setShowStudentDropdown(false);
      setShowProfessorDropdown(false);
      priceManuallyEdited.current = false;
      setPrerequisiteStatus({
        hasPrerequisite: false,
        prerequisiteCode: null,
        prerequisiteName: null,
        studentHasPassed: null,
        isChecking: false,
      });
    }
  }, [isOpen]);

  // Filter courses based on search
  const filteredCourses = courses.filter(
    (course) =>
      course.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      course.name.toLowerCase().includes(courseSearch.toLowerCase()),
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".searchable-select-container")) {
        setShowCourseDropdown(false);
        setShowStudentDropdown(false);
        setShowProfessorDropdown(false);
      }
    };

    if (showCourseDropdown || showStudentDropdown || showProfessorDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showCourseDropdown, showStudentDropdown, showProfessorDropdown]);

  // Validate form
  const validateForm = async () => {
    try {
      await validationSchema.validate(
        {
          course_id: selectedCourse?.id,
          student_id: selectedStudent?.id,
          professor_id: selectedProfessor?.id || null,
          year: year,
          period: period,
          price: price ? parseFloat(price) : null,
          week_duration: weekDuration,
        },
        { abortEarly: false },
      );
      setErrors({});
      return true;
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        validationError.inner.forEach((error) => {
          if (error.path) {
            newErrors[error.path] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Handle course select
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setCourseSearch(`${course.code} - ${course.name}`);
    setShowCourseDropdown(false);
    priceManuallyEdited.current = false;
  };

  // Handle student select
  const handleStudentSelect = (student: User) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.last_name || ""} ${student.first_name}`.trim());
    setShowStudentDropdown(false);
  };

  // Handle professor select
  const handleProfessorSelect = (professor: User) => {
    setSelectedProfessor(professor);
    setProfessorSearch(
      `${professor.last_name || ""} ${professor.first_name}`.trim(),
    );
    setShowProfessorDropdown(false);
  };

  // Handle create click
  const handleCreateClick = async () => {
    const isValid = await validateForm();
    if (isValid) {
      setShowConfirmDialog(true);
    }
  };

  // Handle actual creation
  const handleCreate = async () => {
    if (!selectedCourse || !selectedStudent) return;

    setIsCreating(true);
    try {
      const createData: any = {
        course_id: selectedCourse.id,
        student_id: selectedStudent.id,
        year: year,
        period: period,
        price: parseInt(price),
        week_duration: weekDuration,
      };

      if (selectedProfessor) {
        createData.professor_id = selectedProfessor.id;
      }

      await axiosPrivate.post<EnrollmentResponse>(
        "courses/manage-enrollments",
        createData,
      );

      // Close confirmation dialog
      setShowConfirmDialog(false);

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);

      // Notify parent component
      if (onEnrollmentCreated) {
        onEnrollmentCreated();
      }

      // Reset form
      setSelectedCourse(null);
      setCourseSearch("");
      setSelectedStudent(null);
      setStudentSearch("");
      setSelectedProfessor(null);
      setProfessorSearch("");
      setYear(new Date().getFullYear());
      setPeriod(1);
      setPrice("");
      setWeekDuration(12);
      setErrors({});
      priceManuallyEdited.current = false;

      // Close drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Error creating enrollment:", err);
      setShowConfirmDialog(false);

      // Set error message for notification
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Error al crear la matrícula. Por favor, intenta de nuevo.";

      setErrorNotificationMessage(errorMessage);
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  // Check if required fields are filled and valid
  const isSubmitDisabled =
    !selectedCourse || !selectedStudent || !price || isCreating;

  const defaultPrice = selectedCourse
    ? selectedCourse.special_price || selectedCourse.course_type_price || 0
    : 0;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} className="relative z-10">
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10 lg:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <form className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            Registrar Matrícula
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Completa la información para registrar una nueva
                            matrícula.
                          </p>
                        </div>
                        <div className="flex h-7 items-center">
                          <button
                            type="button"
                            onClick={onClose}
                            className="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Cerrar panel</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error message */}
                    {errors.submit && (
                      <div className="mx-4 mt-4 sm:mx-6">
                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                          <p className="text-sm text-red-800">
                            {errors.submit}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Form fields */}
                    <div className="space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0">
                      {/* Course */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="course"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Curso <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2 relative searchable-select-container">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MagnifyingGlassIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </div>
                            <input
                              id="course"
                              name="course"
                              type="text"
                              value={courseSearch}
                              onChange={(e) => {
                                setCourseSearch(e.target.value);
                                setShowCourseDropdown(true);
                                if (selectedCourse) {
                                  setSelectedCourse(null);
                                  setPrice("");
                                  setWeekDuration(12);
                                }
                              }}
                              onFocus={() => setShowCourseDropdown(true)}
                              className={`block w-full pl-10 rounded-md pr-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.course_id
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                              placeholder="Buscar curso..."
                            />
                          </div>
                          {showCourseDropdown && filteredCourses.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                              {filteredCourses.map((course) => (
                                <div
                                  key={course.id}
                                  onClick={() => handleCourseSelect(course)}
                                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-900">
                                      {course.code} - {course.name}
                                    </span>
                                    {course.career_name && (
                                      <span className="text-xs text-gray-500">
                                        {course.career_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {errors.course_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.course_id}
                            </p>
                          )}
                          {/* Prerequisite info alert */}
                          {selectedCourse?.prerequisite_code && (
                            <div className="mt-2 rounded-md bg-blue-50 p-3">
                              <div className="flex">
                                <div className="shrink-0">
                                  <InformationCircleIcon
                                    aria-hidden="true"
                                    className="size-5 text-blue-400"
                                  />
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm text-blue-700">
                                    <span className="font-medium">
                                      Prerrequisito:
                                    </span>{" "}
                                    {selectedCourse.prerequisite_code}
                                    {selectedCourse.prerequisite_name &&
                                      ` - ${selectedCourse.prerequisite_name}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Student */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="student"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Estudiante <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2 relative searchable-select-container">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MagnifyingGlassIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </div>
                            <input
                              id="student"
                              name="student"
                              type="text"
                              value={studentSearch}
                              onChange={(e) => {
                                setStudentSearch(e.target.value);
                                setShowStudentDropdown(true);
                                if (selectedStudent) {
                                  setSelectedStudent(null);
                                }
                              }}
                              onFocus={() => setShowStudentDropdown(true)}
                              className={`block w-full rounded-md pl-10 pr-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.student_id
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                              placeholder="Buscar estudiante..."
                            />
                          </div>
                          {showStudentDropdown && students.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                              {students.map((student) => (
                                <div
                                  key={student.id}
                                  onClick={() => handleStudentSelect(student)}
                                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                >
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">
                                      {student.last_name || ""}{" "}
                                      {student.first_name}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {errors.student_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.student_id}
                            </p>
                          )}
                          {/* Prerequisite status display */}
                          {prerequisiteStatus.hasPrerequisite &&
                            selectedStudent && (
                              <>
                                {prerequisiteStatus.isChecking ? (
                                  <div className="mt-2 flex items-center text-sm text-gray-500">
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    Verificando prerrequisito...
                                  </div>
                                ) : prerequisiteStatus.studentHasPassed ===
                                  true ? (
                                  <div className="mt-2 rounded-md bg-green-50 p-3">
                                    <div className="flex">
                                      <div className="shrink-0">
                                        <CheckCircleIcon
                                          aria-hidden="true"
                                          className="size-5 text-green-400"
                                        />
                                      </div>
                                      <div className="ml-3">
                                        <p className="text-sm text-green-700">
                                          El estudiante ha aprobado el
                                          prerrequisito{" "}
                                          <span className="font-medium">
                                            {
                                              prerequisiteStatus.prerequisiteCode
                                            }
                                            {prerequisiteStatus.prerequisiteName &&
                                              ` - ${prerequisiteStatus.prerequisiteName}`}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : prerequisiteStatus.studentHasPassed ===
                                  false ? (
                                  <div className="mt-2 rounded-md bg-amber-50 p-3">
                                    <div className="flex">
                                      <div className="shrink-0">
                                        <ExclamationTriangleIcon
                                          aria-hidden="true"
                                          className="size-5 text-amber-400"
                                        />
                                      </div>
                                      <div className="ml-3">
                                        <p className="text-sm text-amber-700">
                                          El estudiante{" "}
                                          <span className="font-medium">
                                            NO
                                          </span>{" "}
                                          ha aprobado el prerrequisito{" "}
                                          <span className="font-medium">
                                            {
                                              prerequisiteStatus.prerequisiteCode
                                            }
                                            {prerequisiteStatus.prerequisiteName &&
                                              ` - ${prerequisiteStatus.prerequisiteName}`}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            )}
                        </div>
                      </div>

                      {/* Professor */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="professor"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Profesor
                          </label>
                        </div>
                        <div className="sm:col-span-2 relative searchable-select-container">
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
                                if (selectedProfessor) {
                                  setSelectedProfessor(null);
                                }
                              }}
                              onFocus={() => setShowProfessorDropdown(true)}
                              className={`block w-full rounded-md pl-10 pr-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.professor_id
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
                              placeholder="Buscar profesor..."
                            />
                          </div>
                          {showProfessorDropdown && professors.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                              {professors.map((professor) => (
                                <div
                                  key={professor.id}
                                  onClick={() =>
                                    handleProfessorSelect(professor)
                                  }
                                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                >
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">
                                      {professor.last_name || ""}{" "}
                                      {professor.first_name}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {errors.professor_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.professor_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Year */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="year"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Año <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
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
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.year
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.year && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.year}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Period */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="period"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Período <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mt-2 grid grid-cols-1">
                            <select
                              id="period"
                              name="period"
                              value={period}
                              onChange={(e) =>
                                setPeriod(parseInt(e.target.value))
                              }
                              className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.period
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
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
                          {errors.period && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.period}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="price"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Precio (₡) <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="price"
                            name="price"
                            type="number"
                            min="0"
                            value={price}
                            onChange={(e) => {
                              setPrice(e.target.value);
                              priceManuallyEdited.current = true;
                            }}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.price
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                            placeholder={`Precio por defecto: ₡${defaultPrice.toLocaleString()}`}
                          />
                          {errors.price && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.price}
                            </p>
                          )}
                          <span className="text-xs text-gray-500">
                            Precio por defecto: ₡{defaultPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Week Duration */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="week_duration"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Duración (semanas){" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="week_duration"
                            name="week_duration"
                            type="number"
                            min="1"
                            value={weekDuration}
                            onChange={(e) =>
                              setWeekDuration(parseInt(e.target.value) || 12)
                            }
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.week_duration
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                          />
                          {errors.week_duration && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.week_duration}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateClick}
                        disabled={isSubmitDisabled}
                        className="inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreating ? "Creando..." : "Crear"}
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
        onClose={handleCancel}
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
                <div
                  className={`mx-auto flex size-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-10 ${
                    prerequisiteStatus.hasPrerequisite &&
                    prerequisiteStatus.studentHasPassed === false
                      ? "bg-amber-100"
                      : "bg-gray-100"
                  }`}
                >
                  {prerequisiteStatus.hasPrerequisite &&
                  prerequisiteStatus.studentHasPassed === false ? (
                    <ExclamationTriangleIcon
                      aria-hidden="true"
                      className="size-6 text-amber-600"
                    />
                  ) : (
                    <InformationCircleIcon
                      aria-hidden="true"
                      className="size-6 text-gray-900"
                    />
                  )}
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    Confirmar creación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Está seguro de que desea registrar la matrícula para{" "}
                      {selectedStudent
                        ? `${selectedStudent.last_name || ""} ${
                            selectedStudent.first_name
                          }`.trim()
                        : ""}{" "}
                      en el curso{" "}
                      {selectedCourse
                        ? `${selectedCourse.code} - ${selectedCourse.name}`
                        : ""}
                      ?
                    </p>
                    {/* Warning for unmet prerequisite */}
                    {prerequisiteStatus.hasPrerequisite &&
                      prerequisiteStatus.studentHasPassed === false && (
                        <div className="mt-3 rounded-md bg-amber-50 p-3">
                          <div className="flex">
                            <div className="shrink-0">
                              <ExclamationTriangleIcon
                                aria-hidden="true"
                                className="size-5 text-amber-400"
                              />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-amber-700">
                                <span className="font-medium">
                                  Advertencia:
                                </span>{" "}
                                El estudiante no ha aprobado el prerrequisito{" "}
                                <span className="font-medium">
                                  {prerequisiteStatus.prerequisiteCode}
                                  {prerequisiteStatus.prerequisiteName &&
                                    ` - ${prerequisiteStatus.prerequisiteName}`}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:ml-10 sm:flex sm:pl-4">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {isCreating ? "Creando..." : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCreating}
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
                          ¡Matrícula registrada exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          La matrícula se ha agregado correctamente.
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
                          Error al crear
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

export default CourseEnrollmentCreateDrawer;
