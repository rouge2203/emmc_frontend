import React, { useState, useEffect } from "react";
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
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon as XMarkIconSolid } from "@heroicons/react/20/solid";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface Classroom {
  id: number;
  number: number;
  name: string;
  display_name: string;
  enrollment_count?: number;
}

interface ConflictInfo {
  schedule_id: number;
  day: string;
  hour: string | null;
  end_hour: string | null;
  course_name: string | null;
  course_code: string | null;
  student_name: string | null;
  professor_name: string | null;
  enrollment_id: number;
}

interface CourseEnrollmentSchedule {
  id: number;
  course_enrollment: number;
  day: string;
  day_display: string;
  hour: string | null;
  end_hour: string | null;
  classroom: string | null;
  classroom_id: number | null;
  classroom_name: string | null;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  created_at: string;
  updated_by: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  updated_at: string;
}

interface CourseEnrollment {
  id: number;
  week_duration: number;
  course_name: string;
  course_code: string;
  student_full_name: string;
  professor_full_name: string | null;
  status: string;
}

interface SchedulesResponse {
  schedules: CourseEnrollmentSchedule[];
  enrollment: CourseEnrollment;
}

interface ScheduleResponse {
  schedule: CourseEnrollmentSchedule;
}

interface CourseEnrollmentScheduleDrawerProps {
  enrollmentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated?: () => void;
}

const DAY_OPTIONS = [
  { value: "L", label: "Lunes" },
  { value: "K", label: "Martes" },
  { value: "M", label: "Miércoles" },
  { value: "J", label: "Jueves" },
  { value: "V", label: "Viernes" },
  { value: "S", label: "Sábado" },
  { value: "D", label: "Domingo" },
];

const CourseEnrollmentScheduleDrawer: React.FC<
  CourseEnrollmentScheduleDrawerProps
> = ({ enrollmentId, isOpen, onClose, onScheduleUpdated }) => {
  const axiosPrivate = useAxiosPrivate();
  const [schedules, setSchedules] = useState<CourseEnrollmentSchedule[]>([]);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorNotificationMessage, setErrorNotificationMessage] = useState("");
  const [editingSchedules, setEditingSchedules] = useState<
    Record<number, CourseEnrollmentSchedule>
  >({});
  const [newSchedules, setNewSchedules] = useState<
    Array<{ day: string; hour: string; end_hour: string; classroom_id: number | null; tempId: number }>
  >([]);
  const [schedulesToDelete, setSchedulesToDelete] = useState<number[]>([]);
  const [notifyUser, setNotifyUser] = useState(false);
  const [tempIdCounter, setTempIdCounter] = useState(1000);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    conflicts: ConflictInfo[];
    classroom: Classroom | null;
    scheduleId?: number;
    tempId?: number;
  } | null>(null);

  // Check if enrollment is read-only (status is not "cursando")
  const isReadOnly = enrollment?.status !== "cursando";

  // Fetch classrooms on mount
  const fetchClassrooms = async () => {
    try {
      const response = await axiosPrivate.get<{ classrooms: Classroom[] }>("courses/classrooms");
      setClassrooms(response.data.classrooms);
    } catch (err) {
      console.error("Error fetching classrooms:", err);
    }
  };

  // Check for classroom conflicts
  const checkClassroomConflicts = async (
    classroomId: number,
    day: string,
    excludeScheduleId?: number
  ): Promise<{ hasConflicts: boolean; conflicts: ConflictInfo[]; classroom: Classroom | null }> => {
    try {
      const params: any = { classroom_id: classroomId, day };
      if (excludeScheduleId) {
        params.exclude_schedule_id = excludeScheduleId;
      }
      const response = await axiosPrivate.get<{
        has_conflicts: boolean;
        conflicts: ConflictInfo[];
        classroom: Classroom;
      }>("courses/classroom-conflicts", { params });
      return {
        hasConflicts: response.data.has_conflicts,
        conflicts: response.data.conflicts,
        classroom: response.data.classroom,
      };
    } catch (err) {
      console.error("Error checking conflicts:", err);
      return { hasConflicts: false, conflicts: [], classroom: null };
    }
  };

  // Handle classroom selection with conflict check for existing schedules
  const handleClassroomSelectForExisting = async (
    scheduleId: number,
    classroomId: number | null,
    day: string
  ) => {
    handleEditScheduleChange(scheduleId, "classroom_id", classroomId);
    
    if (classroomId && day) {
      const { hasConflicts, conflicts, classroom } = await checkClassroomConflicts(classroomId, day, scheduleId);
      if (hasConflicts) {
        setConflictInfo({ conflicts, classroom, scheduleId });
        setShowConflictDialog(true);
      }
    }
  };

  // Handle classroom selection with conflict check for new schedules
  const handleClassroomSelectForNew = async (
    tempId: number,
    classroomId: number | null,
    day: string
  ) => {
    handleNewScheduleChange(tempId, "classroom_id", classroomId);
    
    if (classroomId && day) {
      const { hasConflicts, conflicts, classroom } = await checkClassroomConflicts(classroomId, day);
      if (hasConflicts) {
        setConflictInfo({ conflicts, classroom, tempId });
        setShowConflictDialog(true);
      }
    }
  };

  // Fetch schedules and enrollment data
  useEffect(() => {
    if (isOpen && enrollmentId) {
      fetchSchedules();
      fetchClassrooms();
    } else {
      setSchedules([]);
      setEnrollment(null);
      setEditingSchedules({});
      setNewSchedules([]);
      setSchedulesToDelete([]);
      setNotifyUser(false);
      setErrorNotificationMessage("");
      setTempIdCounter(1000);
      setShowConfirmDialog(false);
    }
  }, [isOpen, enrollmentId]);

  // Initialize editingSchedules from schedules when they're loaded
  useEffect(() => {
    if (schedules.length > 0) {
      setEditingSchedules((prevEditing) => {
        // If prevEditing is empty, initialize from schedules
        const needsInitialization = Object.keys(prevEditing).length === 0;
        if (needsInitialization) {
          const updatedEditing: Record<number, CourseEnrollmentSchedule> = {};
          schedules.forEach((schedule) => {
            updatedEditing[schedule.id] = {
              ...schedule,
              // classroom_id is already provided by the backend serializer
            };
          });
          return updatedEditing;
        }
        // Otherwise preserve existing edits
        return prevEditing;
      });
    }
  }, [schedules]);

  const fetchSchedules = async () => {
    if (!enrollmentId) return;

    try {
      setIsLoading(true);
      const response = await axiosPrivate.get<SchedulesResponse>(
        "courses/manage-enrollment-schedules",
        {
          params: {
            course_enrollment_id: enrollmentId,
          },
        }
      );
      setSchedules(response.data.schedules);
      setEnrollment(response.data.enrollment);
      setSchedulesToDelete([]);
      setNewSchedules([]);
      
      // Note: classroom_id will be set in useEffect when classrooms are loaded
    } catch (err: any) {
      console.error("Error fetching schedules:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al cargar los horarios"
      );
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditScheduleChange = (
    id: number,
    field: string,
    value: string | number | null
  ) => {
    setEditingSchedules((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleAddNewSchedule = () => {
    if (
      !newSchedules[newSchedules.length - 1]?.day &&
      newSchedules.length > 0
    ) {
      return; // Don't add empty schedule if there's already one
    }
    setNewSchedules((prev) => [
      ...prev,
      { day: "", hour: "", end_hour: "", classroom_id: null, tempId: tempIdCounter },
    ]);
    setTempIdCounter((prev) => prev + 1);
  };

  const handleNewScheduleChange = (
    tempId: number,
    field: string,
    value: string | number | null
  ) => {
    setNewSchedules((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveNewSchedule = (tempId: number) => {
    setNewSchedules((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const handleMarkForDeletion = (id: number) => {
    setSchedulesToDelete((prev) => [...prev, id]);
    setEditingSchedules((prev) => {
      const newEditing = { ...prev };
      delete newEditing[id];
      return newEditing;
    });
  };

  const handleUnmarkForDeletion = (id: number) => {
    setSchedulesToDelete((prev) => prev.filter((sid) => sid !== id));
    // Restore original schedule data
    const originalSchedule = schedules.find((s) => s.id === id);
    if (originalSchedule) {
      setEditingSchedules((prev) => ({
        ...prev,
        [id]: { ...originalSchedule },
      }));
    }
  };

  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleSaveCancel = () => {
    setShowConfirmDialog(false);
  };

  const handleSaveAll = async () => {
    if (!enrollmentId) return;

    setShowConfirmDialog(false);
    setIsSaving(true);
    try {
      // First, delete all schedules marked for deletion
      for (const scheduleId of schedulesToDelete) {
        try {
          await axiosPrivate.delete("courses/manage-enrollment-schedules", {
            data: { schedule_id: scheduleId },
          });
        } catch (err: any) {
          console.error(`Error deleting schedule ${scheduleId}:`, err);
          // Continue with other operations even if one delete fails
        }
      }

      // Then, update all modified schedules
      for (const [id, editingSchedule] of Object.entries(editingSchedules)) {
        const scheduleId = parseInt(id);
        const originalSchedule = schedules.find((s) => s.id === scheduleId);
        if (!originalSchedule) continue;

        // Check if schedule was actually modified
        const wasModified =
          editingSchedule.day !== originalSchedule.day ||
          editingSchedule.hour !== originalSchedule.hour ||
          editingSchedule.end_hour !== originalSchedule.end_hour ||
          editingSchedule.classroom_id !== originalSchedule.classroom_id;

        if (wasModified) {
          try {
            const updateData: any = {
              schedule_id: scheduleId,
            };

            if (editingSchedule.day) {
              updateData.day = editingSchedule.day;
            }
            if (editingSchedule.hour !== undefined) {
              updateData.hour = editingSchedule.hour || null;
            }
            if (editingSchedule.end_hour !== undefined) {
              updateData.end_hour = editingSchedule.end_hour || null;
            }
            if (editingSchedule.classroom_id !== undefined) {
              updateData.classroom_id = editingSchedule.classroom_id;
            }

            await axiosPrivate.put<ScheduleResponse>(
              "courses/manage-enrollment-schedules",
              updateData
            );
          } catch (err: any) {
            console.error(`Error updating schedule ${scheduleId}:`, err);
            // Continue with other operations
          }
        }
      }

      // Finally, create all new schedules
      const schedulesToCreate = newSchedules.filter((s) => s.day);
      for (const newSchedule of schedulesToCreate) {
        try {
          const createData: any = {
            course_enrollment_id: enrollmentId,
            day: newSchedule.day,
          };

          if (newSchedule.hour) {
            createData.hour = newSchedule.hour;
          }

          if (newSchedule.end_hour) {
            createData.end_hour = newSchedule.end_hour;
          }

          if (newSchedule.classroom_id) {
            createData.classroom_id = newSchedule.classroom_id;
          }

          await axiosPrivate.post<ScheduleResponse>(
            "courses/manage-enrollment-schedules",
            createData
          );
        } catch (err: any) {
          console.error("Error creating schedule:", err);
          // Continue with other operations
        }
      }

      // Refresh schedules to get updated data
      await fetchSchedules();

      // Send notification email if checkbox is enabled (after all operations)
      if (notifyUser) {
        try {
          await axiosPrivate.post("courses/manage-enrollment-schedules", {
            course_enrollment_id: enrollmentId,
            notify_only: true,
          });
        } catch (err: any) {
          console.error("Error sending notification:", err);
          // Don't fail the whole operation if notification fails
        }
      }

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);

      // Notify parent to refresh
      if (onScheduleUpdated) {
        onScheduleUpdated();
      }
    } catch (err: any) {
      console.error("Error saving schedules:", err);
      setErrorNotificationMessage(
        err?.response?.data?.error || "Error al guardar los horarios"
      );
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeForInput = (timeStr: string | null): string => {
    if (!timeStr) return "";
    // If timeStr is already in HH:MM format, return it
    if (timeStr.match(/^\d{2}:\d{2}$/)) {
      return timeStr;
    }
    // If timeStr is in HH:MM:SS format, extract HH:MM
    if (timeStr.match(/^\d{2}:\d{2}:\d{2}/)) {
      return timeStr.substring(0, 5);
    }
    // Try to parse as time string
    try {
      const parts = timeStr.split(":");
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
      }
    } catch {
      return "";
    }
    return "";
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
                className="pointer-events-auto w-screen max-w-2xl transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700 flex flex-col h-full max-h-screen"
              >
                <div className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-20 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <DialogTitle className="text-base font-semibold text-gray-900">
                            Gestión de Horarios
                          </DialogTitle>
                          <p className="text-sm text-gray-500">
                            Gestiona los horarios de la matrícula.
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

                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="mt-4 text-sm text-gray-600">
                            Cargando horarios...
                          </p>
                        </div>
                      </div>
                    ) : enrollment ? (
                      <div className="px-4 sm:px-6 py-6">
                        {/* Week Duration Note */}
                        <div className="mb-6 rounded-md bg-gray-50 border border-gray-200 px-4 py-3">
                          <div className="flex">
                            <div className="shrink-0">
                              <InformationCircleIcon
                                className="size-5 text-primary"
                                aria-hidden="true"
                              />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-primary">
                                Duración del curso: {enrollment.week_duration}{" "}
                                semanas
                              </p>
                              <p className="mt-1 text-xs text-gray-700">
                                Curso: {enrollment.course_code} -{" "}
                                {enrollment.course_name}
                              </p>
                              <p className="mt-1 text-xs text-gray-700">
                                Estudiante: {enrollment.student_full_name}
                              </p>
                              {enrollment.professor_full_name && (
                                <p className="mt-1 text-xs text-gray-700">
                                  Profesor/a: {enrollment.professor_full_name}
                                </p>
                              )}
                              {isReadOnly && (
                                <p className="mt-2 text-xs font-semibold text-orange-700">
                                  El curso ya ha concluido. No se pueden agregar
                                  nuevos horarios.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Schedules List */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-900">
                            Horarios existentes
                          </h3>
                          {schedules.filter(
                            (s) => !schedulesToDelete.includes(s.id)
                          ).length === 0 && newSchedules.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No hay horarios registrados.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {schedules
                                .filter(
                                  (s) => !schedulesToDelete.includes(s.id)
                                )
                                .map((schedule) => {
                                  const editingSchedule =
                                    editingSchedules[schedule.id];
                                  if (!editingSchedule) return null;

                                  return (
                                    <div
                                      key={schedule.id}
                                      className="border border-gray-200 rounded-lg p-4"
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                                        <div className="w-full min-w-0 flex-1">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Día
                                          </label>
                                          <div className="grid grid-cols-1">
                                            <select
                                              value={editingSchedule.day}
                                              onChange={(e) =>
                                                handleEditScheduleChange(
                                                  schedule.id,
                                                  "day",
                                                  e.target.value
                                                )
                                              }
                                              disabled={isReadOnly}
                                              className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 ${
                                                isReadOnly
                                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                  : ""
                                              }`}
                                            >
                                              {DAY_OPTIONS.map((option) => (
                                                <option
                                                  key={option.value}
                                                  value={option.value}
                                                >
                                                  {option.label}
                                                </option>
                                              ))}
                                            </select>
                                            <svg
                                              viewBox="0 0 16 16"
                                              fill="currentColor"
                                              data-slot="icon"
                                              aria-hidden="true"
                                              className={`pointer-events-none col-start-1 row-start-1 mr-2 size-4 self-center justify-self-end text-gray-500 ${
                                                isReadOnly
                                                  ? "text-gray-400"
                                                  : ""
                                              }`}
                                            >
                                              <path
                                                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                                                clipRule="evenodd"
                                                fillRule="evenodd"
                                              />
                                            </svg>
                                          </div>
                                        </div>
                                        <div className="w-full min-w-0 flex-1">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Hora
                                          </label>
                                          <input
                                            type="time"
                                            value={
                                              editingSchedule.hour
                                                ? formatTimeForInput(
                                                    editingSchedule.hour
                                                  )
                                                : ""
                                            }
                                            onChange={(e) =>
                                              handleEditScheduleChange(
                                                schedule.id,
                                                "hour",
                                                e.target.value
                                              )
                                            }
                                            disabled={isReadOnly}
                                            className={`block w-full max-w-full min-w-0 rounded-md px-3 py-1.5 text-sm outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                                              isReadOnly
                                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                : "bg-white text-gray-900 focus-visible:outline-gray-900"
                                            }`}
                                            style={{
                                              width: "100%",
                                              maxWidth: "100%",
                                              minWidth: "0",
                                              WebkitAppearance: "none",
                                              appearance: "none",
                                              boxSizing: "border-box",
                                              MozAppearance: "textfield",
                                            }}
                                          />
                                        </div>
                                        <div className="w-full min-w-0 flex-1">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Hora Fin
                                          </label>
                                          <input
                                            type="time"
                                            value={
                                              editingSchedule.end_hour
                                                ? formatTimeForInput(
                                                    editingSchedule.end_hour
                                                  )
                                                : ""
                                            }
                                            onChange={(e) =>
                                              handleEditScheduleChange(
                                                schedule.id,
                                                "end_hour",
                                                e.target.value
                                              )
                                            }
                                            disabled={isReadOnly}
                                            className={`block w-full max-w-full min-w-0 rounded-md px-3 py-1.5 text-sm outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                                              isReadOnly
                                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                : "bg-white text-gray-900 focus-visible:outline-gray-900"
                                            }`}
                                            style={{
                                              width: "100%",
                                              maxWidth: "100%",
                                              minWidth: "0",
                                              WebkitAppearance: "none",
                                              appearance: "none",
                                              boxSizing: "border-box",
                                              MozAppearance: "textfield",
                                            }}
                                          />
                                        </div>
                                        <div className="w-full min-w-0 flex-1">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Aula
                                          </label>
                                          <div className="grid grid-cols-1">
                                            <select
                                              value={editingSchedule.classroom_id ?? ""}
                                              onChange={(e) =>
                                                handleClassroomSelectForExisting(
                                                  schedule.id,
                                                  e.target.value ? Number(e.target.value) : null,
                                                  editingSchedule.day
                                                )
                                              }
                                              disabled={isReadOnly}
                                              className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 ${
                                                isReadOnly
                                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                  : ""
                                              }`}
                                            >
                                              <option value="">Sin aula</option>
                                              {classrooms.map((classroom) => (
                                                <option key={classroom.id} value={classroom.id}>
                                                  Aula {classroom.number}
                                                </option>
                                              ))}
                                            </select>
                                            <svg
                                              viewBox="0 0 16 16"
                                              fill="currentColor"
                                              data-slot="icon"
                                              aria-hidden="true"
                                              className={`pointer-events-none col-start-1 row-start-1 mr-2 size-4 self-center justify-self-end text-gray-500 ${
                                                isReadOnly
                                                  ? "text-gray-400"
                                                  : ""
                                              }`}
                                            >
                                              <path
                                                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                                                clipRule="evenodd"
                                                fillRule="evenodd"
                                              />
                                            </svg>
                                          </div>
                                        </div>
                                        <div className="flex items-end gap-2">
                                          {!isReadOnly && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleMarkForDeletion(
                                                  schedule.id
                                                )
                                              }
                                              className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-red-900"
                                            >
                                              <TrashIcon className="size-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>

                        {/* Create New Schedules */}
                        {!isReadOnly && (
                          <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-medium text-gray-900">
                                Agregar nuevos horarios
                              </h3>
                              <button
                                type="button"
                                onClick={handleAddNewSchedule}
                                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                              >
                                <PlusIcon className="h-4 w-4" />
                                Agregar
                              </button>
                            </div>
                            {newSchedules.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                Haz clic en "Agregar" para crear un nuevo
                                horario.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {newSchedules.map((newSchedule) => (
                                  <div
                                    key={newSchedule.tempId}
                                    className="border border-gray-200 rounded-lg p-4"
                                  >
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                                      <div className="w-full min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Día{" "}
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        </label>
                                        <div className="grid grid-cols-1">
                                          <select
                                            value={newSchedule.day}
                                            onChange={(e) =>
                                              handleNewScheduleChange(
                                                newSchedule.tempId,
                                                "day",
                                                e.target.value
                                              )
                                            }
                                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900"
                                          >
                                            <option value="">
                                              Seleccionar día
                                            </option>
                                            {DAY_OPTIONS.map((option) => (
                                              <option
                                                key={option.value}
                                                value={option.value}
                                              >
                                                {option.label}
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
                                      <div className="w-full min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Hora
                                        </label>
                                        <input
                                          type="time"
                                          value={newSchedule.hour}
                                          onChange={(e) =>
                                            handleNewScheduleChange(
                                              newSchedule.tempId,
                                              "hour",
                                              e.target.value
                                            )
                                          }
                                          disabled={isReadOnly}
                                          className={`block w-full max-w-full min-w-0 rounded-md px-3 py-1.5 text-sm outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                                            isReadOnly
                                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                              : "bg-white text-gray-900 focus-visible:outline-gray-900"
                                          }`}
                                          style={{
                                            width: "100%",
                                            maxWidth: "100%",
                                            minWidth: "0",
                                            WebkitAppearance: "none",
                                            appearance: "none",
                                            boxSizing: "border-box",
                                            MozAppearance: "textfield",
                                          }}
                                        />
                                      </div>
                                      <div className="w-full min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Hora Fin
                                        </label>
                                        <input
                                          type="time"
                                          value={newSchedule.end_hour}
                                          onChange={(e) =>
                                            handleNewScheduleChange(
                                              newSchedule.tempId,
                                              "end_hour",
                                              e.target.value
                                            )
                                          }
                                          disabled={isReadOnly}
                                          className={`block w-full max-w-full min-w-0 rounded-md px-3 py-1.5 text-sm outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                                            isReadOnly
                                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                              : "bg-white text-gray-900 focus-visible:outline-gray-900"
                                          }`}
                                          style={{
                                            width: "100%",
                                            maxWidth: "100%",
                                            minWidth: "0",
                                            WebkitAppearance: "none",
                                            appearance: "none",
                                            boxSizing: "border-box",
                                            MozAppearance: "textfield",
                                          }}
                                        />
                                      </div>
                                      <div className="w-full min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Aula
                                        </label>
                                        <div className="grid grid-cols-1">
                                          <select
                                            value={newSchedule.classroom_id ?? ""}
                                            onChange={(e) =>
                                              handleClassroomSelectForNew(
                                                newSchedule.tempId,
                                                e.target.value ? Number(e.target.value) : null,
                                                newSchedule.day
                                              )
                                            }
                                            disabled={isReadOnly}
                                            className={`col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900 ${
                                              isReadOnly
                                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                : ""
                                            }`}
                                          >
                                            <option value="">Sin aula</option>
                                            {classrooms.map((classroom) => (
                                              <option key={classroom.id} value={classroom.id}>
                                                Aula {classroom.number}
                                              </option>
                                            ))}
                                          </select>
                                          <svg
                                            viewBox="0 0 16 16"
                                            fill="currentColor"
                                            data-slot="icon"
                                            aria-hidden="true"
                                            className={`pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 ${
                                              isReadOnly
                                                ? "text-gray-400"
                                                : ""
                                            }`}
                                          >
                                            <path
                                              d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                                              clipRule="evenodd"
                                              fillRule="evenodd"
                                            />
                                          </svg>
                                        </div>
                                      </div>
                                      <div className="flex items-end gap-2">
                                        {!isReadOnly && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveNewSchedule(
                                                newSchedule.tempId
                                              )
                                            }
                                            className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-red-900"
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={notifyUser}
                                  onChange={(e) =>
                                    setNotifyUser(e.target.checked)
                                  }
                                  disabled={isReadOnly}
                                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span
                                  className={`ml-2 text-sm ${
                                    isReadOnly
                                      ? "text-gray-500"
                                      : "text-gray-700"
                                  }`}
                                >
                                  Notificar al estudiante por correo electrónico
                                </span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Action buttons */}
                  <div className="shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Cerrar
                      </button>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={handleSaveClick}
                          disabled={isSaving}
                          className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? "Guardando..." : "Guardar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Conflict Warning Dialog */}
      <Dialog
        open={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon className="size-6 text-yellow-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
                    Conflicto de Horario Detectado
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {conflictInfo?.classroom?.display_name} ya tiene horarios asignados en este día:
                    </p>
                    <div className="mt-3 space-y-2">
                      {conflictInfo?.conflicts.map((conflict) => (
                        <div
                          key={conflict.schedule_id}
                          className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm"
                        >
                          <p className="font-medium text-gray-900">
                            {conflict.course_name} ({conflict.course_code})
                          </p>
                          <p className="text-gray-600">
                            Estudiante: {conflict.student_name}
                          </p>
                          {conflict.professor_name && (
                            <p className="text-gray-600">
                              Profesor: {conflict.professor_name}
                            </p>
                          )}
                          <p className="text-gray-600">
                            Horario: {conflict.hour || "Sin hora"}{" "}
                            {conflict.end_hour && `- ${conflict.end_hour}`}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                      Puedes continuar con la asignación si así lo deseas.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowConflictDialog(false)}
                  className="inline-flex w-full justify-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-yellow-500 sm:ml-3 sm:w-auto"
                >
                  Entendido, continuar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Reset the classroom selection
                    if (conflictInfo?.scheduleId !== undefined) {
                      handleEditScheduleChange(conflictInfo.scheduleId, "classroom_id", null);
                    } else if (conflictInfo?.tempId !== undefined) {
                      handleNewScheduleChange(conflictInfo.tempId, "classroom_id", null);
                    }
                    setShowConflictDialog(false);
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancelar selección
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleSaveCancel}
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
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 sm:mx-0 sm:size-10">
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 text-blue-900"
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
                      ¿Estás seguro de que deseas guardar los cambios en los
                      horarios?
                    </p>
                    {!notifyUser && (
                      <p className="mt-3 text-sm font-bold text-red-900">
                        ⚠️ El estudiante NO será notificado por correo
                        electrónico si no se marca la casilla de notificación.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isSaving ? "Guardando..." : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCancel}
                  disabled={isSaving}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
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
                          ¡Operación exitosa!
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Los cambios se han guardado correctamente.
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
                          Error
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

export default CourseEnrollmentScheduleDrawer;
