import { describe, expect, it } from "vitest";
import { formatGridRowCourseSummary } from "./rowInfo";

describe("formatGridRowCourseSummary", () => {
  it("shows the course code and period without the full course name", () => {
    expect(
      formatGridRowCourseSummary({
        courseCode: "MAT_PIANO",
        courseName: "Matrícula Piano",
        period: 2,
      }),
    ).toBe("MAT_PIANO · Período II");
  });
});
