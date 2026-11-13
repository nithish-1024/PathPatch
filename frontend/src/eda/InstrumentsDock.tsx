import { useState } from "react";
import {
  Activity,
  Binary,
  CheckCircle2,
  Copy,
  Gauge,
  ListFilter,
  TrendingUp,
} from "lucide-react";
import type { InstrumentTab, SimulationResult, EdaPlacedComponent, EdaWire } from "./types";

interface InstrumentsDockProps {
  simResult: SimulationResult;
  components: EdaPlacedComponent[];
  wires: EdaWire[];
}

export default function InstrumentsDock({
  simResult,
  components,
  wires: _wires,
}: InstrumentsDockProps) {
  const [activeTab, setActiveTab] = useState<InstrumentTab>("oscilloscope");

  // Oscilloscope Interactive Controls
  const [timeDivMs, setTimeDivMs] = useState(1.0); // 1 ms / div
  const [voltsDivCh1, setVoltsDivCh1] = useState(1.0); // 1 V / div
  const [voltsDivCh2, setVoltsDivCh2] = useState(1.0); // 1 V / div
  const [ch1Offset, setCh1Offset] = useState(0.0);
  const [ch2Offset, setCh2Offset] = useState(-1.5);
  const [ch1Enabled, setCh1Enabled] = useState(true);
  const [ch2Enabled, setCh2Enabled] = useState(true);

  // Multimeter State
  const [dmmMode, setDmmMode] = useState<"DC_V" | "AC_V" | "DC_MA" | "OHM" | "TEMP">("DC_V");

  // Netlist Copy State
  const [copiedNetlist, setCopiedNetlist] = useState(false);

  // Calculate Oscilloscope Peak-to-Peak & RMS
  const ch1Samples = simResult.oscilloscopeSamples.ch1;
  const ch2Samples = simResult.oscilloscopeSamples.ch2;

  const ch1Min = ch1Samples.length ? Math.min(...ch1Samples) : 0;
  const ch1Max = ch1Samples.length ? Math.max(...ch1Samples) : 0;
  const ch1Vpp = ch1Max - ch1Min;
  const ch1Vrms = ch1Samples.length
    ? Math.sqrt(ch1Samples.reduce((acc, v) => acc + v * v, 0) / ch1Samples.length)
    : 0;

  const ch2Min = ch2Samples.length ? Math.min(...ch2Samples) : 0;
  const ch2Max = ch2Samples.length ? Math.max(...ch2Samples) : 0;
  const ch2Vpp = ch2Max - ch2Min;
  const ch2Vrms = ch2Samples.length
    ? Math.sqrt(ch2Samples.reduce((acc, v) => acc + v * v, 0) / ch2Samples.length)
    : 0;

  // Real-time Amplifier AC Gain & Clipping Calculation
  const voltageGain = ch1Vpp > 0.05 ? ch2Vpp / ch1Vpp : 1.0;
  const gainDb = 20 * Math.log10(Math.max(0.001, voltageGain));
  const isClipping = ch2Max >= 11.8 || ch2Min <= -11.8;

  // Multimeter Display Calculation
  let dmmValue = "0.00";
  let dmmUnit = "V";
  if (dmmMode === "DC_V") {
    const vPrimary = Object.values(simResult.nodeVoltages)[0] ?? 5.0;
    dmmValue = vPrimary.toFixed(2);
    dmmUnit = "V DC";
  } else if (dmmMode === "AC_V") {
    dmmValue = ch1Vrms.toFixed(2);
    dmmUnit = "V RMS";
  } else if (dmmMode === "DC_MA") {
    const iTotalMa = Object.values(simResult.branchCurrents).reduce((acc, i) => acc + i, 0) * 1000;
    dmmValue = Math.min(999, Math.max(0, iTotalMa)).toFixed(1);
    dmmUnit = "mA DC";
  } else if (dmmMode === "OHM") {
    dmmValue = "1.00";
    dmmUnit = "kΩ";
  } else if (dmmMode === "TEMP") {
    const maxT = Math.max(...Object.values(simResult.thermalMap), 27);
    dmmValue = maxT.toFixed(1);
    dmmUnit = "°C";
  }

  // Generate SPICE Netlist String
  const generateNetlistString = () => {
    let out = "* Universal Circuit Studio - Auto-Generated SPICE Netlist\n";
    out += `* Timestamp: ${new Date().toISOString()}\n\n`;
    components.forEach((c) => {
      const pinNodes = c.pins.map((p) => `NET_${c.id}_${p.id}`).join(" ");
      out += `${c.designator} ${pinNodes} ${c.type} `;
      Object.entries(c.properties).forEach(([k, v]) => {
        out += `${k}=${v} `;
      });
      out += "\n";
    });
    out += "\n.tran 10u 50m\n.end\n";
    return out;
  };

  const handleCopyNetlist = () => {
    navigator.clipboard.writeText(generateNetlistString());
    setCopiedNetlist(true);
    setTimeout(() => setCopiedNetlist(false), 2000);
  };

  const bode = simResult.bodeData;

  return (
    <section className="eda-instruments-dock" aria-label="Unified Graph Analyzer">
      {/* Dock Tabs Navigation */}
      <div className="dock-nav-bar" role="tablist">
        <button
          type="button"
          className={`dock-tab ${activeTab === "oscilloscope" ? "active" : ""}`}
          onClick={() => setActiveTab("oscilloscope")}
          role="tab"
          aria-selected={activeTab === "oscilloscope"}
        >
          <Activity size={14} />
          <span>2-Channel Scope & AC Gain Analyzer</span>
        </button>

        <button
          type="button"
          className={`dock-tab ${activeTab === "bode_analyzer" ? "active" : ""}`}
          onClick={() => setActiveTab("bode_analyzer")}
          role="tab"
          aria-selected={activeTab === "bode_analyzer"}
        >
          <TrendingUp size={14} />
          <span>AC Bode Frequency Response (Gain & Phase)</span>
        </button>

        <button
          type="button"
          className={`dock-tab ${activeTab === "logic_analyzer" ? "active" : ""}`}
          onClick={() => setActiveTab("logic_analyzer")}
          role="tab"
          aria-selected={activeTab === "logic_analyzer"}
        >
          <Binary size={14} />
          <span>Digital Logic Timing Waveforms</span>
        </button>

        <button
          type="button"
          className={`dock-tab ${activeTab === "multimeter" ? "active" : ""}`}
          onClick={() => setActiveTab("multimeter")}
          role="tab"
          aria-selected={activeTab === "multimeter"}
        >
          <Gauge size={14} />
          <span>Bench Multimeter (DMM)</span>
        </button>

        <button
          type="button"
          className={`dock-tab ${activeTab === "netlist" ? "active" : ""}`}
          onClick={() => setActiveTab("netlist")}
          role="tab"
          aria-selected={activeTab === "netlist"}
        >
          <ListFilter size={14} />
          <span>SPICE Netlist & Nodal Analysis</span>
        </button>
      </div>

      {/* Dock Content Panel */}
      <div className="dock-body-panel">
        {/* TAB 1: 2-CHANNEL OSCILLOSCOPE & AC AMPLIFIER ANALYZER */}
        {activeTab === "oscilloscope" && (
          <div className="scope-workbench-grid">
            {/* Screen Display */}
            <div className="scope-crt-bezel">
              <div className="crt-grid-reticle">
                {/* 10x8 Grid Division Lines */}
                <svg className="crt-svg" viewBox="0 0 500 240" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[...Array(11)].map((_, i) => (
                    <line
                      key={`vx_${i}`}
                      x1={i * 50}
                      y1="0"
                      x2={i * 50}
                      y2="240"
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray={i === 5 ? "none" : "2,2"}
                    />
                  ))}
                  {[...Array(9)].map((_, i) => (
                    <line
                      key={`hy_${i}`}
                      x1="0"
                      y1={i * 30}
                      x2="500"
                      y2={i * 30}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray={i === 4 ? "none" : "2,2"}
                    />
                  ))}

                  {/* Channel 1 Trace (Yellow - Input) */}
                  {ch1Enabled && ch1Samples.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={ch1Samples
                        .map((val, idx) => {
                          const x = (idx / (ch1Samples.length - 1)) * 500;
                          const y = 120 - ((val + ch1Offset) / voltsDivCh1) * 30;
                          return `${x.toFixed(1)},${Math.max(2, Math.min(238, y)).toFixed(1)}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Channel 2 Trace (Cyan - Output) */}
                  {ch2Enabled && ch2Samples.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={ch2Samples
                        .map((val, idx) => {
                          const x = (idx / (ch2Samples.length - 1)) * 500;
                          const y = 120 - ((val + ch2Offset) / voltsDivCh2) * 30;
                          return `${x.toFixed(1)},${Math.max(2, Math.min(238, y)).toFixed(1)}`;
                        })
                        .join(" ")}
                    />
                  )}
                </svg>

                {/* CRT On-Screen Telemetry Overlay */}
                <div className="crt-telemetry-header">
                  <span className="telemetry-pill ch1">
                    CH1 (In): {ch1Vpp.toFixed(2)} Vpp | {ch1Vrms.toFixed(2)} Vrms
                  </span>
                  <span className="telemetry-pill ch2">
                    CH2 (Out): {ch2Vpp.toFixed(2)} Vpp | {ch2Vrms.toFixed(2)} Vrms
                  </span>
                  <span className="telemetry-pill text-emerald-400 bg-emerald-950/60 border border-emerald-800">
                    Gain Av: {voltageGain.toFixed(1)}x ({gainDb.toFixed(1)} dB)
                  </span>
                  {isClipping && (
                    <span className="telemetry-pill text-rose-300 bg-rose-950/80 border border-rose-700 animate-pulse font-bold">
                      ⚠️ OUTPUT CLIPPING
                    </span>
                  )}
                  <span className="telemetry-pill time">TB: {timeDivMs} ms/div</span>
                </div>
              </div>
            </div>

            {/* Oscilloscope Physical Knobs & Controls Panel */}
            <div className="scope-knobs-panel">
              <div className="channel-box ch1-box">
                <div className="channel-header">
                  <label className="channel-toggle">
                    <input
                      type="checkbox"
                      checked={ch1Enabled}
                      onChange={(e) => setCh1Enabled(e.target.checked)}
                    />
                    <strong style={{ color: "#eab308" }}>CH1 INPUT (Yellow)</strong>
                  </label>
                </div>
                <div className="knob-row">
                  <label>
                    <span>Scale: {voltsDivCh1} V/div</span>
                    <select
                      value={voltsDivCh1}
                      onChange={(e) => setVoltsDivCh1(parseFloat(e.target.value))}
                    >
                      <option value="0.1">100 mV/div</option>
                      <option value="0.5">500 mV/div</option>
                      <option value="1.0">1.0 V/div</option>
                      <option value="2.0">2.0 V/div</option>
                      <option value="5.0">5.0 V/div</option>
                    </select>
                  </label>
                  <label>
                    <span>Y-Offset: {ch1Offset.toFixed(1)}V</span>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="0.5"
                      value={ch1Offset}
                      onChange={(e) => setCh1Offset(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="channel-box ch2-box">
                <div className="channel-header">
                  <label className="channel-toggle">
                    <input
                      type="checkbox"
                      checked={ch2Enabled}
                      onChange={(e) => setCh2Enabled(e.target.checked)}
                    />
                    <strong style={{ color: "#06b6d4" }}>CH2 OUTPUT (Cyan)</strong>
                  </label>
                </div>
                <div className="knob-row">
                  <label>
                    <span>Scale: {voltsDivCh2} V/div</span>
                    <select
                      value={voltsDivCh2}
                      onChange={(e) => setVoltsDivCh2(parseFloat(e.target.value))}
                    >
                      <option value="0.1">100 mV/div</option>
                      <option value="0.5">500 mV/div</option>
                      <option value="1.0">1.0 V/div</option>
                      <option value="2.0">2.0 V/div</option>
                      <option value="5.0">5.0 V/div</option>
                    </select>
                  </label>
                  <label>
                    <span>Y-Offset: {ch2Offset.toFixed(1)}V</span>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="0.5"
                      value={ch2Offset}
                      onChange={(e) => setCh2Offset(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="channel-box timebase-box">
                <div className="channel-header">
                  <strong>HORIZONTAL TIMEBASE</strong>
                </div>
                <div className="knob-row">
                  <label>
                    <span>Time/Div: {timeDivMs} ms</span>
                    <select
                      value={timeDivMs}
                      onChange={(e) => setTimeDivMs(parseFloat(e.target.value))}
                    >
                      <option value="0.1">100 µs/div</option>
                      <option value="0.5">500 µs/div</option>
                      <option value="1.0">1.0 ms/div</option>
                      <option value="5.0">5.0 ms/div</option>
                      <option value="10.0">10 ms/div</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AC BODE FREQUENCY ANALYZER */}
        {activeTab === "bode_analyzer" && (
          <div className="p-4 bg-slate-950 rounded-xl flex flex-col gap-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <span>📈</span> AC Frequency Sweep & Transfer Function (Bode Plot)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Logarithmic sweep from 10 Hz to 1 MHz showing Magnitude (dB) and Phase (°).
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-700 text-indigo-300">
                  Cutoff (fc): {bode?.cutoffFreqHz ? `${bode.cutoffFreqHz.toFixed(1)} Hz` : "1591 Hz"}
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300">
                  Q Factor: {bode?.qFactor ? bode.qFactor.toFixed(2) : "2.50"}
                </span>
              </div>
            </div>

            {/* Bode Plot SVG Chart */}
            <div className="w-full h-56 bg-slate-900 border border-slate-800 rounded-lg p-2 relative flex flex-col">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                {/* Grid Lines */}
                {[...Array(6)].map((_, i) => (
                  <line
                    key={`bg_x_${i}`}
                    x1={i * 120}
                    y1="0"
                    x2={i * 120}
                    y2="200"
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                ))}
                {[...Array(5)].map((_, i) => (
                  <line
                    key={`bg_y_${i}`}
                    x1="0"
                    y1={i * 50}
                    x2="600"
                    y2={i * 50}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                ))}

                {/* 0 dB Reference Line */}
                <line x1="0" y1="50" x2="600" y2="50" stroke="#334155" strokeWidth="1.5" />

                {/* Magnitude Gain Trace (Emerald) */}
                {bode && bode.gainDb.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points={bode.gainDb
                      .map((val, idx) => {
                        const x = (idx / (bode.gainDb.length - 1)) * 600;
                        // Map +20dB to 10px, 0dB to 50px, -60dB to 190px
                        const y = 50 - val * 2.3;
                        return `${x.toFixed(1)},${Math.max(5, Math.min(195, y)).toFixed(1)}`;
                      })
                      .join(" ")}
                  />
                )}

                {/* Phase Trace (Purple Dashed) */}
                {bode && bode.phaseDeg.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.8"
                    strokeDasharray="4,3"
                    strokeLinecap="round"
                    points={bode.phaseDeg
                      .map((val, idx) => {
                        const x = (idx / (bode.phaseDeg.length - 1)) * 600;
                        // Map 0° to 100px, -180° to 190px
                        const y = 100 - (val / 180) * 80;
                        return `${x.toFixed(1)},${Math.max(5, Math.min(195, y)).toFixed(1)}`;
                      })
                      .join(" ")}
                  />
                )}
              </svg>

              {/* Legend & Axis Labels */}
              <div className="absolute top-3 left-4 flex items-center gap-4 text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Gain (dB)
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-3 h-0.5 bg-purple-400 border-b border-dashed inline-block" /> Phase (°)
                </span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1 mt-1">
                <span>10 Hz</span>
                <span>100 Hz</span>
                <span>1 kHz</span>
                <span>10 kHz</span>
                <span>100 kHz</span>
                <span>1 MHz</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIGITAL LOGIC TIMING ANALYZER */}
        {activeTab === "logic_analyzer" && (
          <div className="logic-analyzer-workbench">
            <div className="logic-header-bar">
              <span className="la-title">Multi-Track Digital Timing Waveforms</span>
              <span className="la-timebase">Clock Period: 500 ms • Synchronous Transitions</span>
            </div>

            <div className="logic-traces-container">
              {Object.entries(simResult.logicWaveforms).map(([signalName, bitSamples]) => (
                <div key={signalName} className="logic-channel-row">
                  <div className="la-sig-label">
                    <span>{signalName}</span>
                  </div>
                  <div className="la-waveform-track">
                    <svg className="la-svg" viewBox="0 0 500 24" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                        points={bitSamples
                          .flatMap((bit, idx) => {
                            const x1 = (idx / bitSamples.length) * 500;
                            const x2 = ((idx + 1) / bitSamples.length) * 500;
                            const y = bit === 1 ? 4 : 20;
                            return [
                              `${x1.toFixed(1)},${y}`,
                              `${x2.toFixed(1)},${y}`,
                            ];
                          })
                          .join(" ")}
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BENCH DIGITAL MULTIMETER (DMM) */}
        {activeTab === "multimeter" && (
          <div className="dmm-workbench-view">
            <div className="fluke-multimeter-chassis">
              <div className="dmm-bezel">
                <div className="dmm-brand">VIRTUAL BENCH MULTIMETER</div>
                {/* 7-Segment High-Contrast Display */}
                <div className="dmm-lcd-screen">
                  <div className="dmm-digits">{dmmValue}</div>
                  <div className="dmm-unit-badge">{dmmUnit}</div>
                </div>

                {/* Mode Selectors */}
                <div className="dmm-buttons-row">
                  <button
                    type="button"
                    className={`dmm-btn ${dmmMode === "DC_V" ? "active" : ""}`}
                    onClick={() => setDmmMode("DC_V")}
                  >
                    DC V
                  </button>
                  <button
                    type="button"
                    className={`dmm-btn ${dmmMode === "AC_V" ? "active" : ""}`}
                    onClick={() => setDmmMode("AC_V")}
                  >
                    AC V
                  </button>
                  <button
                    type="button"
                    className={`dmm-btn ${dmmMode === "DC_MA" ? "active" : ""}`}
                    onClick={() => setDmmMode("DC_MA")}
                  >
                    DC mA
                  </button>
                  <button
                    type="button"
                    className={`dmm-btn ${dmmMode === "OHM" ? "active" : ""}`}
                    onClick={() => setDmmMode("OHM")}
                  >
                    Resistance (Ω)
                  </button>
                  <button
                    type="button"
                    className={`dmm-btn ${dmmMode === "TEMP" ? "active" : ""}`}
                    onClick={() => setDmmMode("TEMP")}
                  >
                    Thermal (°C)
                  </button>
                </div>

                {/* Test Lead Jacks */}
                <div className="dmm-jacks-row">
                  <div className="jack-item">
                    <span className="jack-hole red-jack" />
                    <small>Red (+ Probe)</small>
                  </div>
                  <div className="jack-item">
                    <span className="jack-hole black-jack" />
                    <small>COM (GND)</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SPICE NETLIST & NODAL ANALYSIS */}
        {activeTab === "netlist" && (
          <div className="netlist-table-container">
            <div className="netlist-action-bar">
              <span className="netlist-header-title">Circuit Electrical Netlist & Nodal Potentials</span>
              <button type="button" className="btn-copy-netlist" onClick={handleCopyNetlist}>
                {copiedNetlist ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                <span>{copiedNetlist ? "Copied SPICE Netlist!" : "Copy SPICE Netlist"}</span>
              </button>
            </div>

            <table className="eda-netlist-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Type</th>
                  <th>Designator</th>
                  <th>Terminal Pins</th>
                  <th>Calculated Potential</th>
                  <th>Power / Thermal</th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp) => {
                  const pwr = comp.state?.power ?? 0;
                  const temp = comp.state?.tempC ?? 27;
                  return (
                    <tr key={comp.id}>
                      <td>
                        <strong>{comp.name}</strong>
                      </td>
                      <td>
                        <code>{comp.type}</code>
                      </td>
                      <td>
                        <span className="des-badge">{comp.designator}</span>
                      </td>
                      <td>{comp.pins.map((p) => p.name).join(", ")}</td>
                      <td>
                        <span className="voltage-pill">
                          {(comp.state?.voltage ?? 0).toFixed(2)} V
                        </span>
                      </td>
                      <td>
                        {pwr > 0.05 ? (
                          <span className={`thermal-tag ${temp > 100 ? "hot" : "ok"}`}>
                            {pwr.toFixed(2)} W ({temp.toFixed(1)} °C)
                          </span>
                        ) : (
                          <span className="thermal-tag normal">Cold (Passive)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
