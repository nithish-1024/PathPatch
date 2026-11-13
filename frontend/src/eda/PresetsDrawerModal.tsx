import React, { useState } from "react";
import { Folder, FolderOpen, Sparkles, X, Zap } from "lucide-react";
import { EDA_PRESETS, type EdaPreset } from "./presets";

interface PresetsDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
}

const PRESET_CATEGORIES = [
  { id: "all", label: "All Syllabus Presets" },
  { id: "analog", label: "Analog & Linear ICs (LM741)" },
  { id: "signals", label: "Signals & Filters" },
  { id: "digital", label: "Digital Logic (74xx)" },
  { id: "power", label: "Power & Rectification" },
  { id: "timing", label: "Timing & Oscillators (555)" },
];

export const PresetsDrawerModal: React.FC<PresetsDrawerModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  // Filter out blank_canvas from the example circuits list so only actual circuits show up
  const examplePresets = EDA_PRESETS.filter((p) => p.id !== "blank_canvas");

  const filtered = examplePresets.filter((p) => {
    const matchesCat =
      selectedCategory === "all" ||
      (selectedCategory === "analog" && (p.id.includes("opamp") || p.id.includes("bjt"))) ||
      (selectedCategory === "signals" && p.id.includes("filter")) ||
      (selectedCategory === "digital" && (p.id.includes("adder") || p.id.includes("digital"))) ||
      (selectedCategory === "power" && (p.id.includes("rectifier") || p.id.includes("power") || p.id.includes("snubber"))) ||
      (selectedCategory === "timing" && p.id.includes("555"));

    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.badge.toLowerCase().includes(search.toLowerCase());

    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FolderOpen size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Syllabus Circuit Library & Preset Folders
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {examplePresets.length} Verified Circuits
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pre-wired university syllabus circuits. Click any card to load it directly onto your workbench.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Category Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Search syllabus presets by name, IC, or concept (e.g. Op-Amp, 555, Filter)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full"
          />
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Folder size={12} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Presets Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/60 transition-all flex flex-col justify-between gap-3 group hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold">
                    {preset.badge}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {preset.components.length} Components • {preset.wires.length} Wires
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors">
                  {preset.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-500 font-medium">
                  Primary Instrument: <strong className="text-slate-300 capitalize">{preset.instrumentFocus.replace("_", " ")}</strong>
                </span>
                <button
                  onClick={() => {
                    onSelectPreset(preset.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow"
                >
                  <Zap size={12} />
                  <span>Load Circuit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
