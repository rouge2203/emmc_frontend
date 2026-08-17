// Hand-rolled combobox for picking a horario's aula (classroom), mounted inside
// an aula sub-cell in edit mode. Modeled exactly on ProfessorEditor: type to
// filter, Up/Down to highlight (wrapping), Enter/Tab to commit-and-move, Escape
// to cancel. Digits filter by classroom number (prefix), letters by name
// (accent-insensitive substring). It never clears on blur — a blur only commits
// when the text unambiguously matches one classroom.
//
// The parent unmounts this the moment we commit or cancel, so a doneRef guards
// against a second terminal action (e.g. the input's blur firing as Enter
// unmounts us).
import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { normalize } from "../filters";
import type { Classroom, MoveDir } from "../types";

export interface AulaEditorProps {
  current: number | null;
  classrooms: Classroom[];
  seed: string | null;
  onCommit: (classroomId: number | null, move: MoveDir) => void;
  onCancel: (move: MoveDir) => void;
}

const aulaLabel = (c: Classroom): string =>
  `Aula ${c.number}${c.name ? ` — ${c.name}` : ""}`;

/** Digits → number prefix match; anything else → accent-insensitive name substring. Empty → all. */
const filterClassrooms = (classrooms: Classroom[], text: string): Classroom[] => {
  const t = text.trim();
  if (t === "") return classrooms;
  if (/^\d+$/.test(t)) return classrooms.filter((c) => String(c.number).startsWith(t));
  const q = normalize(t);
  return classrooms.filter((c) => normalize(c.name).includes(q));
};

export default function AulaEditor({
  current,
  classrooms,
  seed,
  onCommit,
  onCancel,
}: AulaEditorProps) {
  const [text, setText] = useState<string>(seed ?? "");
  const [highlight, setHighlight] = useState<number>(() => {
    if (current === null) return 0;
    const idx = filterClassrooms(classrooms, seed ?? "").findIndex((c) => c.id === current);
    return idx >= 0 ? idx : 0;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  // Autofocus. No seed (Enter/F2/dblclick) → select the seed text (usually
  // empty); a seed char was already typed → caret at end.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (seed === null) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => filterClassrooms(classrooms, text), [classrooms, text]);

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

  const finishCommit = (classroomId: number | null, move: MoveDir): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    // Same aula as current → treat as a cancel (no request), but still move.
    if (classroomId === current) onCancel(move);
    else onCommit(classroomId, move);
  };

  const finishCancel = (move: MoveDir): void => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel(move);
  };

  // Enter/Tab: empty text → clear the aula (commit null); else commit the
  // highlighted option; else (a query with no match) stay put.
  const commitFromKeyboard = (move: MoveDir): void => {
    if (text.trim() === "") {
      finishCommit(null, move);
      return;
    }
    const option = options[highlight];
    if (option) finishCommit(option.id, move);
    // No match → keep editing (the "Sin resultados" row stays visible).
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlight((h) => (options.length === 0 ? 0 : (h + 1) % options.length));
        return;
      case "ArrowUp":
        e.preventDefault();
        setHighlight((h) =>
          options.length === 0 ? 0 : (h - 1 + options.length) % options.length,
        );
        return;
      case "Enter":
        e.preventDefault();
        commitFromKeyboard("down");
        return;
      case "Tab":
        e.preventDefault();
        commitFromKeyboard(e.shiftKey ? "left" : "right");
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
    const matches = filterClassrooms(classrooms, text);
    if (text.trim() !== "" && matches.length === 1) finishCommit(matches[0].id, "none");
    else finishCancel("none");
  };

  return (
    <div ref={rootRef} data-editor className="relative" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setHighlight(0);
        }}
        placeholder="Aula..."
        className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      />
      <ul
        ref={listRef}
        role="listbox"
        className="absolute z-20 mt-1 w-64 max-h-64 overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black/5"
      >
        {options.length === 0 ? (
          <li className="px-3 py-2 text-sm text-gray-400 select-none">Sin resultados</li>
        ) : (
          options.map((c, idx) => {
            const highlighted = idx === highlight;
            return (
              <li
                key={c.id}
                data-idx={idx}
                role="option"
                aria-selected={highlighted}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus so blur doesn't fire first
                  finishCommit(c.id, "none");
                }}
                onMouseEnter={() => setHighlight(idx)}
                className={`cursor-pointer select-none px-3 py-1.5 text-sm ${
                  highlighted ? "bg-primary/10 text-gray-900" : "text-gray-700"
                }`}
              >
                {aulaLabel(c)}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
