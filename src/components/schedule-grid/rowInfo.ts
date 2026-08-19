import type { GridRow } from "./types";

type CourseSummaryRow = Pick<GridRow, "courseCode" | "courseName" | "period">;

const PERIOD_ROMAN = ["", "I", "II", "III"];
const periodRoman = (period: number): string => PERIOD_ROMAN[period] ?? String(period);

export function formatGridRowCourseSummary(row: CourseSummaryRow): string {
  return `${row.courseCode} · Período ${periodRoman(row.period)}`;
}
