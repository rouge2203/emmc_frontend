import { describe, expect, it } from "vitest";
import {
  createSidebarRouteChangeUpdater,
  initialDesktopSidebarState,
  sidebarStateAfterRouteChange,
  sidebarStateAfterToggle,
} from "./adminSidebarState";

describe("initialDesktopSidebarState", () => {
  it("starts collapsed on Asignación de Horarios without changing the preference", () => {
    expect(initialDesktopSidebarState("/admin/asignacion-de-horarios")).toEqual({
      expanded: false,
      preferredExpanded: true,
    });
  });

  it("starts expanded on other admin pages", () => {
    expect(initialDesktopSidebarState("/admin/dashboard")).toEqual({
      expanded: true,
      preferredExpanded: true,
    });
  });
});

describe("sidebarStateAfterRouteChange", () => {
  it("captures the previous path before React runs a deferred state update", () => {
    let previousPath = "/admin/dashboard";
    const update = createSidebarRouteChangeUpdater(
      previousPath,
      "/admin/asignacion-de-horarios",
    );

    previousPath = "/admin/asignacion-de-horarios";

    expect(
      update({ expanded: true, preferredExpanded: true }),
    ).toEqual({ expanded: false, preferredExpanded: true });
  });

  it("auto-collapses when entering Asignación de Horarios", () => {
    expect(
      sidebarStateAfterRouteChange({
        previousPath: "/admin/dashboard",
        nextPath: "/admin/asignacion-de-horarios",
        expanded: true,
        preferredExpanded: true,
      }),
    ).toEqual({ expanded: false, preferredExpanded: true });
  });

  it("restores the user's previous preference when leaving", () => {
    expect(
      sidebarStateAfterRouteChange({
        previousPath: "/admin/asignacion-de-horarios",
        nextPath: "/admin/dashboard",
        expanded: false,
        preferredExpanded: true,
      }),
    ).toEqual({ expanded: true, preferredExpanded: true });
  });

  it("restores a collapsed preference when leaving", () => {
    expect(
      sidebarStateAfterRouteChange({
        previousPath: "/admin/asignacion-de-horarios",
        nextPath: "/admin/dashboard",
        expanded: true,
        preferredExpanded: false,
      }),
    ).toEqual({ expanded: false, preferredExpanded: false });
  });
});

describe("sidebarStateAfterToggle", () => {
  it("updates the preference on regular pages", () => {
    expect(
      sidebarStateAfterToggle({
        path: "/admin/dashboard",
        expanded: true,
        preferredExpanded: true,
      }),
    ).toEqual({ expanded: false, preferredExpanded: false });
  });

  it("allows expanding on Asignación without overwriting the previous preference", () => {
    expect(
      sidebarStateAfterToggle({
        path: "/admin/asignacion-de-horarios",
        expanded: false,
        preferredExpanded: false,
      }),
    ).toEqual({ expanded: true, preferredExpanded: false });
  });
});
