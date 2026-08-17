// Collapsible "Atajos de teclado" legend shown under the filters card. Purely
// discoverability — it documents the grid's keyboard model (Tasks 9/10) so an
// admin can find the shortcuts without a manual. Defaults collapsed; a simple
// useState toggle (no Headless UI needed for a one-shot disclosure).
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["↑", "↓", "←", "→"], label: "mover" },
  { keys: ["Enter", "F2"], label: "editar" },
  { keys: ["Escribir"], label: "editar reemplazando" },
  { keys: ["Tab", "⇧Tab"], label: "guardar y avanzar / retroceder" },
  { keys: ["Enter"], label: "guardar y bajar" },
  { keys: ["Esc"], label: "cancelar" },
  { keys: ["Supr", "⌫"], label: "borrar (profesor / horario / aula)" },
  { keys: ["L", "K", "M", "J", "V", "S", "D"], label: "día (en un horario)" },
  { keys: ["0-9"], label: "hora (en un horario)" },
  { keys: ["a", "p"], label: "AM / PM (en un horario)" },
  { keys: ["↑", "↓"], label: "cambia día / hora / AM-PM (en un horario)" },
  { keys: ["Deshacer"], label: "disponible al borrar" },
];

export default function KeyboardLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
      >
        <ChevronDownIcon
          className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
        Atajos de teclado
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
          {SHORTCUTS.map((shortcut, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {shortcut.keys.map((key, j) => (
                <kbd
                  key={j}
                  className="rounded border border-gray-300 bg-white px-1 py-0.5 font-mono text-[10px] text-gray-700 shadow-sm"
                >
                  {key}
                </kbd>
              ))}
              <span>{shortcut.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
