import { useState } from "react";
import {
  Activity,
  Binary,
  CheckCircle2,
  Copy,
  Gauge,
  ListFilter,
  Maximize2,
  Sliders,
  Thermometer,
  Zap,
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
  wires,
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

  // Multimeter Display Calculation
  let dmmValue = "0.00";
  let dmmUnit = "V";
  if (dmmMode === "DC_V") {
    const vPrimary = Object.values(simResult.nodeVoltages)[0] ?? 5.0;
    dmmValue = vPrimary.toFixed(2);
    dmmUnit = "V DC";
  } else if (dmmMode === "AC_V") {
    dmmValue = (ch1Vrms).toFixed(2);
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
    let out = "* Universal EDA Studio - Auto-Generated Netlist\n";
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

  return (
    <section className="eda-instruments-dock" aria-label="Virtual Instruments Rack">
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
          <span>NI Multisim 2-Ch Oscilloscope</span>
        </button>

        <button
          type="button"
          className={`dock-tab ${activeTab === "logic_analyzer" ? "active" : ""}`}
          onClick={() => setActiveTab("logic_analyzer")}
          role="tab"
          aria-selected={activeTab === "logic_analyzer"}
        >
          <Binary size={14} />
          <span>Vivado Logic Timing Analyzer</span>
        </button>

        <button
          type="button"
          className={`dock-tab ${activeTab === "multimeter" ? "active" : ""}`}
          onClick={() => setActiveTab("multimeter")}
          role="tab"
          aria-selected={activeTab === "multimeter"}
        >
          <Gauge size={14} />
          <span>Bench Digital Multimeter (DMM)</span>
        </button>

        <button
          type="button"
          className={`dock-tab ${activeTab === "netlist" ? "active" : ""}`}
          onClick={() => setActiveTab("netlist")}
          role="tab"
          aria-selected={activeTab === "netlist"}
        >
          <ListFilter size={14} />
          <span>KiCad Netlist & SPICE Nodes</span>
        </button>
      </div>

      {/* Dock Content Panel */}
      <div className="dock-body-panel">
        {/* TAB 1: NI MULTISIM DUAL-CHANNEL OSCILLOSCOPE */}
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

                  {/* Channel 1 Trace (Yellow) */}
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

                  {/* Channel 2 Trace (Cyan) */}
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
                    CH1: {ch1Vpp.toFixed(2)} Vpp | {ch1Vrms.toFixed(2)} Vrms
                  </span>
                  <span className="telemetry-pill ch2">
                    CH2: {ch2Vpp.toFixed(2)} Vpp | {ch2Vrms.toFixed(2)} Vrms
                  </span>
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
                    <strong style={{ color: "#eab308" }}>CHANNEL 1 (Yellow)</strong>
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
                    <span>Y-Pos: {ch1Offset.toFixed(1)}</span>
                    <input
                      type="range"
                      min="-4.0"
                      max="4.0"
                      step="0.2"
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
                    <strong style={{ color: "#06b6d4" }}>CHANNEL 2 (Cyan)</strong>
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
                    <span>Y-Pos: {ch2Offset.toFixed(1)}</span>
                    <input
                      type="range"
                      min="-4.0"
                      max="4.0"
                      step="0.2"
                      value={ch2Offset}
                      onChange={(e) => setCh2Offset(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="channel-box timebase-box">
                <div className="channel-header">
                  <strong>HORIZONTAL / TIMEBASE</strong>
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
                      <option value="2.0">2.0 ms/div</option>
                      <option value="10.0">10.0 ms/div</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIVADO DIGITAL LOGIC TIMING WAVEFORM ANALYZER */}
        {activeTab === "logic_analyzer" && (
          <div className="vivado-analyzer-container">
            <div className="analyzer-ruler-bar">
              <span className="ruler-title">Vivado Cycle-Accurate Timing Diagram</span>
              <div className="ruler-ticks">
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((ns) => (
                  <span key={ns} className="tick-label">
                    {ns} ns
                  </span>
                ))}
              </div>
            </div>

            {/* Digital Signal Tracks */}
            <div className="analyzer-tracks-list">
              {Object.entries(simResult.logicWaveforms).map(([trackName, samples]) => (
                <div key={trackName} className="logic-track-row">
                  <div className="track-label-col">
                    <span className="track-badge">{trackName}</span>
                    <small>{trackName.startsWith("Q") ? "Counter Bit" : trackName === "CLK" ? "Clock 2Hz" : "Gate Out"}</small>
                  </div>
                  <div className="track-wave-col">
                    <svg className="digital-wave-svg" viewBox="0 0 400 24" preserveAspectRatio="none">
                      {samples.map((val, idx) => {
                        const x1 = (idx / samples.length) * 400;
                        const x2 = ((idx + 1) / samples.length) * 400;
                        const y = val === 1 ? 3 : 21;
                        return (
                          <g key={idx}>
                            <line
                              x1={x1}
                              y1={y}
                              x2={x2}
                              y2={y}
                              stroke={trackName === "CLK" ? "#eab308" : "#22c55e"}
                              strokeWidth="2"
                            />
                            {/* Vertical transition edge */}
                            {idx > 0 && samples[idx - 1] !== val && (
                              <line
                                x1={x1}
                                y1="3"
                                x2={x1}
                                y2="21"
                                stroke={trackName === "CLK" ? "#eab308" : "#22c55e"}
                                strokeWidth="2"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BENCH DIGITAL MULTIMETER (DMM) */}
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

        {/* TAB 4: KICAD NETLIST & SPICE NODAL TABLE */}
        {activeTab === "netlist" && (
          <div className="netlist-table-container">
            <div className="netlist-action-bar">
              <span className="netlist-header-title">KiCad Electrical Netlist & Nodal Potentials</span>
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
