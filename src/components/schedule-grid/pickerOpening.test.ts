import { describe, expect, it, vi } from "vitest";
import { openNativeSelectPicker } from "./pickerOpening";

describe("openNativeSelectPicker", () => {
  it("renders the native select before opening its picker", () => {
    const calls: string[] = [];
    const focus = vi.fn(() => calls.push("focus"));
    const showPicker = vi.fn(() => calls.push("showPicker"));

    openNativeSelectPicker(
      () => calls.push("render"),
      () => {
        calls.push("find");
        return { focus, showPicker };
      },
    );

    expect(calls).toEqual(["render", "find", "focus", "showPicker"]);
  });
});
