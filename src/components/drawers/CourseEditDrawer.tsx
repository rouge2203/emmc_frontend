import React, { useEffect, useState, useRef } from "react";
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
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

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
  description: string | null;
  career: Career;
  career_name: string;
  prerequisite_code: string | null;
  week_duration: number;
  course_type: CourseType;
  course_type_name: string;
  course_type_price: number;
  special_price: number | null;
  is_matricula: boolean;
  estudiantes_count: number;
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

interface CourseEditDrawerProps {
  courseId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onCourseUpdated?: (updatedCourse: Course) => void;
  onCourseDeleted?: () => void;
  careers: Career[];
  courseTypes: CourseType[];
}

interface CourseResponse {
  course: Course;
}

interface CoursesResponse {
  results: Course[];
  pagination: any;
}

interface PrerequisiteCoursesResponse {
  courses: Array<{ code: string; name: string }>;
}

const CourseEditDrawer: React.FC<CourseEditDrawerProps> = ({
  courseId,
  isOpen,
  onClose,
  onCourseUpdated,
  onCourseDeleted,
  careers,
  courseTypes,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prerequisiteCourses, setPrerequisiteCourses] = useState<
    Array<{ code: string; name: string }>
  >([]);
  const [prerequisiteSearch, setPrerequisiteSearch] = useState("");
  const [showPrerequisiteDropdown, setShowPrerequisiteDropdown] =
    useState(false);
  const priceManuallyEdited = useRef(false);
  const previousCourseTypeId = useRef<number | null>(null);
  const specialPriceRef = useRef<string>("");

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [careerId, setCareerId] = useState<number | null>(null);
  const [courseTypeId, setCourseTypeId] = useState<number | null>(null);
  const [specialPrice, setSpecialPrice] = useState<string>("");
  const [prerequisiteCode, setPrerequisiteCode] = useState<string>("");
  const [weekDuration, setWeekDuration] = useState<number>(12);
  const [description, setDescription] = useState("");

  // Fetch prerequisite courses
  useEffect(() => {
    if (isOpen && courseId) {
      const fetchPrerequisiteCourses = async () => {
        try {
          const response = await axiosPrivate.get<PrerequisiteCoursesResponse>(
            "courses/list-courses-for-prerequisite",
            {
              params: {
                exclude_course_id: courseId,
              },
            }
          );
          setPrerequisiteCourses(response.data.courses);
        } catch (err: any) {
          console.error("Error fetching prerequisite courses:", err);
        }
      };
      fetchPrerequisiteCourses();
    }
  }, [isOpen, courseId, axiosPrivate]);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchCourseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, courseId]);

  // Update special_price when course_type changes (only if not manually edited)
  useEffect(() => {
    if (courseTypeId && course) {
      const selectedCourseType = courseTypes.find(
        (type) => type.id === courseTypeId
      );
      if (selectedCourseType) {
        // Only auto-set price if course type actually changed
        if (previousCourseTypeId.current !== courseTypeId) {
          // Only auto-set if user hasn't manually edited it
          if (!priceManuallyEdited.current) {
            const newPrice = selectedCourseType.price.toString();
            setSpecialPrice(newPrice);
            specialPriceRef.current = newPrice;
          } else {
            // Check if current price matches previous course type's price
            const previousCourseType = courseTypes.find(
              (type) => type.id === previousCourseTypeId.current
            );
            if (
              previousCourseType &&
              specialPriceRef.current === previousCourseType.price.toString()
            ) {
              // User hasn't changed the price, so update to new course type's price
              const newPrice = selectedCourseType.price.toString();
              setSpecialPrice(newPrice);
              specialPriceRef.current = newPrice;
              priceManuallyEdited.current = false;
            }
          }
          previousCourseTypeId.current = courseTypeId;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseTypeId, courseTypes, course]);

  const fetchCourseData = async () => {
    if (!courseId) return;

    try {
      setIsLoading(true);
      setError(null);
      // Fetch the specific course by making a GET request
      const response = await axiosPrivate.get<CoursesResponse>(
        "courses/manage-courses",
        {
          params: {
            page: 1,
            page_size: 1000, // Get enough to find our course
          },
        }
      );
      const foundCourse = response.data.results.find((c) => c.id === courseId);
      if (foundCourse) {
        setCourse(foundCourse);
        setCode(foundCourse.code);
        setName(foundCourse.name);
        setCareerId(foundCourse.career?.id || null);
        setCourseTypeId(foundCourse.course_type.id);
        const initialPrice =
          foundCourse.special_price?.toString() ||
          foundCourse.course_type_price.toString();
        setSpecialPrice(initialPrice);
        specialPriceRef.current = initialPrice;
        // Reset manual edit flag when loading course data
        priceManuallyEdited.current = false;
        previousCourseTypeId.current = foundCourse.course_type.id;
        setPrerequisiteCode(foundCourse.prerequisite_code || "");
        setPrerequisiteSearch(foundCourse.prerequisite_code || "");
        setWeekDuration(foundCourse.week_duration);
        setDescription(foundCourse.description || "");
      } else {
        setError("Curso no encontrado");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Error al cargar la información del curso"
      );
      console.error("Error fetching course data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter prerequisite courses based on search
  const filteredPrerequisiteCourses = prerequisiteCourses.filter(
    (c) =>
      c.code.toLowerCase().includes(prerequisiteSearch.toLowerCase()) ||
      c.name.toLowerCase().includes(prerequisiteSearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".prerequisite-dropdown-container")) {
        setShowPrerequisiteDropdown(false);
      }
    };

    if (showPrerequisiteDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showPrerequisiteDropdown]);

  const handleSave = async () => {
    if (!courseId) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: any = {
        course_id: courseId,
      };

      // Include all fields that can be updated
      if (code !== (course?.code || "")) {
        updateData.code = code.trim();
      }
      if (name !== (course?.name || "")) {
        updateData.name = name.trim();
      }
      // Always include career_id to allow setting it to null
      const currentCareerId = course?.career?.id || null;
      if (careerId !== currentCareerId) {
        updateData.career_id = careerId || null;
      }
      if (courseTypeId !== course?.course_type.id) {
        updateData.course_type_id = courseTypeId;
      }
      const currentSpecialPrice =
        course?.special_price?.toString() ||
        course?.course_type_price.toString() ||
        "";
      if (specialPrice !== currentSpecialPrice) {
        updateData.special_price = specialPrice ? parseInt(specialPrice) : null;
      }
      if (prerequisiteCode !== (course?.prerequisite_code || "")) {
        updateData.prerequisite_code = prerequisiteCode.trim() || null;
      }
      if (weekDuration !== (course?.week_duration || 12)) {
        updateData.week_duration = weekDuration;
      }
      if (description !== (course?.description || "")) {
        updateData.description = description.trim() || null;
      }

      const response = await axiosPrivate.put<CourseResponse>(
        "courses/manage-courses",
        updateData
      );

      // Update local state with response
      const updatedCourse = response.data.course;
      if (updatedCourse) {
        setCourse(updatedCourse);
        setCode(updatedCourse.code);
        setName(updatedCourse.name);
        setCareerId(updatedCourse.career?.id || null);
        setCourseTypeId(updatedCourse.course_type.id);
        const updatedPrice =
          updatedCourse.special_price?.toString() ||
          updatedCourse.course_type_price.toString();
        setSpecialPrice(updatedPrice);
        specialPriceRef.current = updatedPrice;
        // Reset manual edit flag after successful save
        priceManuallyEdited.current = false;
        previousCourseTypeId.current = updatedCourse.course_type.id;
        setPrerequisiteCode(updatedCourse.prerequisite_code || "");
        setPrerequisiteSearch(updatedCourse.prerequisite_code || "");
        setWeekDuration(updatedCourse.week_duration);
        setDescription(updatedCourse.description || "");

        // Notify parent component to update the list
        if (onCourseUpdated) {
          onCourseUpdated(updatedCourse);
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
      console.error("Error saving course data:", err);
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
    if (!courseId) return;

    setIsDeleting(true);
    try {
      await axiosPrivate.delete("courses/manage-courses", {
        data: { course_id: courseId },
      });
      setShowDeleteDialog(false);
      onClose();
      if (onCourseDeleted) {
        onCourseDeleted();
      }
    } catch (err: any) {
      console.error("Error deleting course:", err);
      setError(err?.response?.data?.error || "Error al eliminar el curso");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const handlePrerequisiteCodeSelect = (code: string) => {
    setPrerequisiteCode(code);
    setPrerequisiteSearch(code);
    setShowPrerequisiteDropdown(false);
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
                          Información del Curso
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
                          Edita la información del curso.
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
                    ) : course ? (
                      <div className="divide-y divide-gray-200 px-4 sm:px-6 py-6">
                        <div className="space-y-3.5">
                          {/* Code */}
                          <div>
                            <label
                              htmlFor="code"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Código <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                              <input
                                id="code"
                                name="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Name */}
                          <div>
                            <label
                              htmlFor="name"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Nombre <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2">
                              <input
                                id="name"
                                name="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Career */}
                          <div>
                            <label
                              htmlFor="career"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Carrera
                            </label>
                            <div className="mt-2 grid grid-cols-1">
                              <select
                                id="career"
                                name="career"
                                value={careerId || ""}
                                onChange={(e) =>
                                  setCareerId(
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : null
                                  )
                                }
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              >
                                <option value="">N/A</option>
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

                          {/* Course Type */}
                          <div>
                            <label
                              htmlFor="course_type"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Tipo de curso{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-2 grid grid-cols-1">
                              <select
                                id="course_type"
                                name="course_type"
                                value={courseTypeId || ""}
                                onChange={(e) =>
                                  setCourseTypeId(
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : null
                                  )
                                }
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              >
                                <option value="">Seleccione un tipo</option>
                                {courseTypes.map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.name} - ₡{type.price.toLocaleString()}
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

                          {/* Special Price */}
                          <div>
                            <label
                              htmlFor="special_price"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Precio (₡)
                            </label>
                            <div className="mt-2">
                              <input
                                id="special_price"
                                name="special_price"
                                type="number"
                                min="0"
                                value={specialPrice}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setSpecialPrice(value);
                                  specialPriceRef.current = value; // Keep ref in sync
                                  priceManuallyEdited.current = true; // Mark as manually edited
                                }}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Prerequisite Code */}
                          <div>
                            <label
                              htmlFor="prerequisite_code"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Código de prerequisito
                            </label>
                            <div className="mt-2 relative prerequisite-dropdown-container">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <MagnifyingGlassIcon
                                    className="h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                  />
                                </div>
                                <input
                                  id="prerequisite_code"
                                  name="prerequisite_code"
                                  type="text"
                                  value={prerequisiteSearch}
                                  onChange={(e) => {
                                    setPrerequisiteSearch(e.target.value);
                                    setShowPrerequisiteDropdown(true);
                                  }}
                                  onFocus={() =>
                                    setShowPrerequisiteDropdown(true)
                                  }
                                  className="block w-full pl-10 rounded-md pr-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                                  placeholder="Buscar curso..."
                                />
                              </div>
                              {showPrerequisiteDropdown &&
                                filteredPrerequisiteCourses.length > 0 && (
                                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                    {filteredPrerequisiteCourses.map((c) => (
                                      <div
                                        key={c.code}
                                        onClick={() =>
                                          handlePrerequisiteCodeSelect(c.code)
                                        }
                                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                      >
                                        <div className="flex items-center">
                                          <span className="font-medium text-gray-900">
                                            {c.code}
                                          </span>
                                          <span className="ml-2 text-gray-500">
                                            {c.name}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
                                onChange={(e) =>
                                  setWeekDuration(
                                    parseInt(e.target.value) || 12
                                  )
                                }
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <label
                              htmlFor="description"
                              className="block text-sm/6 font-medium text-gray-900"
                            >
                              Descripción
                            </label>
                            <div className="mt-2">
                              <textarea
                                id="description"
                                name="description"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 sm:text-sm/6"
                              />
                            </div>
                          </div>

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
                                  {course.created_at
                                    ? new Date(
                                        course.created_at
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
                                  {course.updated_at
                                    ? new Date(
                                        course.updated_at
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
                            {course.created_by && (
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
                                    {`${course.created_by.first_name} ${course.created_by.last_name}`}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Updated By */}
                            {course.updated_by && (
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
                                    {`${course.updated_by.first_name} ${course.updated_by.last_name}`}
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
                      //   disabled={isSaving || isDeleting}
                      disabled={true}
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
                      ¿Estás seguro de que deseas guardar los cambios en el
                      curso? Esta acción actualizará los datos.
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
                          Los cambios en el curso se han actualizado
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
          document.body
        )}

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
                      ¿Estás seguro de que deseas eliminar el curso "
                      {course?.code} - {course?.name}"? Esta acción es
                      irreversible y no se puede deshacer.
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
          document.body
        )}
    </>
  );
};

export default CourseEditDrawer;
