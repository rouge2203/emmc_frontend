import { describe, expect, it } from "vitest";
import { horarioTargetChain, resolveHorarioEditorTarget } from "./horarioEditorTarget";

describe("resolveHorarioEditorTarget", () => {
  it.each([
    ["L", "day", "day"],
    ["L", "aula", "aula"],
    ["L", "start", "start"],
    ["L", "startMinute", "startMinute"],
    ["L", "end", "end"],
    ["L", "endMinute", "endMinute"],
  ] as const)("opens %s-day horario target %s as %s", (day, requested, expected) => {
    expect(resolveHorarioEditorTarget(day, requested)).toBe(expected);
  });

  it.each([
    ["aula", "day"],
    ["start", "day"],
    ["end", "day"],
    ["startMinute", "day"],
    ["endMinute", "day"],
  ] as const)("redirects %s to day when no day is assigned", (requested, expected) => {
    expect(resolveHorarioEditorTarget(null, requested)).toBe(expected);
  });
});

describe("horarioTargetChain", () => {
  it("opens exactly what was clicked when nothing stands in the way", () => {
    expect(horarioTargetChain("day")).toEqual(["day"]);
    expect(horarioTargetChain("start")).toEqual(["start"]);
  });

  it("falls back from minutos to its own hora, not the other group's", () => {
    expect(horarioTargetChain("startMinute")).toEqual(["startMinute", "start"]);
    expect(horarioTargetChain("endMinute")).toEqual(["endMinute", "end", "start"]);
  });

  it("falls back from a disabled aula to hora inicio", () => {
    expect(horarioTargetChain("aula")).toEqual(["aula", "start"]);
  });

  it("never loops", () => {
    for (const t of ["day", "aula", "start", "startMinute", "end", "endMinute"] as const) {
      const chain = horarioTargetChain(t);
      expect(new Set(chain).size).toBe(chain.length);
    }
  });
});
