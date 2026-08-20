import { describe, expect, it } from "vitest";
import { isValidCedula, normalizeCedula } from "./cedula";

describe("normalizeCedula", () => {
  it("leaves a plain 9-digit cédula unchanged", () => {
    expect(normalizeCedula("123456789")).toBe("123456789");
  });

  it("strips dashes", () => {
    expect(normalizeCedula("1-2345-6789")).toBe("123456789");
  });

  it("strips spaces", () => {
    expect(normalizeCedula("1 2345 6789")).toBe("123456789");
  });

  it("is idempotent", () => {
    const once = normalizeCedula("1-2345-6789");
    expect(normalizeCedula(once)).toBe(once);
  });
});

describe("isValidCedula", () => {
  it("accepts a plain 9-digit cédula", () => {
    expect(isValidCedula("123456789")).toBe(true);
  });

  it("accepts a 9-digit cédula with dashes", () => {
    expect(isValidCedula("1-2345-6789")).toBe(true);
  });

  it("accepts a 9-digit cédula with spaces", () => {
    expect(isValidCedula("1 2345 6789")).toBe(true);
  });

  it("accepts a 12-digit DIMEX", () => {
    expect(isValidCedula("123456789012")).toBe(true);
  });

  it("rejects 8 digits", () => {
    expect(isValidCedula("12345678")).toBe(false);
  });

  it("rejects letters", () => {
    expect(isValidCedula("12345678A")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidCedula("")).toBe(false);
  });
});
