import { describe, expect, it } from "vitest";
import {
  formatGrade,
  isPartialGradeInput,
  parseGradeInput,
  validateGrade,
} from "./grades";

describe("formatGrade", () => {
  it("writes decimals with a comma", () => {
    expect(formatGrade(7.5)).toBe("7,5");
  });

  it("drops the decimal on a whole number", () => {
    expect(formatGrade(10)).toBe("10");
    expect(formatGrade(10.0)).toBe("10");
  });

  it("accepts the string the API sends for a decimal column", () => {
    expect(formatGrade("8.5")).toBe("8,5");
  });

  it("falls back for a missing grade", () => {
    expect(formatGrade(null)).toBe("—");
    expect(formatGrade(undefined)).toBe("—");
    expect(formatGrade("")).toBe("—");
  });

  it("uses a caller-supplied fallback", () => {
    expect(formatGrade(null, "Sin calificar")).toBe("Sin calificar");
  });

  it("rounds to one decimal", () => {
    expect(formatGrade(7.46)).toBe("7,5");
  });
});

describe("parseGradeInput", () => {
  it("reads a comma decimal", () => {
    expect(parseGradeInput("7,5")).toBe(7.5);
  });

  it("reads a dot decimal", () => {
    expect(parseGradeInput("7.5")).toBe(7.5);
  });

  it("reads a whole number", () => {
    expect(parseGradeInput("8")).toBe(8);
  });

  it("treats an empty field as clearing the grade", () => {
    expect(parseGradeInput("")).toBeNull();
    expect(parseGradeInput("   ")).toBeNull();
  });
});

describe("isPartialGradeInput", () => {
  it("allows a trailing separator while typing 7,5", () => {
    expect(isPartialGradeInput("7")).toBe(true);
    expect(isPartialGradeInput("7,")).toBe(true);
    expect(isPartialGradeInput("7,5")).toBe(true);
  });

  it("allows an empty field", () => {
    expect(isPartialGradeInput("")).toBe(true);
  });

  it("rejects a second decimal", () => {
    expect(isPartialGradeInput("7,55")).toBe(false);
  });

  it("rejects letters and signs", () => {
    expect(isPartialGradeInput("abc")).toBe(false);
    expect(isPartialGradeInput("-1")).toBe(false);
  });
});

describe("validateGrade", () => {
  it("accepts a value inside the range", () => {
    expect(validateGrade("7,5", 10, "la semana 2")).toBeNull();
  });

  it("accepts an empty field", () => {
    expect(validateGrade("", 10, "la semana 2")).toBeNull();
  });

  it("names the week when the value is out of range", () => {
    expect(validateGrade("11", 10, "la semana 2")).toBe(
      "La nota de la semana 2 debe estar entre 0 y 10.",
    );
  });

  it("contracts de + el into del", () => {
    expect(validateGrade("10000", 10, 'el recital "Recital 1"')).toBe(
      'La nota del recital "Recital 1" debe estar entre 0 y 10.',
    );
  });

  it("rejects more than one decimal", () => {
    expect(validateGrade("7,55", 10, "la semana 2")).toBe(
      "La nota de la semana 2 solo admite un decimal. Por ejemplo: 7,5.",
    );
  });

  it("rejects a non-number", () => {
    expect(validateGrade("abc", 10, "la semana 2")).toBe(
      "La nota de la semana 2 debe ser un número.",
    );
  });

  it("shows a decimal maximum with a comma", () => {
    expect(validateGrade("9", 7.5, "la semana 1")).toBe(
      "La nota de la semana 1 debe estar entre 0 y 7,5.",
    );
  });

  it("matches the backend message for the reported 10000 recital bug", () => {
    expect(validateGrade("10000", 10, 'el recital "Recital de fin de curso"')).toBe(
      'La nota del recital "Recital de fin de curso" debe estar entre 0 y 10.',
    );
  });
});
