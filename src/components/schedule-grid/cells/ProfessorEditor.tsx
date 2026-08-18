// Hand-rolled combobox for editing a matrícula's professor, mounted inside the
// professor cell in edit mode. Modeled on the drawer's professor search but
// keyboard-first and Excel-flavored: type to filter, Up/Down to highlight,
// Enter/Tab to commit-and-move, Escape to cancel. It never clears the value on
// blur — a blur only commits when the text unambiguously matches one teacher.
//
// The parent (useGridNavigation) unmounts this the moment we commit or cancel,
// so a doneRef guards against a second terminal action (e.g. the input's blur
// firing as Enter unmounts us).
import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { normalize } from "../filters";
import { resolveComboboxCommit } from "../comboboxCommit";
import type { MoveDir, Teacher } from "../types";

export interface ProfessorEditorProps {
  current: { id: number; name: string } | null;
  teachers: Teacher[];
  seed: string | null;
  onCommit: (teacherId: number | null, move: MoveDir) => void;
  onCancel: (move: MoveDir) => void;
}

const teacherLabel = (t: Teacher): string => `${t.last_name} ${t.first_name}`.trim();

export default function ProfessorEditor({
  current,
  teachers,
  seed,
  onCommit,
  onCancel,
}: ProfessorEditorProps) {
  // Prefill the current professor's name when opening without a typed seed, so a
  // plain Enter re-commits the same value (→ cancel, no request). `null` when
  // the cell has no professor yet.
  const prefill = current?.name ?? null;
  const [text, setText] = useState<string>(seed ?? prefill ?? "");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  // Whether the user has moved the highlight with ↑/↓ (then Enter commits the
  // highlighted option even if the text still equals the prefill).
  const highlightMovedRef = useRef(false);

  // Autofocus. No seed (Enter/F2/dblclick) → select the prefilled name so the
  // next keystroke replaces it; a seed char was already typed → caret at end.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (seed === null) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => {
    const q = normalize(text);
    if (q === "") return teachers;
    return teachers.filter((t) => {
      const last = normalize(`${t.last_name} ${t.first_name}`);
      const first = normalize(`${t.first_name} ${t.last_name}`);
      return last.includes(q) || first.includes(q);
    });
  }, [teachers, text]);

  // Keep the highlight in range as the filtered list shrinks/grows.
  useEffect(() => {
    setHighlight((h) => (options.length === 0 ? 0 : Math.min(h, options.length - 1)));
  }, [options.length]);

  // Keep the highlighted option visible.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const finishCommit = (teacher: Teacher | null, move: MoveDir): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    const nextId = teacher ? teacher.id : null;
    // Same teacher as current → treat as a cancel (no request), but still move.
    if ((current?.id ?? null) === nextId) onCancel(move);
    else onCommit(nextId, move);
  };

  const finishCancel = (move: MoveDir): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel(move);
  };

  // Enter/Tab decision, shared with AulaEditor via resolveComboboxCommit:
  // unchanged prefill → cancel (no request); emptied text → clear (null);
  // arrow-navigated or matching query → select. A non-empty query with no match
  // is a dead-end: Enter stays put, but Tab/Shift+Tab cancel + move (never a
  // no-op with preventDefault).
  const commitFromKeyboard = (move: MoveDir): void => {
    const result = resolveComboboxCommit({
      text,
      prefill,
      highlightMoved: highlightMovedRef.current,
      options,
      highlight,
    });
    if (!result) {
      if (move === "tabNext" || move === "tabPrev") finishCancel(move);
      return; // Enter on "Sin resultados" → keep editing.
    }
    if (result.kind === "cancel") finishCancel(move);
    else if (result.kind === "clear") finishCommit(null, move);
    else finishCommit(result.option, move);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        highlightMovedRef.current = true;
        setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
        return;
      case "ArrowUp":
        e.preventDefault();
        highlightMovedRef.current = true;
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      case "Enter":
        e.preventDefault();
        commitFromKeyboard("down");
        return;
      case "Tab":
        e.preventDefault();
        commitFromKeyboard(e.shiftKey ? "tabPrev" : "tabNext");
        return;
      case "Escape":
        e.preventDefault();
        finishCancel("none");
        return;
      default:
        return;
    }
  };

  // Blur only commits when unambiguous; it never clears. Ignore blurs that stay
  // within the editor (e.g. clicking an option, which handles its own commit).
  const handleBlur = (e: FocusEvent<HTMLDivElement>): void => {
    if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
    if (doneRef.current) return;
    const related = e.relatedTarget as HTMLElement | null;
    const commit = (): void => {
      if (doneRef.current) return;
      const trimmed = text.trim();
      if (trimmed === (current?.name ?? "")) {
        finishCancel("none");
        return;
      }
      const q = normalize(text);
      const exact = teachers.filter(
        (t) =>
          normalize(`${t.last_name} ${t.first_name}`) === q ||
          normalize(`${t.first_name} ${t.last_name}`) === q,
      );
      if (exact.length === 1) finishCommit(exact[0], "none");
      else finishCancel("none");
    };
    // When focus leaves to a control OUTSIDE this editor and the grid (the
    // search box, a select, the Notify button), defer the commit so the
    // editor's synchronous unmount doesn't reparent focus back into the grid
    // and steal it from the control the user clicked. Blurs that land back in
    // the grid (e.g. clicking another cell) commit immediately.
    if (related && related !== document.body && !related.contains(rootRef.current as Node)) {
      setTimeout(commit, 0);
    } else {
      commit();
    }
  };

  return (
    <div ref={rootRef} data-editor className="relative" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setHighlight(0);
          highlightMovedRef.current = false;
        }}
        placeholder="Buscar profesor..."
        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      />
      <ul
        ref={listRef}
        role="listbox"
        className="absolute z-20 mt-1 w-72 max-h-64 overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black/5"
      >
        {options.length === 0 ? (
          <li className="px-3 py-2 text-sm text-gray-400 select-none">Sin resultados</li>
        ) : (
          options.map((t, idx) => {
            const highlighted = idx === highlight;
            return (
              <li
                key={t.id}
                data-idx={idx}
                role="option"
                aria-selected={highlighted}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus so blur doesn't fire first
                  finishCommit(t, "none");
                }}
                onMouseEnter={() => setHighlight(idx)}
                className={`cursor-pointer select-none px-3 py-1.5 text-sm ${
                  highlighted ? "bg-primary/10 text-gray-900" : "text-gray-700"
                }`}
              >
                {teacherLabel(t)}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
