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
  { keys: ["↑", "↓", "←", "→"], label: "mover entre celdas" },
  { keys: ["Enter", "F2"], label: "editar" },
  { keys: ["Escribir"], label: "editar (día, hora, profesor…)" },
  { keys: ["Supr", "⌫"], label: "borrar (profesor / horario / aula)" },
  { keys: ["Deshacer"], label: "disponible al borrar" },
];

// Once a cell is open (its select/s in edit mode):
const CELL_SHORTCUTS: Shortcut[] = [
  { keys: ["↑", "↓"], label: "cambia el valor del select" },
  { keys: ["←", "→", "Tab"], label: "pasa al siguiente select" },
  { keys: ["Enter"], label: "guarda y baja" },
  { keys: ["Tab", "⇧Tab"], label: "guarda y avanza / retrocede" },
  { keys: ["Esc"], label: "cancela" },
  { keys: ["1", "0"], label: "en Horario: escribe la hora (1 y 0 = 10)" },
  { keys: ["a", "p"], label: "en Horario: AM / PM" },
  { keys: ["L", "K", "M", "J", "V", "S", "D"], label: "en Horario: día" },
];

export default function KeyboardLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={open ? "rounded-md border border-gray-200 bg-gray-50" : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex h-9 items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 ${
          open ? "w-full px-3" : ""
        }`}
      >
        <ChevronDownIcon
          className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
        Atajos de teclado
      </button>
      {open && (
        <div className="px-3 pb-2.5 text-xs text-gray-600">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
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
          <div className="mt-2 border-t border-gray-200 pt-2">
            <span className="mr-2 font-medium text-gray-500">Dentro de una celda:</span>
            <span className="inline-flex flex-wrap gap-x-4 gap-y-1.5">
              {CELL_SHORTCUTS.map((shortcut, i) => (
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
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
