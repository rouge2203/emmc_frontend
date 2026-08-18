// Segmented "Día hh:mm AM – hh:mm AM" editor, mounted inside a horario's time
// sub-cell in edit mode. It is a thin React shell over the pure reducer in
// timeEditor.ts: the reducer owns all typing/segment logic; this component only
// renders one span per segment and forwards KeyboardEvent.key into it.
//
// Keyboard-first and Excel-flavored: type to fill the segments, Enter/Tab to
// commit-and-move, Escape to cancel, arrows to nudge a segment. Validation is
// inline — an invalid range on commit paints the ring red and shows an error
// line under the cell instead of leaving the editor.
//
// The parent (useGridNavigation) unmounts this the moment we commit or cancel,
// so a doneRef guards against a second terminal action (e.g. the root's blur
// firing as Enter unmounts us).
import { useEffect, useReducer, useRef } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import {
  createEditorState,
  isChanged,
  keyOutcome,
  resolveDraft,
  segmentText,
  timeRangeReducer,
  type SegId,
  type TimeEditorInitial,
} from "../timeEditor";
import type { MoveDir, TimeRangeValue } from "../types";

export interface TimeRangeEditorProps {
  initial: TimeEditorInitial | null;
  seed: string | null;
  onCommit: (value: TimeRangeValue, move: MoveDir) => void;
  onCancel: (move: MoveDir, error?: string) => void;
}

// Visual order: [Día] [hh]:[mm] [AM] – [hh]:[mm] [AM]. The 7 real segments are
// data-seg spans; ':' and '–' are plain separators.
type LayoutItem =
  | { kind: "seg"; seg: SegId }
  | { kind: "sep"; text: string; key: string };

const LAYOUT: LayoutItem[] = [
  { kind: "seg", seg: "day" },
  { kind: "seg", seg: "sh" },
  { kind: "sep", text: ":", key: "colon-start" },
  { kind: "seg", seg: "sm" },
  { kind: "seg", seg: "sp" },
  { kind: "sep", text: "–", key: "dash" },
  { kind: "seg", seg: "eh" },
  { kind: "sep", text: ":", key: "colon-end" },
  { kind: "seg", seg: "em" },
  { kind: "seg", seg: "ep" },
];

export default function TimeRangeEditor({
  initial,
  seed,
  onCommit,
  onCancel,
}: TimeRangeEditorProps) {
  const [state, dispatch] = useReducer(timeRangeReducer, undefined, () =>
    createEditorState(initial, seed),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  // Focus the root so it receives keystrokes (there is no <input>; the div owns
  // the keyboard). Mount-only.
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const done = (): void => {
    doneRef.current = true;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const outcome = keyOutcome(e.key, e.shiftKey);
    if (outcome === "passthrough") return;

    if (outcome === "handled") {
      e.preventDefault();
      dispatch({ type: "key", key: e.key, shift: e.shiftKey });
      return;
    }

    if (outcome === "cancel") {
      e.preventDefault();
      done();
      onCancel("none");
      return;
    }

    // commit: Enter → down, Tab → next cell, Shift+Tab → previous cell. Tab
    // wraps at row edges like nav-mode Tab (tabTarget), not the clamping arrows.
    e.preventDefault();
    const dir: MoveDir = e.key === "Enter" ? "down" : e.shiftKey ? "tabPrev" : "tabNext";

    // Untouched or unchanged → cancel (no request), still move.
    if (!isChanged(state, initial)) {
      done();
      onCancel(dir);
      return;
    }

    const res = resolveDraft(state);
    if (res.ok) {
      done();
      onCommit(res.value, dir);
    } else {
      // Invalid → surface the error and stay in the editor.
      dispatch({ type: "setError", error: res.error });
    }
  };

  // Blur only commits when the draft is valid; an invalid, touched draft reports
  // a transient error on the cell (the page shows it via setTransientError).
  const handleBlur = (e: FocusEvent<HTMLDivElement>): void => {
    if (doneRef.current) return;
    if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
    const related = e.relatedTarget as HTMLElement | null;
    const commit = (): void => {
      if (doneRef.current) return;
      if (!isChanged(state, initial)) {
        done();
        onCancel("none");
        return;
      }
      const res = resolveDraft(state);
      done();
      if (res.ok) onCommit(res.value, "none");
      else onCancel("none", `No se guardó: ${res.error}`);
    };
    // Defer the commit when focus leaves to a control OUTSIDE the editor/grid so
    // the synchronous unmount doesn't reparent focus back into the grid (see
    // ProfessorEditor for the full rationale). Blurs back into the grid commit now.
    if (related && related !== document.body && !related.contains(rootRef.current as Node)) {
      setTimeout(commit, 0);
    } else {
      commit();
    }
  };

  return (
    <>
      <div
        ref={rootRef}
        data-editor
        tabIndex={0}
        role="group"
        aria-label="Horario"
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`inline-flex items-center gap-0.5 font-mono text-sm outline-none rounded-sm px-1 ring-2 ring-inset bg-white ${
          state.error ? "ring-red-500" : "ring-primary"
        }`}
      >
        {LAYOUT.map((item) => {
          if (item.kind === "sep") {
            return (
              <span key={item.key} className="select-none px-0.5 text-gray-400">
                {item.text}
              </span>
            );
          }
          const { text, placeholder } = segmentText(state, item.seg);
          const isActive = state.active === item.seg;
          return (
            <span
              key={item.seg}
              data-seg={item.seg}
              onMouseDown={(e) => {
                // Keep the root focused; just move the active segment.
                e.preventDefault();
                dispatch({ type: "focusSegment", seg: item.seg });
              }}
              className={`cursor-text rounded-sm px-0.5 ${isActive ? "bg-primary/15" : ""} ${
                placeholder ? "text-gray-400" : "text-gray-900"
              }`}
            >
              {text}
            </span>
          );
        })}
      </div>
      {state.error && (
        <div className="absolute left-0 top-full z-20 mt-0.5 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[11px] text-red-600 shadow ring-1 ring-red-200">
          {state.error}
        </div>
      )}
    </>
  );
}
