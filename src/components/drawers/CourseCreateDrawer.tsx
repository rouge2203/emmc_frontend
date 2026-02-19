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
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import {
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import * as Yup from "yup";

interface Career {
  id: number;
  name: string;
}

interface CourseType {
  id: number;
  name: string;
  price: number;
}

interface CourseCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseCreated?: () => void;
  careers: Career[];
  courseTypes: CourseType[];
}

interface PrerequisiteCoursesResponse {
  courses: Array<{ code: string; name: string }>;
}

const validationSchema = Yup.object({
  code: Yup.string()
    .required("El código del curso es obligatorio")
    .min(1, "El código no puede estar vacío"),
  name: Yup.string()
    .required("El nombre del curso es obligatorio")
    .min(1, "El nombre no puede estar vacío"),
  career_id: Yup.number()
    .nullable()
    .positive("Debe seleccionar una carrera válida"),
  course_type_id: Yup.number()
    .required("El tipo de curso es obligatorio")
    .positive("Debe seleccionar un tipo de curso"),
  special_price: Yup.number()
    .nullable()
    .min(0, "El precio debe ser mayor o igual a 0"),
  week_duration: Yup.number()
    .required("La duración en semanas es obligatoria")
    .min(1, "La duración debe ser al menos 1 semana"),
  prerequisite_code: Yup.string().nullable(),
  description: Yup.string().nullable(),
});

const CourseCreateDrawer: React.FC<CourseCreateDrawerProps> = ({
  isOpen,
  onClose,
  onCourseCreated,
  careers,
  courseTypes,
}) => {
  const axiosPrivate = useAxiosPrivate();
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    if (isOpen) {
      const fetchPrerequisiteCourses = async () => {
        try {
          const response = await axiosPrivate.get<PrerequisiteCoursesResponse>(
            "courses/list-courses-for-prerequisite",
          );
          setPrerequisiteCourses(response.data.courses);
        } catch (err: any) {
          console.error("Error fetching prerequisite courses:", err);
        }
      };
      fetchPrerequisiteCourses();
    }
  }, [isOpen, axiosPrivate]);

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setName("");
      setCareerId(null);
      setCourseTypeId(null);
      setSpecialPrice("");
      specialPriceRef.current = "";
      setPrerequisiteCode("");
      setWeekDuration(12);
      setDescription("");
      setErrors({});
      setPrerequisiteSearch("");
      setShowPrerequisiteDropdown(false);
      priceManuallyEdited.current = false;
      previousCourseTypeId.current = null;
    }
  }, [isOpen]);

  // Update special_price when course_type changes (only if not manually edited)
  useEffect(() => {
    if (courseTypeId) {
      const selectedCourseType = courseTypes.find(
        (type) => type.id === courseTypeId,
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
              (type) => type.id === previousCourseTypeId.current,
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
  }, [courseTypeId, courseTypes]);

  // Filter prerequisite courses based on search
  const filteredPrerequisiteCourses = prerequisiteCourses.filter(
    (course) =>
      course.code.toLowerCase().includes(prerequisiteSearch.toLowerCase()) ||
      course.name.toLowerCase().includes(prerequisiteSearch.toLowerCase()),
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

  // Validate form
  const validateForm = async () => {
    try {
      await validationSchema.validate(
        {
          code: code.trim(),
          name: name.trim(),
          career_id: careerId,
          course_type_id: courseTypeId,
          special_price: specialPrice ? parseFloat(specialPrice) : null,
          week_duration: weekDuration,
          prerequisite_code: prerequisiteCode || null,
          description: description.trim() || null,
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

  // Handle input changes
  const handleCodeChange = (value: string) => {
    setCode(value);
    if (errors.code) {
      setErrors({ ...errors, code: "" });
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (errors.name) {
      setErrors({ ...errors, name: "" });
    }
  };

  const handleCareerChange = (value: string) => {
    const id = value ? parseInt(value) : null;
    setCareerId(id);
    if (errors.career_id) {
      setErrors({ ...errors, career_id: "" });
    }
  };

  const handleCourseTypeChange = (value: string) => {
    const id = value ? parseInt(value) : null;
    setCourseTypeId(id);
    if (errors.course_type_id) {
      setErrors({ ...errors, course_type_id: "" });
    }
  };

  const handleSpecialPriceChange = (value: string) => {
    setSpecialPrice(value);
    specialPriceRef.current = value; // Keep ref in sync
    priceManuallyEdited.current = true; // Mark as manually edited
    if (errors.special_price) {
      setErrors({ ...errors, special_price: "" });
    }
  };

  const handlePrerequisiteCodeSelect = (code: string) => {
    setPrerequisiteCode(code);
    setPrerequisiteSearch(code);
    setShowPrerequisiteDropdown(false);
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
    if (!courseTypeId) return;

    setIsCreating(true);
    try {
      const createData: any = {
        code: code.trim(),
        name: name.trim(),
        course_type_id: courseTypeId,
        special_price: specialPrice ? parseInt(specialPrice) : null,
        week_duration: weekDuration,
        prerequisite_code: prerequisiteCode.trim() || null,
        description: description.trim() || null,
      };

      if (careerId) {
        createData.career_id = careerId;
      }

      await axiosPrivate.post("courses/manage-courses", createData);

      setShowConfirmDialog(false);

      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 5000);

      if (onCourseCreated) {
        onCourseCreated();
      }

      setCode("");
      setName("");
      setCareerId(null);
      setCourseTypeId(null);
      setSpecialPrice("");
      setPrerequisiteCode("");
      setWeekDuration(12);
      setDescription("");
      setErrors({});
      setPrerequisiteSearch("");

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Error creating course:", err);
      setShowConfirmDialog(false);

      // Set error message for notification
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Error al crear el curso. Por favor, intenta de nuevo.";

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
    !code.trim() || !name.trim() || !courseTypeId || isCreating;

  const selectedCourseType = courseTypes.find(
    (type) => type.id === courseTypeId,
  );

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
                <form className="relative flex h-full flex-col bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            Crear Curso
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Completa la información para crear un nuevo curso.
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
                      {/* Code */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="code"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Código <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="code"
                            name="code"
                            type="text"
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.code
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                            placeholder="Ej: MAT101"
                          />
                          {errors.code && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.code}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="name"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Nombre <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="name"
                            name="name"
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.name
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                            placeholder="Ej: Matemáticas Básicas"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Career */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="career"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Carrera
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mt-2 grid grid-cols-1">
                            <select
                              id="career"
                              name="career"
                              value={careerId || ""}
                              onChange={(e) =>
                                handleCareerChange(e.target.value)
                              }
                              className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.career_id
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
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
                          {errors.career_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.career_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Course Type */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="course_type"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Tipo de curso{" "}
                            <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="mt-2 grid grid-cols-1">
                            <select
                              id="course_type"
                              name="course_type"
                              value={courseTypeId || ""}
                              onChange={(e) =>
                                handleCourseTypeChange(e.target.value)
                              }
                              className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                                errors.course_type_id
                                  ? "outline-red-500 focus-visible:outline-red-500"
                                  : "focus-visible:outline-gray-900"
                              }`}
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
                          {errors.course_type_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.course_type_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Special Price */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="special_price"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Precio (₡)
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            id="special_price"
                            name="special_price"
                            type="number"
                            min="0"
                            value={specialPrice}
                            onChange={(e) =>
                              handleSpecialPriceChange(e.target.value)
                            }
                            className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 ${
                              errors.special_price
                                ? "outline-red-500 focus-visible:outline-red-500"
                                : "focus-visible:outline-gray-900"
                            }`}
                            placeholder={
                              selectedCourseType
                                ? `Precio por defecto: ₡${selectedCourseType.price.toLocaleString()}`
                                : "Precio"
                            }
                          />
                          {errors.special_price && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.special_price}
                            </p>
                          )}
                          <span className="text-xs text-gray-500">
                            Precio por defecto: ₡
                            {selectedCourseType?.price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Prerequisite Code */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="prerequisite_code"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Código de prerequisito
                          </label>
                        </div>
                        <div className="sm:col-span-2 relative prerequisite-dropdown-container rounded-lg">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center  pointer-events-none">
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
                              onFocus={() => setShowPrerequisiteDropdown(true)}
                              className="block w-full pl-10 pr-3 py-1.5 text-base rounded-md text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 focus-visible:outline-gray-900"
                              placeholder="Buscar curso..."
                            />
                          </div>
                          {showPrerequisiteDropdown &&
                            filteredPrerequisiteCourses.length > 0 && (
                              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {filteredPrerequisiteCourses.map((course) => (
                                  <div
                                    key={course.code}
                                    onClick={() =>
                                      handlePrerequisiteCodeSelect(course.code)
                                    }
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                                  >
                                    <div className="flex items-center">
                                      <span className="font-medium text-gray-900">
                                        {course.code}
                                      </span>
                                      <span className="ml-2 text-gray-500">
                                        {course.name}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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

                      {/* Description */}
                      <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            htmlFor="description"
                            className="block text-sm/6 font-medium text-gray-900 sm:mt-1.5"
                          >
                            Descripción
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <textarea
                            id="description"
                            name="description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6 focus-visible:outline-gray-900"
                            placeholder="Descripción del curso..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-4 py-4">
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
                    Confirmar creación
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas crear el curso{" "}
                      {code ? `"${code} - ${name}"` : ""}?
                    </p>
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
                          ¡Curso creado exitosamente!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          El curso se ha agregado correctamente.
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

export default CourseCreateDrawer;
