import {
  Download,
  FolderOpen,
  Globe,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import type { ViewMode } from "./types";
import { EDA_PRESETS } from "./presets";

interface TopCommandRibbonProps {
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  wireColor: string;
  onChangeWireColor: (color: string) => void;
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onClear: () => void;
  onExportNetlist: () => void;
  onOpenCommunityModal?: () => void;
}

const WIRE_COLORS = [
  { id: "red", hex: "#ef4444", label: "Red (VCC / High)" },
  { id: "black", hex: "#1e293b", label: "Black (GND / 0V)" },
  { id: "green", hex: "#22c55e", label: "Green (Signal / Data)" },
  { id: "blue", hex: "#3b82f6", label: "Blue (Control / Feedback)" },
  { id: "yellow", hex: "#eab308", label: "Yellow (Clock / Timing)" },
  { id: "cyan", hex: "#06b6d4", label: "Cyan (Analog In/Out)" },
  { id: "purple", hex: "#a855f7", label: "Purple (Bus / Aux)" },
];

export default function TopCommandRibbon({
  isRunning,
  onToggleRun,
  onReset,
  viewMode,
  onChangeViewMode,
  wireColor,
  onChangeWireColor,
  activePresetId,
  onSelectPreset,
  onClear,
  onExportNetlist,
  onOpenCommunityModal,
}: TopCommandRibbonProps) {
  return (
    <header className="eda-command-ribbon" role="toolbar" aria-label="EDA Command Ribbon">
      <div className="ribbon-cluster ribbon-left">
        {/* Brand Pill */}
        <div className="ribbon-brand-tag">
          <Zap size={15} className="brand-bolt" />
          <span className="brand-name">UNIVERSAL EDA</span>
          <span className="brand-sub">Tinkercad · Multisim · OpenCircuits · KiCad</span>
        </div>

        {/* Run / Stop Simulation Button */}
        <button
          type="button"
          className={`btn-sim-run ${isRunning ? "running" : "stopped"}`}
          onClick={onToggleRun}
          title={isRunning ? "Pause Simulation" : "Start Real-Time Simulation"}
        >
          {isRunning ? (
            <>
              <Pause size={14} fill="currentColor" />
              <span>Pause Sim</span>
              <span className="sim-live-pulse" />
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Run Simulation</span>
            </>
          )}
        </button>

        {/* Reset Simulation State */}
        <button
          type="button"
          className="ribbon-btn ribbon-btn-icon"
          onClick={onReset}
          title="Reset Simulation Clock & Nodes"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>

        {/* View Mode Switcher (Tinkercad / KiCad Schematic / KiCad PCB) */}
        <div className="ribbon-view-group" role="group" aria-label="Projection View">
          <button
            type="button"
            className={`view-pill ${viewMode === "breadboard" ? "active" : ""}`}
            onClick={() => onChangeViewMode("breadboard")}
            title="Tinkercad Solderless Breadboard Projection"
          >
            ⚪ Breadboard
          </button>
          <button
            type="button"
            className={`view-pill ${viewMode === "schematic" ? "active" : ""}`}
            onClick={() => onChangeViewMode("schematic")}
            title="KiCad IEEE Schematic Symbols Projection"
          >
            📐 Schematic (KiCad)
          </button>
          <button
            type="button"
            className={`view-pill ${viewMode === "pcb" ? "active" : ""}`}
            onClick={() => onChangeViewMode("pcb")}
            title="KiCad FR-4 Copper Traces Projection"
          >
            🟢 PCB Traces
          </button>
        </div>
      </div>

      <div className="ribbon-cluster ribbon-right">
        {/* Wire Color Selector Palette */}
        <div className="wire-color-palette" title="Select active jumper wire color">
          <span className="palette-label">Wire:</span>
          {WIRE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`color-swatch-dot ${wireColor === c.id ? "active" : ""}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => onChangeWireColor(c.id)}
              title={c.label}
              aria-label={c.label}
            />
          ))}
        </div>

        {/* Circuit Preset Dropdown Selector */}
        <div className="preset-selector-box">
          <FolderOpen size={13} className="preset-icon" />
          <select
            className="preset-select"
            value={activePresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            title="Load Pre-Wired Circuit Preset"
          >
            {EDA_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} [{p.badge}]
              </option>
            ))}
          </select>
        </div>

        {/* Community Circuits Hub Modal Trigger */}
        {onOpenCommunityModal && (
          <button
            type="button"
            className="ribbon-btn ribbon-btn-community"
            onClick={onOpenCommunityModal}
            title="Open OurCircuits / OpenCircuits Community Repository & Discussions"
          >
            <Globe size={13} />
            <span>Community Hub</span>
          </button>
        )}

        {/* Export Netlist */}
        <button
          type="button"
          className="ribbon-btn"
          onClick={onExportNetlist}
          title="Export KiCad / SPICE Netlist"
        >
          <Download size={13} />
          <span>Export Netlist</span>
        </button>

        {/* Clear All */}
        <button
          type="button"
          className="ribbon-btn ribbon-btn-danger"
          onClick={onClear}
          title="Clear Workbench & Reset Components"
        >
          <Trash2 size={13} />
          <span>Clear</span>
        </button>
      </div>
    </header>
  );
}
