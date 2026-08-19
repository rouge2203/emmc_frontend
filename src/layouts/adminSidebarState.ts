export const SCHEDULE_ASSIGNMENT_PATH = "/admin/asignacion-de-horarios";

export interface DesktopSidebarState {
  expanded: boolean;
  preferredExpanded: boolean;
}

interface RouteChangeArgs extends DesktopSidebarState {
  previousPath: string;
  nextPath: string;
}

interface ToggleArgs extends DesktopSidebarState {
  path: string;
}

export const initialDesktopSidebarState = (path: string): DesktopSidebarState => ({
  expanded: path !== SCHEDULE_ASSIGNMENT_PATH,
  preferredExpanded: true,
});

export const sidebarStateAfterRouteChange = ({
  previousPath,
  nextPath,
  expanded,
  preferredExpanded,
}: RouteChangeArgs): DesktopSidebarState => {
  if (nextPath === SCHEDULE_ASSIGNMENT_PATH && previousPath !== nextPath) {
    return { expanded: false, preferredExpanded };
  }
  if (previousPath === SCHEDULE_ASSIGNMENT_PATH && nextPath !== previousPath) {
    return { expanded: preferredExpanded, preferredExpanded };
  }
  return { expanded, preferredExpanded };
};

export const createSidebarRouteChangeUpdater =
  (previousPath: string, nextPath: string) =>
  (current: DesktopSidebarState): DesktopSidebarState =>
    sidebarStateAfterRouteChange({
      previousPath,
      nextPath,
      ...current,
    });

export const sidebarStateAfterToggle = ({
  path,
  expanded,
  preferredExpanded,
}: ToggleArgs): DesktopSidebarState => {
  const nextExpanded = !expanded;
  return {
    expanded: nextExpanded,
    preferredExpanded:
      path === SCHEDULE_ASSIGNMENT_PATH ? preferredExpanded : nextExpanded,
  };
};
