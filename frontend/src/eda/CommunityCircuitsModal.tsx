import React, { useState } from "react";
import type { CommunityCircuit } from "./types";

interface CommunityCircuitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCircuit: (presetId: string) => void;
  onSaveCurrentCircuit: (title: string, description: string) => void;
}

const CURATED_COMMUNITY_CIRCUITS: CommunityCircuit[] = [
  {
    id: "comm_opamp_amp",
    title: "LM741 Inverting AC Audio Pre-Amp (Av = -10x)",
    author: "Prof. K. Ramesh",
    verified: true,
    category: "audio",
    description: "Low-noise audio preamplifier featuring Rin = 10kΩ, Rf = 100kΩ, and virtual ground at inverting terminal. Validated with dual-channel oscilloscope.",
    rating: 4.9,
    starsCount: 142,
    forksCount: 46,
    commentsCount: 18,
    componentsCount: 5,
    wiresCount: 6,
    presetId: "opamp_inverting_amplifier",
    tags: ["Op-Amp", "LM741", "Analog", "Audio"],
    discussions: [
      {
        id: "d1",
        author: "Arjun Sharma (Student)",
        role: "Student",
        timestamp: "2 hours ago",
        content: "What happens if we increase Rf from 100kΩ to 200kΩ with a 2V input?",
      },
      {
        id: "d2",
        author: "Prof. K. Ramesh",
        role: "Professor",
        timestamp: "1 hour ago",
        content: "Av will become -20x! At 2V input, demanded output is ±40V which immediately saturates against the ±15V rails, causing heavy harmonic distortion and clipping.",
      },
    ],
  },
  {
    id: "comm_active_filter",
    title: "2nd-Order Sallen-Key Active Bandpass Filter",
    author: "Dr. Sarah Chen",
    verified: true,
    category: "filter",
    description: "Sharp -40dB/decade roll-off bandpass filter centered at fc = 1.59kHz with Q = 2.5. Includes integrated Bode frequency analyzer response curve.",
    rating: 4.8,
    starsCount: 98,
    forksCount: 35,
    commentsCount: 12,
    componentsCount: 5,
    wiresCount: 6,
    presetId: "active_bandpass_filter",
    tags: ["Filter", "Bode", "Sallen-Key", "DSP"],
    discussions: [
      {
        id: "d3",
        author: "Maya Lin",
        role: "TA",
        timestamp: "1 day ago",
        content: "Make sure to connect high-precision 1% metal film resistors to prevent center frequency drift.",
      },
    ],
  },
  {
    id: "comm_full_adder",
    title: "1-Bit Full Adder (74HC86 XOR + 74HC08 + 74HC32)",
    author: "Maya Lin",
    verified: true,
    category: "digital",
    description: "Standard digital arithmetic cell computing Sum = A ⊕ B ⊕ Cin and Cout = (A·B) + (Cin·(A ⊕ B)). Logic timing analyzer verifies propagation delay.",
    rating: 4.9,
    starsCount: 165,
    forksCount: 72,
    commentsCount: 24,
    componentsCount: 12,
    wiresCount: 18,
    presetId: "digital_full_adder",
    tags: ["Digital", "Gates", "XOR", "Adder"],
    discussions: [
      {
        id: "d4",
        author: "Rahul V.",
        role: "Student",
        timestamp: "3 days ago",
        content: "All truth table combinations verified with the SPST switches!",
      },
    ],
  },
  {
    id: "comm_rectifier_snubber",
    title: "Full-Wave Bridge Rectifier with RC Snubber & Filter",
    author: "Elena Rostova",
    verified: true,
    category: "power",
    description: "Industrial AC-to-DC conversion with 4x 1N4007 diodes, 100µF smoothing capacitor, and RC snubber suppressing diode turn-off voltage transients.",
    rating: 4.8,
    starsCount: 114,
    forksCount: 39,
    commentsCount: 15,
    componentsCount: 8,
    wiresCount: 12,
    presetId: "bridge_rectifier",
    tags: ["Power", "Rectifier", "AC-DC", "Snubber"],
    discussions: [
      {
        id: "d5",
        author: "Carlos Gomez",
        role: "Engineer",
        timestamp: "4 days ago",
        content: "Adding the RC snubber eliminated the 80V peak ringing on oscilloscope CH2.",
      },
    ],
  },
  {
    id: "comm_555_astable",
    title: "NE555 Timer Astable Multivibrator (1kHz Square Wave)",
    author: "Arjun Sharma",
    verified: false,
    category: "analog",
    description: "Classic 555 pulse generator with 55% duty cycle. Oscilloscope CH1 captures square output and CH2 captures capacitor exponential charge/discharge ramp.",
    rating: 4.7,
    starsCount: 218,
    forksCount: 94,
    commentsCount: 31,
    componentsCount: 7,
    wiresCount: 11,
    presetId: "555_timer_astable",
    tags: ["555", "Astable", "Timer", "Oscillator"],
    discussions: [
      {
        id: "d6",
        author: "Pooja Hegde",
        role: "Student",
        timestamp: "5 days ago",
        content: "Pin 4 RESET must be pulled to VCC, otherwise it picks up 50Hz mains noise and misfires.",
      },
    ],
  },
];

export const CommunityCircuitsModal: React.FC<CommunityCircuitsModalProps> = ({
  isOpen,
  onClose,
  onLoadCircuit,
  onSaveCurrentCircuit,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCircuit, setActiveCircuit] = useState<CommunityCircuit | null>(CURATED_COMMUNITY_CIRCUITS[0] ?? null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [saveDesc, setSaveDesc] = useState<string>("");

  if (!isOpen) return null;

  const filteredCircuits = CURATED_COMMUNITY_CIRCUITS.filter((c) => {
    const matchesCat = selectedCategory === "all" || c.category === selectedCategory;
    const matchesQuery =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitle.trim()) return;
    onSaveCurrentCircuit(saveTitle, saveDesc);
    setIsSaving(false);
    setSaveTitle("");
    setSaveDesc("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                OurCircuits & OpenCircuits Community Repository
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Live Hub
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Explore peer-reviewed schematics, verified syllabus circuits, and student discussions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaving(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow"
            >
              <span>💾</span> Publish Circuit
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Publish / Save Circuit Form Overlay */}
        {isSaving && (
          <div className="px-6 py-4 bg-indigo-950/40 border-b border-indigo-800/60 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs text-indigo-200">Publish Current Workbench Design to Gallery</span>
              <button onClick={() => setIsSaving(false)} className="text-xs text-slate-400 hover:text-slate-200">
                Cancel
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Circuit Title (e.g. 3-Stage Audio Limiter with LM741)"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                required
              />
              <textarea
                placeholder="Brief technical description, component values, and design goals..."
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500 h-16 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Confirm & Save
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Content: Split List and Details */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Circuit Gallery List */}
          <div className="w-1/2 border-r border-slate-800 flex flex-col bg-slate-950/30">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Search circuits by name, IC, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {["all", "analog", "audio", "filter", "digital", "power"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-full font-medium capitalize transition-colors ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
              {filteredCircuits.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveCircuit(c)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-1.5 ${
                    activeCircuit?.id === c.id
                      ? "bg-indigo-950/40 border border-indigo-700/60 shadow-md"
                      : "hover:bg-slate-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                      {c.title}
                      {c.verified && (
                        <span className="text-[10px] text-blue-400" title="Verified Syllabus Design">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 flex items-center gap-0.5">
                      ★ {c.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                    <span className="font-medium text-slate-400">By {c.author}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span>★ {c.starsCount}</span>
                      <span>🍴 {c.forksCount}</span>
                      <span>💬 {c.commentsCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Circuit Detail & Discussion */}
          <div className="w-1/2 flex flex-col bg-slate-900/50 p-6 overflow-y-auto">
            {activeCircuit ? (
              <div className="flex flex-col gap-4">
                {/* Circuit Header */}
                <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-100">{activeCircuit.title}</h3>
                    <span className="text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                      ★ {activeCircuit.rating.toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Authored by <strong className="text-slate-200">{activeCircuit.author}</strong></span>
                    {activeCircuit.verified && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
                        Verified Peer Review
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  {activeCircuit.description}
                </p>

                {/* Tags and Stats */}
                <div className="flex flex-wrap gap-1.5">
                  {activeCircuit.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 text-[10px] font-mono border border-indigo-800/40">
                    {activeCircuit.componentsCount} Components • {activeCircuit.wiresCount} Wires
                  </span>
                </div>

                {/* Load & Fork Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      onLoadCircuit(activeCircuit.presetId);
                      onClose();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>⚡</span> Load to Circuit Workbench
                  </button>
                  <button
                    onClick={() => {
                      onLoadCircuit(activeCircuit.presetId);
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                    title="Clone to personal workbench"
                  >
                    <span>🍴</span> Fork Circuit
                  </button>
                </div>

                {/* Discussion Thread */}
                <div className="mt-4 flex flex-col gap-2.5 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span>💬</span> Engineering Discussions & Q&A
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {activeCircuit.discussions.length} comments
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {activeCircuit.discussions.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200">{d.author}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                d.role === "Professor"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : d.role === "TA"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {d.role}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[10px]">{d.timestamp}</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed pt-0.5">
                          {d.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a circuit from the gallery to inspect schematics and discussions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
