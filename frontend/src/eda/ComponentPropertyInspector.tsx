import React from "react";
import type { EdaPlacedComponent } from "./types";

interface ComponentPropertyInspectorProps {
  component: EdaPlacedComponent | null;
  onUpdateProperties: (compId: string, newProps: Record<string, number | string | boolean>) => void;
  onRotate: (compId: string) => void;
  onDelete: (compId: string) => void;
  onDuplicate: (compId: string) => void;
  onClose: () => void;
}

// EIA 4-band resistor color codes
const EIA_COLORS = [
  { val: 0, color: "#000000", name: "Black" },
  { val: 1, color: "#8B4513", name: "Brown" },
  { val: 2, color: "#FF0000", name: "Red" },
  { val: 3, color: "#FFA500", name: "Orange" },
  { val: 4, color: "#FFFF00", name: "Yellow" },
  { val: 5, color: "#008000", name: "Green" },
  { val: 6, color: "#0000FF", name: "Blue" },
  { val: 7, color: "#8A2BE2", name: "Violet" },
  { val: 8, color: "#808080", name: "Gray" },
  { val: 9, color: "#FFFFFF", name: "White" },
];

function getResistorBands(rOhms: number): { band1: string; band2: string; mult: string; tol: string } {
  if (rOhms <= 0) return { band1: "#8B4513", band2: "#000000", mult: "#000000", tol: "#D4AF37" };
  const s = rOhms.toString();
  const d1 = parseInt(s[0] ?? "1", 10);
  const d2 = parseInt(s[1] ?? "0", 10);
  const exp = Math.max(0, Math.floor(Math.log10(rOhms)) - 1);

  const b1 = EIA_COLORS[d1]?.color ?? "#8B4513";
  const b2 = EIA_COLORS[d2]?.color ?? "#000000";
  const mult = EIA_COLORS[exp % 10]?.color ?? "#8B4513";
  const tol = "#D4AF37"; // Gold 5%
  return { band1: b1, band2: b2, mult, tol };
}

export const ComponentPropertyInspector: React.FC<ComponentPropertyInspectorProps> = ({
  component,
  onUpdateProperties,
  onRotate,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  if (!component) return null;

  const handleChange = (key: string, value: number | string | boolean) => {
    onUpdateProperties(component.id, {
      ...component.properties,
      [key]: value,
    });
  };

  const rOhms = Number(component.properties.resistance ?? 1000);
  const resistorBands = getResistorBands(rOhms);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl text-slate-200 text-xs flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold border border-indigo-500/30">
            {component.designator || component.id}
          </span>
          <span className="font-semibold text-slate-100 text-sm truncate max-w-[140px]">
            {component.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-800"
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      {/* Dynamic Property Fields based on Component Type */}
      <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
        {/* RESISTOR */}
        {component.type === "RESISTOR" && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Resistance (Ohms Ω)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="10000000"
                  step="10"
                  value={rOhms}
                  onChange={(e) => handleChange("resistance", Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
                />
                <select
                  value={
                    rOhms >= 1000000 ? "M" : rOhms >= 1000 ? "k" : "1"
                  }
                  onChange={(e) => {
                    const unit = e.target.value;
                    let base = rOhms;
                    if (rOhms >= 1000000) base = rOhms / 1000000;
                    else if (rOhms >= 1000) base = rOhms / 1000;
                    if (unit === "M") handleChange("resistance", base * 1000000);
                    else if (unit === "k") handleChange("resistance", base * 1000);
                    else handleChange("resistance", base);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                >
                  <option value="1">Ω</option>
                  <option value="k">kΩ</option>
                  <option value="M">MΩ</option>
                </select>
              </div>
            </div>

            {/* Live 4-Band Resistor EIA Color Band Preview */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">EIA 4-Band Color Code</span>
              <div className="h-4 rounded bg-[#d2b48c] border border-amber-900/40 relative flex items-center justify-evenly px-4">
                <div className="w-1.5 h-full" style={{ backgroundColor: resistorBands.band1 }} title="Digit 1" />
                <div className="w-1.5 h-full" style={{ backgroundColor: resistorBands.band2 }} title="Digit 2" />
                <div className="w-1.5 h-full" style={{ backgroundColor: resistorBands.mult }} title="Multiplier" />
                <div className="w-1.5 h-full ml-2" style={{ backgroundColor: resistorBands.tol }} title="Tolerance ±5%" />
              </div>
            </div>
          </div>
        )}

        {/* CAPACITOR */}
        {(component.type === "CAPACITOR_CERAMIC" || component.type === "CAPACITOR_ELECTROLYTIC") && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Capacitance (µF)
              </label>
              <input
                type="number"
                min="0.000001"
                max="10000"
                step="0.1"
                value={Number(component.properties.capacitanceUf ?? 10)}
                onChange={(e) => handleChange("capacitanceUf", parseFloat(e.target.value) || 0.1)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            {component.type === "CAPACITOR_ELECTROLYTIC" && (
              <div className="text-[10px] text-amber-400/90 bg-amber-950/30 border border-amber-800/40 p-2 rounded">
                ⚠️ Polarized Component: Negative pin must face Ground/lower potential.
              </div>
            )}
          </div>
        )}

        {/* INDUCTOR */}
        {component.type === "INDUCTOR" && (
          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1">
              Inductance (mH)
            </label>
            <input
              type="number"
              min="0.01"
              max="5000"
              step="1"
              value={Number(component.properties.inductanceMh ?? 10)}
              onChange={(e) => handleChange("inductanceMh", parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
            />
          </div>
        )}

        {/* DC VOLTAGE SOURCE */}
        {component.type === "SOURCE_DC" && (
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>DC Voltage</span>
              <span className="font-mono text-indigo-300 font-semibold">
                {Number(component.properties.voltage ?? 5.0).toFixed(1)} V
              </span>
            </div>
            <input
              type="range"
              min="-24"
              max="24"
              step="0.5"
              value={Number(component.properties.voltage ?? 5.0)}
              onChange={(e) => handleChange("voltage", parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
              <span>-24V</span>
              <span>0V</span>
              <span>+24V</span>
            </div>
          </div>
        )}

        {/* AC SIGNAL SOURCE */}
        {component.type === "SOURCE_AC" && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Peak Amplitude (Vpk)
              </label>
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.5"
                value={Number(component.properties.amplitudeV ?? 2.0)}
                onChange={(e) => handleChange("amplitudeV", parseFloat(e.target.value) || 1.0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Frequency (Hz)
              </label>
              <input
                type="number"
                min="1"
                max="1000000"
                step="10"
                value={Number(component.properties.frequencyHz ?? 1000)}
                onChange={(e) => handleChange("frequencyHz", Math.max(1, parseFloat(e.target.value) || 50))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Waveform Shape
              </label>
              <select
                value={String(component.properties.waveform ?? "sine")}
                onChange={(e) => handleChange("waveform", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
              >
                <option value="sine">Sinusoidal (Sine)</option>
                <option value="square">Square Wave</option>
                <option value="triangle">Triangle Wave</option>
              </select>
            </div>
          </div>
        )}

        {/* OP-AMP LM741 */}
        {component.type === "IC_OPAMP_741" && (
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Open-Loop Gain (Aol)
              </label>
              <input
                type="number"
                value={Number(component.properties.openLoopGain ?? 100000)}
                onChange={(e) => handleChange("openLoopGain", parseFloat(e.target.value) || 100000)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800">
              Supply Rails: ±15V DC nominal. Saturation headroom: ±13.5V.
            </div>
          </div>
        )}

        {/* POTENTIOMETER */}
        {component.type === "POTENTIOMETER" && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Track Resistance (kΩ)
              </label>
              <input
                type="number"
                min="0.1"
                max="1000"
                step="1"
                value={Number(component.properties.resistance ?? 10000) / 1000}
                onChange={(e) => handleChange("resistance", (parseFloat(e.target.value) || 10) * 1000)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Wiper Position</span>
                <span className="font-mono text-indigo-300 font-semibold">
                  {Number(component.properties.wiperRatio ? Number(component.properties.wiperRatio) * 100 : 50).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Number(component.properties.wiperRatio ? Number(component.properties.wiperRatio) * 100 : 50)}
                onChange={(e) => handleChange("wiperRatio", parseFloat(e.target.value) / 100)}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* SWITCH */}
        {component.type === "SWITCH_SPST" && (
          <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-300 font-medium">Switch State</span>
            <button
              onClick={() => handleChange("closed", !component.properties.closed)}
              className={`px-3 py-1 rounded font-mono font-semibold text-xs transition-colors ${
                component.properties.closed
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {component.properties.closed ? "CLOSED (ON)" : "OPEN (OFF)"}
            </button>
          </div>
        )}

        {/* LED */}
        {component.type === "LED" && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                LED Color
              </label>
              <select
                value={String(component.properties.color ?? "red")}
                onChange={(e) => {
                  const color = e.target.value;
                  const vFwd = color === "blue" || color === "white" ? 3.2 : color === "green" ? 2.2 : 2.0;
                  onUpdateProperties(component.id, {
                    ...component.properties,
                    color,
                    forwardV: vFwd,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
              >
                <option value="red">Red (Vf = 2.0V)</option>
                <option value="green">Green (Vf = 2.2V)</option>
                <option value="blue">Blue (Vf = 3.2V)</option>
                <option value="yellow">Yellow (Vf = 2.1V)</option>
                <option value="white">White (Vf = 3.3V)</option>
              </select>
            </div>
          </div>
        )}

        {/* Live Runtime Telemetry */}
        {component.state && (
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col gap-1 text-[10px] font-mono">
            <span className="text-slate-400 font-semibold mb-0.5">Live Telemetry</span>
            {component.state.voltage !== undefined && (
              <div className="flex justify-between text-slate-300">
                <span>Voltage:</span>
                <span className="text-cyan-400 font-semibold">{component.state.voltage.toFixed(2)} V</span>
              </div>
            )}
            {component.state.current !== undefined && (
              <div className="flex justify-between text-slate-300">
                <span>Current:</span>
                <span className="text-emerald-400 font-semibold">{(component.state.current * 1000).toFixed(1)} mA</span>
              </div>
            )}
            {component.state.power !== undefined && (
              <div className="flex justify-between text-slate-300">
                <span>Power Dissipation:</span>
                <span className="text-amber-400 font-semibold">{(component.state.power * 1000).toFixed(1)} mW</span>
              </div>
            )}
            {component.state.tempC !== undefined && (
              <div className="flex justify-between text-slate-300">
                <span>Junction Temp:</span>
                <span className={component.state.tempC > 90 ? "text-rose-400 font-semibold" : "text-slate-300"}>
                  {component.state.tempC.toFixed(1)} °C
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800">
        <button
          onClick={() => onRotate(component.id)}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium"
          title="Rotate 90 degrees clockwise (Hotkey: R)"
        >
          <span>↻</span> Rotate
        </button>
        <button
          onClick={() => onDuplicate(component.id)}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium"
          title="Duplicate Component (Hotkey: Ctrl+D)"
        >
          <span>⎘</span> Copy
        </button>
        <button
          onClick={() => onDelete(component.id)}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-colors font-medium"
          title="Delete Component (Hotkey: Del / Backspace)"
        >
          <span>🗑</span> Delete
        </button>
      </div>
    </div>
  );
};
