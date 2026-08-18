export type DayCode = "L" | "K" | "M" | "J" | "V" | "S" | "D";
export const DAY_ORDER: DayCode[] = ["L", "K", "M", "J", "V", "S", "D"];
export const DAY_LABELS: Record<DayCode, string> = {
  L: "Lunes",
  K: "Martes",
  M: "Miércoles",
  J: "Jueves",
  V: "Viernes",
  S: "Sábado",
  D: "Domingo",
};

/** One Course_Enrollment_Schedule row (or one not yet created). Times are minutes since midnight. */
export interface Slot {
  scheduleId: number | null; // null only transiently while a POST is queued/in flight
  day: DayCode | null;
  start: number | null;
  end: number | null;
  classroomId: number | null;
}
export interface GridRow {
  enrollmentId: number;
  studentName: string; // student_full_name from the API ("Apellido Nombre")
  studentFirst: string;
  studentLast: string;
  carnet: string | null;
  courseId: number; // assigned_course?.id ?? course.id  (group-class key)
  courseCode: string; // same rule (assigned_course if set, else course)
  courseName: string;
  baseCourseCode: string; // always course.code (backend search parity)
  baseCourseName: string;
  careerName: string | null; // course.career_name
  year: number;
  period: number;
  periodDisplay: string;
  professorId: number | null;
  professorName: string | null; // professor_full_name
  slots: [Slot | null, Slot | null, Slot | null];
  extraSchedules: Slot[]; // schedules beyond the first 3 (read-only "+N más")
  notificationPending: boolean;
}
export type ColKey = "prof" | "t0" | "a0" | "t1" | "a1" | "t2" | "a2";
export const COL_ORDER: ColKey[] = ["prof", "t0", "a0", "t1", "a1", "t2", "a2"];
export type SlotIndex = 0 | 1 | 2;
/** Only meaningful for the t0/t1/t2 and a0/a1/a2 columns. */
export const colSlotIndex = (c: ColKey): SlotIndex => Number(c[1]) as SlotIndex;
export interface CellAddress {
  enrollmentId: number;
  col: ColKey;
}
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "hint";
export interface CellSaveState {
  status: SaveStatus;
  message?: string;
  at: number;
}
// "tabNext"/"tabPrev" are Tab/Shift+Tab commits: they wrap at row edges (via
// tabTarget) instead of clamping like the arrow directions.
export type MoveDir = "down" | "up" | "right" | "left" | "none" | "tabNext" | "tabPrev";
export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
}
export interface Classroom {
  id: number;
  number: number;
  name: string;
  display_name: string;
}
export interface TimeRangeValue {
  day: DayCode;
  start: number;
  end: number;
}

// API DTOs (subset actually used by the grid; new backend fields are OPTIONAL so an older backend still works)
export interface ApiSchedule {
  id: number;
  day: string;
  hour: string | null;
  end_hour: string | null;
  classroom_id: number | null;
  classroom?: string | null;
  classroom_name?: string | null;
}
export interface ApiEnrollment {
  id: number;
  course: { id: number; code: string; name: string; career_name: string | null };
  assigned_course: { id: number; code: string; name: string } | null;
  student: { id: number; first_name: string; last_name: string };
  student_full_name: string;
  student_carnet: string | null;
  professor: { id: number; first_name: string; last_name: string } | null;
  professor_full_name: string | null;
  year: number;
  period: number;
  period_display: string;
  status: string;
  schedule_set: boolean;
  schedules?: ApiSchedule[] | null;
  schedule_notification_pending?: boolean;
  schedule_notified_at?: string | null;
}
