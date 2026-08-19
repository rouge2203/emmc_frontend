export interface PointerPosition {
  x: number;
  y: number;
}

/**
 * Horizontal travel (px) a press must exceed before it counts as a drag rather
 * than a click. Below it the grid must stay hands-off — no pointer capture, no
 * click suppression — or cells never open their editors.
 */
export const DRAG_THRESHOLD_PX = 4;

export function hasCrossedDragThreshold(
  start: PointerPosition,
  current: PointerPosition,
): boolean {
  return Math.abs(current.x - start.x) >= DRAG_THRESHOLD_PX;
}

export function nextHorizontalScrollLeft(
  initialScrollLeft: number,
  start: PointerPosition,
  current: PointerPosition,
): number {
  return initialScrollLeft - (current.x - start.x);
}
