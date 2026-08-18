import { describe, expect, it } from "vitest";
import { resolveComboboxCommit } from "./comboboxCommit";

interface Opt {
  id: number;
}
const opts = (...ids: number[]): Opt[] => ids.map((id) => ({ id }));

describe("resolveComboboxCommit", () => {
  it("cancels a plain Enter on an unchanged prefilled value (no request)", () => {
    // Aula "1" open on Enter: text === prefill, no navigation → cancel.
    expect(
      resolveComboboxCommit({
        text: "1",
        prefill: "1",
        highlightMoved: false,
        options: opts(10, 11),
        highlight: 0,
      }),
    ).toEqual({ kind: "cancel" });
  });

  it("ignores surrounding whitespace when comparing to the prefill", () => {
    expect(
      resolveComboboxCommit({
        text: "  Perez Ana  ",
        prefill: "Perez Ana",
        highlightMoved: false,
        options: opts(1),
        highlight: 0,
      }),
    ).toEqual({ kind: "cancel" });
  });

  it("selects the highlighted option once the user has arrow-navigated, even with unchanged text", () => {
    // Enter → ↓ → Enter: text still equals the prefill but the highlight moved.
    expect(
      resolveComboboxCommit({
        text: "1",
        prefill: "1",
        highlightMoved: true,
        options: opts(10, 11, 12),
        highlight: 1,
      }),
    ).toEqual({ kind: "select", option: { id: 11 } });
  });

  it("selects the highlighted option after arrow-navigation even when the text is empty", () => {
    expect(
      resolveComboboxCommit({
        text: "",
        prefill: null,
        highlightMoved: true,
        options: opts(5, 6),
        highlight: 0,
      }),
    ).toEqual({ kind: "select", option: { id: 5 } });
  });

  it("clears when the prefilled text was explicitly emptied (no navigation)", () => {
    expect(
      resolveComboboxCommit({
        text: "",
        prefill: "1",
        highlightMoved: false,
        options: opts(10, 11),
        highlight: 0,
      }),
    ).toEqual({ kind: "clear" });
  });

  it("clears an already-empty cell (prefill null, empty text)", () => {
    expect(
      resolveComboboxCommit({
        text: "   ",
        prefill: null,
        highlightMoved: false,
        options: opts(1, 2),
        highlight: 0,
      }),
    ).toEqual({ kind: "clear" });
  });

  it("selects the highlighted option for a changed, matching query", () => {
    expect(
      resolveComboboxCommit({
        text: "20",
        prefill: "1",
        highlightMoved: false,
        options: opts(200, 201),
        highlight: 0,
      }),
    ).toEqual({ kind: "select", option: { id: 200 } });
  });

  it("returns null for a non-empty query that matches nothing (Enter dead-end)", () => {
    expect(
      resolveComboboxCommit({
        text: "zzz",
        prefill: "1",
        highlightMoved: false,
        options: [],
        highlight: 0,
      }),
    ).toBeNull();
  });

  it("falls back to the text rules when navigation left an empty option list", () => {
    // highlightMoved but nothing to select → treat as an empty query → clear.
    expect(
      resolveComboboxCommit({
        text: "",
        prefill: "1",
        highlightMoved: true,
        options: [],
        highlight: 0,
      }),
    ).toEqual({ kind: "clear" });
  });
});
