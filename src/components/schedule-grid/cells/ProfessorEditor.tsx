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
  const [text, setText] = useState<string>(seed ?? current?.name ?? "");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

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

  // Enter/Tab: empty text → clear the professor; else commit the highlighted
  // option; else (a query with no match) stay put.
  const commitFromKeyboard = (move: MoveDir): void => {
    if (normalize(text) === "") {
      finishCommit(null, move);
      return;
    }
    const option = options[highlight];
    if (option) finishCommit(option, move);
    // No match → keep editing (the "Sin resultados" row stays visible).
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
        return;
      case "ArrowUp":
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
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

  return (
    <div ref={rootRef} data-editor className="relative" onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setHighlight(0);
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
