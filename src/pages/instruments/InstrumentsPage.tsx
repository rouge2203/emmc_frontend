import { useState } from "react";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";

import PianoKeyboard from "../../components/instruments/PianoKeyboard";
import Metronome from "../../components/instruments/Metronome";
import DrumKit from "../../components/instruments/DrumKit";

type InstrumentTab = "piano" | "metronomo" | "bateria";

const tabs: { id: InstrumentTab; label: string }[] = [
  { id: "piano", label: "Piano" },
  { id: "metronomo", label: "Metrónomo" },
  { id: "bateria", label: "Batería" },
];

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const InstrumentsPage = () => {
  const [activeTab, setActiveTab] = useState<InstrumentTab>("piano");

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8 short:max-w-none short:px-2 short:py-2">
      <div className="flex items-center gap-3 short:hidden">
        <MusicalNoteIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Instrumentos</h1>
          <p className="text-sm text-gray-600">
            Practica con el piano, el metrónomo y la batería.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 sm:mt-6 short:mt-0">
        <div
          role="tablist"
          aria-label="Instrumentos"
          className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm short:p-0.5"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`instrument-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls="instrument-panel"
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-primary",
                  "touch-manipulation rounded-md px-4 py-2 text-sm font-semibold transition short:px-3 short:py-1.5"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="instrument-panel"
        role="tabpanel"
        aria-labelledby={`instrument-tab-${activeTab}`}
        className={classNames(
          "mt-3 rounded-2xl bg-[#0f1419] shadow-lg sm:mt-4 short:mt-2 short:rounded-xl",
          activeTab === "bateria"
            ? "p-1.5 sm:p-3 lg:p-4 short:p-0.5"
            : "p-3 sm:p-6 short:p-2",
        )}
      >
        {activeTab === "piano" && <PianoKeyboard />}
        {activeTab === "metronomo" && <Metronome />}
        {activeTab === "bateria" && <DrumKit />}
      </div>
    </div>
  );
};

export default InstrumentsPage;
