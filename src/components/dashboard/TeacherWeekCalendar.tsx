import { Link } from "react-router-dom";
import { ClockIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { PiStudent, PiChalkboardTeacher } from "react-icons/pi";

/**
 * A week of classes, drawn as the same seven-column board the admin
 * "Calendario de cursos" uses: one column per day, one card per class.
 *
 * From `sm` up that board is a grid that scrolls sideways when many days are
 * visible. Below `sm` there are no columns at all: the week stacks, each day
 * becoming a full-width block, so a card has the whole screen to breathe and
 * the page never scrolls sideways.
 */

export interface WeekCalendarEvent {
  id: number;
  day: string;
  day_name: string;
  day_order: number;
  hour: string | null;
  end_hour: string | null;
  classroom: string | null;
  course_name: string | null;
  course_code: string | null;
  /** Shown on a teacher's board — who is sitting in that class. */
  student_name?: string | null;
  /** Shown on a student's board — who teaches it. */
  professor_name?: string | null;
  enrollment_id: number;
}

/** Whose week is on screen: decides the person line and where a card links. */
export type WeekCalendarAudience = "teacher" | "student";

/** Monday-first, matching how the school reads a timetable. */
const DAYS: { code: string; name: string }[] = [
  { code: "L", name: "Lunes" },
  { code: "K", name: "Martes" },
  { code: "M", name: "Miércoles" },
  { code: "J", name: "Jueves" },
  { code: "V", name: "Viernes" },
  { code: "S", name: "Sábado" },
  { code: "D", name: "Domingo" },
];

/**
 * Written out so Tailwind sees every class it has to generate. The board is
 * only a grid from `sm` up — on a phone the same markup falls back to a stack.
 */
const SM_GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
  7: "sm:grid-cols-7",
};

/** One colour per course, stable across the week so a class is recognisable. */
const eventColors = [
  { bg: "bg-blue-50", hover: "hover:bg-blue-100", text: "text-blue-700", textLight: "text-blue-600" },
  { bg: "bg-green-50", hover: "hover:bg-green-100", text: "text-green-700", textLight: "text-green-600" },
  { bg: "bg-purple-50", hover: "hover:bg-purple-100", text: "text-purple-700", textLight: "text-purple-600" },
  { bg: "bg-pink-50", hover: "hover:bg-pink-100", text: "text-pink-700", textLight: "text-pink-600" },
  { bg: "bg-yellow-50", hover: "hover:bg-yellow-100", text: "text-yellow-700", textLight: "text-yellow-600" },
  { bg: "bg-indigo-50", hover: "hover:bg-indigo-100", text: "text-indigo-700", textLight: "text-indigo-600" },
];

function formatTime(hour: string | null): string {
  if (!hour) return "Sin hora";
  const [hours, minutes] = hour.split(":").map(Number);
  if (Number.isNaN(hours)) return hour;
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 || 12;
  return `${display}:${String(minutes ?? 0).padStart(2, "0")} ${suffix}`;
}

function timeRange(event: WeekCalendarEvent): string {
  if (!event.hour) return "Sin hora";
  return event.end_hour
    ? `${formatTime(event.hour)} – ${formatTime(event.end_hour)}`
    : formatTime(event.hour);
}

export default function TeacherWeekCalendar({
  events,
  audience = "teacher",
}: {
  events: WeekCalendarEvent[];
  /** Defaults to the teacher's board: student name and link to /teacher/course. */
  audience?: WeekCalendarAudience;
}) {
  const isStudentBoard = audience === "student";
  const PersonIcon = isStudentBoard ? PiChalkboardTeacher : PiStudent;
  const courseHref = isStudentBoard ? "/student/course" : "/teacher/course";

  // A colour per course code, assigned in the order courses first appear.
  const colorByCourse = new Map<string, number>();
  for (const event of events) {
    const key = event.course_code ?? String(event.enrollment_id);
    if (!colorByCourse.has(key)) {
      colorByCourse.set(key, colorByCourse.size % eventColors.length);
    }
  }

  const byDay = DAYS.map((day) => ({
    ...day,
    events: events
      .filter((e) => e.day === day.code || e.day_name === day.name)
      .sort((a, b) => (a.hour ?? "").localeCompare(b.hour ?? "")),
  }));

  // Weekends only earn a column when something is actually scheduled on them.
  const visibleDays = byDay.filter(
    (d) => !["S", "D"].includes(d.code) || d.events.length > 0,
  );

  if (events.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-gray-500">
          No hay clases programadas en este período.
        </p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <div className="sm:overflow-x-auto">
        <div className="align-middle sm:inline-block sm:min-w-full">
          <div
            className={`divide-y divide-gray-200 sm:grid sm:divide-x sm:divide-y-0 ${
              SM_GRID_COLS[visibleDays.length] || "sm:grid-cols-5"
            }`}
          >
            {visibleDays.map((day) => {
              const isEmpty = day.events.length === 0;
              return (
                <div key={day.code} className="flex flex-col sm:min-w-40">
                  {/* One tidy line on a phone; the stacked column header from `sm` up. */}
                  <div className="flex items-baseline gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 sm:block sm:py-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {day.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {day.events.length === 1
                        ? "1 clase"
                        : `${day.events.length} clases`}
                    </p>
                  </div>

                  {/* An empty day says its piece in the header alone on a phone. */}
                  <div
                    className={`flex-1 space-y-2 p-2 ${
                      isEmpty ? "hidden sm:block" : ""
                    }`}
                  >
                    {isEmpty ? (
                      <p className="py-4 text-center text-xs text-gray-400">
                        Sin clases
                      </p>
                    ) : (
                      day.events.map((event) => {
                        const colors =
                          eventColors[
                            colorByCourse.get(
                              event.course_code ?? String(event.enrollment_id),
                            ) ?? 0
                          ];
                        return (
                          <Link
                            key={event.id}
                            to={`${courseHref}/${event.enrollment_id}`}
                            className={`block rounded-lg border border-gray-200 ${colors.bg} ${colors.hover} p-3 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                          >
                            <p
                              translate="no"
                              className={`font-semibold ${colors.text}`}
                            >
                              {event.course_code ?? "Sin código"}
                            </p>

                            {/* Side by side while there is room, stacked in a column. */}
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 sm:block sm:space-y-1">
                              <div className="flex items-center gap-2">
                                <ClockIcon
                                  className={`h-4 w-4 shrink-0 ${colors.textLight}`}
                                />
                                <span className={`text-xs ${colors.textLight}`}>
                                  {timeRange(event)}
                                </span>
                              </div>

                              <div className="flex min-w-0 items-center gap-2">
                                <PersonIcon
                                  className={`h-4 w-4 shrink-0 ${colors.textLight}`}
                                />
                                <span
                                  className={`min-w-0 text-xs break-words sm:truncate ${colors.textLight}`}
                                >
                                  {isStudentBoard
                                    ? (event.professor_name ?? "Sin profesor")
                                    : (event.student_name ?? "Sin estudiante")}
                                </span>
                              </div>

                              {event.classroom && (
                                <div className="flex items-center gap-2">
                                  <MapPinIcon
                                    className={`h-4 w-4 shrink-0 ${colors.textLight}`}
                                  />
                                  <span
                                    className={`text-xs ${colors.textLight}`}
                                  >
                                    {event.classroom}
                                  </span>
                                </div>
                              )}
                            </div>
                          </Link>
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
  );
}
