interface NativeSelectPicker {
  focus: (options?: FocusOptions) => void;
  showPicker?: () => void;
}

export function openNativeSelectPicker(
  renderSynchronously: () => void,
  findSelect: () => NativeSelectPicker | null,
): boolean {
  renderSynchronously();
  const select = findSelect();
  if (!select) return false;

  select.focus({ preventScroll: true });
  try {
    select.showPicker?.();
  } catch {
    // Unsupported or blocked browsers still leave the native select focused.
  }
  return true;
}
