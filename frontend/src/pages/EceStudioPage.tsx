import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Maximize2,
  Play,
  Power,
  RotateCcw,
  Search,
  Send,
  Sliders,
  Sparkles,
  Square,
  Thermometer,
  Zap,
} from "lucide-react";
import Deferred3DViewport from "../scenes/Deferred3DViewport";
import { api } from "../api/client";
import type {
  AnalysisRun,
  AskResponse,
  BreadboardComponent,
  BreadboardModel,
  CandidatePlan,
  CircuitParams,
  ViewLayer,
} from "../types/patchpath";

// 14+ Component Hardware Catalog
const ECE_CATALOG = [
  {
    id: "LM7805_LINEAR",
    name: "LM7805 Linear Regulator",
    category: "Regulators",
    footprint: "TO-220 Through-Hole",
    kind: "regulator",
    specs: "Vout: 5V, Max I: 1A, RθJA: 36 °C/W",
    weight: "2.2 g",
    description: "Standard 3-terminal linear regulator. Dissipates excess voltage as pure waste heat.",
    risk: "Thermal runaway at Vin > 12V under 350mA load (Tj > 118°C).",
    fix: "Replace with TSR-1 2450 switched buck module for 94% efficiency.",
    defaultVin: 12,
    defaultIload: 350,
  },
  {
    id: "BUCK_CONVERTER_TSR1",
    name: "TSR 1-2450 Buck Module",
    category: "Regulators",
    footprint: "SIP-3 Drop-in (Pin-compatible)",
    kind: "regulator",
    specs: "Vout: 5V, Efficiency: 94%, RθJA: 25 °C/W",
    weight: "1.9 g",
    description: "Switched-mode DC-DC buck converter. Eliminates bulky heatsinks and runs cool at 33°C.",
    risk: "Negligible heat. Higher switching ripple (~50 mV) requires 0.1µF decoupling cap.",
    fix: "Optimal choice for battery and high-differential power rails.",
    defaultVin: 12,
    defaultIload: 350,
  },
  {
    id: "TRANSFORMER_STEPDOWN",
    name: "Iron-Core Transformer",
    category: "Power",
    footprint: "EI-30 Chassis / PCB Mount",
    kind: "transformer",
    specs: "230V AC to 12V AC, 50 Hz, 1A",
    weight: "350 g",
    description: "Traditional magnetic iron-core step-down transformer with galvanic isolation.",
    risk: "Bulky (350g) and consumes 45 cm³ of enclosure volume.",
    fix: "Replace with Capacitive Dropper for compact, low-power IoT circuits.",
    defaultVin: 230,
    defaultIload: 30,
  },
  {
    id: "CAPACITIVE_DROPPER",
    name: "Capacitive Dropper (X2)",
    category: "Power",
    footprint: "X2 Radial Safety Film (15mm)",
    kind: "capacitive_dropper",
    specs: "0.47 µF X2, 275V AC, Inrush: 100Ω",
    weight: "8 g",
    description: "Transformerless AC voltage dropper using capacitive reactance (Xc = 1/(2πfC)). Ultra-compact (8g).",
    risk: "No galvanic isolation from AC mains. Safe only for sealed enclosure loads < 30 mA.",
    fix: "Use full bridge rectifier + 5.1V Zener clamp for safe regulated DC output.",
    defaultVin: 230,
    defaultIload: 25,
  },
  {
    id: "BJT_BC547",
    name: "BC547 NPN Transistor",
    category: "Semiconductors",
    footprint: "TO-92 Plastic Package",
    kind: "transistor",
    specs: "Vceo: 45V, Ic: 100mA, hFE: 200",
    weight: "0.2 g",
    description: "General-purpose small-signal NPN bipolar junction transistor for switching and amplification.",
    risk: "Vbe drops by -2.1 mV/°C as temperature rises, risking thermal biasing shift.",
    fix: "Add emitter degeneration resistor (Re = 100Ω) to stabilize operating point.",
    defaultVin: 5,
    defaultIload: 50,
  },
  {
    id: "MOSFET_IRFZ44N",
    name: "IRFZ44N N-Channel MOSFET",
    category: "Semiconductors",
    footprint: "TO-220 Power Package",
    kind: "transistor",
    specs: "Vds: 55V, Id: 49A, Rds(on): 17.5 mΩ",
    weight: "2.0 g",
    description: "High-current N-channel power MOSFET for DC motor PWM and high-speed power switching.",
    risk: "Gate threshold Vgs(th) requires 10V for full saturation; logic-level 3.3V drive will overheat.",
    fix: "Use TC4427 dedicated gate driver IC or logic-level IRLZ44N variant.",
    defaultVin: 12,
    defaultIload: 2000,
  },
  {
    id: "TIMER_NE555",
    name: "NE555 Precision Timer IC",
    category: "ICs",
    footprint: "DIP-8 Through-Hole",
    kind: "ic",
    specs: "Supply: 4.5V - 16V, Max Freq: 500 kHz",
    weight: "0.5 g",
    description: "Classic monostable and astable multivibrator for PWM generation, clock pulses, and time delays.",
    risk: "Current shoot-through spike (~300 mA for 100 ns) occurs during output transitions.",
    fix: "Decouple Pin 5 (Control) with 0.01µF and Pin 8 (Vcc) with 10µF + 0.1µF capacitors.",
    defaultVin: 5,
    defaultIload: 15,
  },
  {
    id: "OPAMP_LM741",
    name: "LM741 General Purpose Op-Amp",
    category: "ICs",
    footprint: "DIP-8 Through-Hole",
    kind: "ic",
    specs: "Supply: ±15V (Dual), Slew Rate: 0.5 V/µs",
    weight: "0.5 g",
    description: "Industry-standard single operational amplifier with internal frequency compensation.",
    risk: "Output cannot swing rail-to-rail (typically limited to Vcc - 2V).",
    fix: "For single 5V rails, replace with modern rail-to-rail MCP6002 op-amp.",
    defaultVin: 12,
    defaultIload: 20,
  },
  {
    id: "MCU_ESP32",
    name: "ESP32 Wi-Fi & BLE SoC",
    category: "Microcontrollers",
    footprint: "QFN-32 / SMD Module",
    kind: "microcontroller",
    specs: "Dual-core 240 MHz, 3.3V, Peak: 240 mA",
    weight: "3.5 g",
    description: "32-bit IoT microcontroller with integrated Wi-Fi and Bluetooth radio.",
    risk: "Brownout reset occurs if 3.3V rail drops by >150 mV during Wi-Fi Tx bursts.",
    fix: "Place 10µF tantalum + 0.1µF ceramic decoupling caps directly adjacent to VDD pins.",
    defaultVin: 5,
    defaultIload: 240,
  },
  {
    id: "DHT11_TEMP_HUMIDITY",
    name: "DHT11 Climate Sensor",
    category: "Sensors",
    footprint: "4-pin Single Row",
    kind: "sensor",
    specs: "0-50°C (±2°C), 20-90% RH (±5%)",
    weight: "2.5 g",
    description: "Digital composite temperature and relative humidity sensor with single-wire interface.",
    risk: "Requires 1-second interval between reads; polling faster causes self-heating errors.",
    fix: "Pull-up resistor of 4.7kΩ to 10kΩ required on data output pin.",
    defaultVin: 5,
    defaultIload: 2,
  },
  {
    id: "SMOOTHING_CAP_1000UF",
    name: "1000µF 25V Electrolytic Cap",
    category: "Passives",
    footprint: "Radial Can (10x16mm)",
    kind: "capacitor",
    specs: "Cap: 1000 µF, ESR: 0.08 Ω, 25V",
    weight: "4.5 g",
    description: "Bulk smoothing capacitor for full-wave rectified DC output and voltage ripple attenuation.",
    risk: "High ESR causes internal I²R heating under high ripple currents.",
    fix: "Paralleling with 0.1µF ceramic capacitor shunts high-frequency noise.",
    defaultVin: 12,
    defaultIload: 350,
  },
  {
    id: "DECOUPLING_CAP_100NF",
    name: "0.1µF Ceramic Bypass Cap",
    category: "Passives",
    footprint: "Ceramic Disc / 0805 SMD",
    kind: "capacitor",
    specs: "Cap: 100 nF (0.1 µF), 50V X7R",
    weight: "0.1 g",
    description: "Low-inductance decoupling capacitor for suppressing high-frequency transient switching spikes.",
    risk: "Must be placed within 5 mm of IC power pin to be effective.",
    fix: "Standard best practice for all digital and analog IC rails.",
    defaultVin: 5,
    defaultIload: 10,
  },
  {
    id: "RESISTOR_CURRENT_LIMIT",
    name: "220Ω 1/4W Metal Film Resistor",
    category: "Passives",
    footprint: "Axial 0207 (6.5mm)",
    kind: "resistor",
    specs: "Resistance: 220 Ω, Tolerance: 1%, 250 mW",
    weight: "0.2 g",
    description: "Current-limiting resistor for LED drive and base bias networks.",
    risk: "Power P = I²R must stay below 250 mW to avoid thermal discolouration.",
    fix: "Calculate exact Ohm value using R = (Vcc - Vf) / If.",
    defaultVin: 5,
    defaultIload: 15,
  },
  {
    id: "LED_INDICATOR",
    name: "5mm Red Indicator LED",
    category: "Optoelectronics",
    footprint: "Radial 5mm Through-Hole",
    kind: "led",
    specs: "Forward V: 2.0V, Nom Current: 20 mA",
    weight: "0.3 g",
    description: "Visual logic high / power rail status indicator.",
    risk: "Direct connection without series resistor causes immediate overcurrent burnout.",
    fix: "Always pair with 220Ω to 330Ω series ballast resistor.",
    defaultVin: 5,
    defaultIload: 20,
  },
];

export default function EceStudioPage() {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<ViewLayer>("overview");

  // Tinkercad EDA Toolbar State
  const [simRunning, setSimRunning] = useState(true); // [▶ Start Simulation]
  const [viewMode, setViewMode] = useState<"breadboard" | "schematic" | "pcb">("breadboard");
  const [wireColor, setWireColor] = useState<"red" | "black" | "green" | "blue" | "yellow">("red");
  const [dmmMode, setDmmMode] = useState<"V" | "mA" | "W" | "degC">("V");

  // Interactive In-Canvas Controls
  const [switchClosed, setSwitchClosed] = useState(true); // SPST Rocker Switch
  const [potRatio, setPotRatio] = useState(0.65); // Potentiometer Load (0.0 to 1.0)
  const [vin, setVin] = useState(12.0); // DC Power Supply Voltage
  const [tAmbient, setTAmbient] = useState(30); // Ambient Temp (°C)
  const [traceWidthMm, setTraceWidthMm] = useState(1.0); // PCB Trace Width

  // Active Regulator Socket: LM7805 vs. TSR-1 Buck Module
  const [isBuckInstalled, setIsBuckInstalled] = useState(false);

  // Component Drawer
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDrawerPart, setSelectedDrawerPart] = useState(ECE_CATALOG[0]);

  // Copilot Q&A
  const [question, setQuestion] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ q: string; a: string; source: string }>>([
    {
      q: "Why is the LM7805 getting burning hot?",
      a: "The LM7805 drops (12V - 5V) = 7V across its internal pass transistor. At 350mA, it burns 2.45W of pure waste heat, driving its junction temperature to 118.2°C! Applying the recommended TSR-1 Buck Module recovers 94% efficiency and runs cool at just 32.8°C.",
      source: "circuit_engine",
    },
  ]);

  // Load Seed Run
  useEffect(() => {
    let mounted = true;
    api
      .demo("ece_circuit")
      .then((data) => {
        if (mounted) {
          setRun(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // First-Principles Multisim Simulation Calculations
  const sim = useMemo(() => {
    if (!simRunning || !switchClosed) {
      return {
        vOut: 0.0,
        iLoadMa: 0.0,
        powerLossW: 0.0,
        junctionTempC: tAmbient,
        isThermalFault: false,
        ledBrightness: 0.0,
        efficiencyPercent: 0.0,
        traceTempRiseC: 0.0,
        dmmText: "0.00 V",
      };
    }

    // Effective Load Resistance governed by potentiometer: 10Ω base + (1 - ratio)*100Ω
    const rLoad = 10.0 + (1.0 - potRatio) * 100.0;
    const vOutNominal = 5.0;
    const iLoadA = vOutNominal / rLoad; // e.g., 5.0V / 14.3Ω ≈ 0.350 A (350 mA)
    const iLoadMa = Math.round(iLoadA * 1000);

    let powerLossW = 0.0;
    let junctionTempC = tAmbient;
    let efficiencyPercent = 0.0;

    if (!isBuckInstalled) {
      // LM7805 Linear Regulator
      const vDrop = Math.max(0, vin - vOutNominal);
      powerLossW = vDrop * iLoadA;
      const rThetaJA = 36.0; // °C/W
      junctionTempC = tAmbient + powerLossW * rThetaJA;
      efficiencyPercent = vin > 0 ? (vOutNominal / vin) * 100 : 0;
    } else {
      // TSR-1 2450 Buck Converter
      efficiencyPercent = 94.0;
      const pOut = vOutNominal * iLoadA;
      powerLossW = pOut * ((100.0 - efficiencyPercent) / efficiencyPercent);
      const rThetaJA = 25.0; // °C/W
      junctionTempC = tAmbient + powerLossW * rThetaJA;
    }

    // IPC-2221 PCB Trace Temp Rise
    const areaSqMils = traceWidthMm * 39.37 * 1.378; // 1oz copper
    const deltaTTrace = 0.048 * Math.pow(iLoadA, 1.15) * Math.pow(areaSqMils, -0.44) * 100;

    // LED Luminescence
    const vLedF = 2.0;
    const rBallast = 220.0;
    const iLedMa = Math.max(0, ((vOutNominal - vLedF) / rBallast) * 1000);
    const ledBrightness = Math.min(1.0, iLedMa / 20.0);

    const isThermalFault = junctionTempC > 100.0;

    // Digital Multimeter Readout Formatting
    let dmmText = "";
    if (dmmMode === "V") dmmText = `${vOutNominal.toFixed(2)} V`;
    else if (dmmMode === "mA") dmmText = `${iLoadMa} mA`;
    else if (dmmMode === "W") dmmText = `${powerLossW.toFixed(2)} W`;
    else dmmText = `${junctionTempC.toFixed(1)} °C`;

    return {
      vOut: vOutNominal,
      iLoadMa,
      powerLossW,
      junctionTempC,
      isThermalFault,
      ledBrightness,
      efficiencyPercent,
      traceTempRiseC: deltaTTrace,
      dmmText,
    };
  }, [simRunning, switchClosed, potRatio, vin, tAmbient, isBuckInstalled, traceWidthMm, dmmMode]);

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return ECE_CATALOG.filter((part) => {
      const matchCategory = selectedCategory === "All" || part.category === selectedCategory;
      const matchSearch =
        part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.footprint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.specs.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  const categories = ["All", "Regulators", "Power", "Semiconductors", "ICs", "Passives", "Sensors", "Microcontrollers"];

  // Submit Question to Copilot
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setCopilotLoading(true);

    try {
      const res = await api.ask(
        "circuit",
        q,
        {
          vin,
          vout: 5.0,
          iload_a: sim.iLoadMa / 1000.0,
          ambient_c: tAmbient,
          component_id: isBuckInstalled ? "BUCK_CONVERTER_TSR1" : "LM7805_LINEAR",
        },
        run?.id ?? "demo"
      );
      setChatLog((prev) => [
        ...prev,
        {
          q,
          a: res.answer,
          source: res.source,
        },
      ]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          q,
          a: `Calculated from Multisim first-principles: At Vin=${vin}V and Iload=${sim.iLoadMa}mA, regulator power loss is ${sim.powerLossW.toFixed(2)}W. Junction temperature is ${sim.junctionTempC.toFixed(1)}°C. ${
            sim.isThermalFault
              ? "The LM7805 is exceeding safe operating limits (Tj > 100°C). Swap to the TSR-1 Buck Module to drop temperatures down to 33°C."
              : "The circuit is currently operating well within thermal safety margins."
          }`,
          source: "physics_engine",
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="ece-studio-shell">
      {/* 1. TINKERCAD / MULTISIM TOP TOOLBAR */}
      <section className="eda-toolbar">
        <div className="eda-toolbar-left">
          {/* Start/Stop Simulation Button */}
          <button
            type="button"
            className={`btn-sim-toggle ${simRunning ? "running" : "stopped"}`}
            onClick={() => setSimRunning(!simRunning)}
            title={simRunning ? "Pause Circuit Simulation" : "Start Real-Time Circuit Simulation"}
          >
            {simRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            <span>{simRunning ? "Stop Simulation" : "Start Simulation"}</span>
            <span className={`sim-pulse-dot ${simRunning ? "active" : ""}`} />
          </button>

          {/* View Mode Switcher: Breadboard / Schematic / PCB */}
          <div className="eda-view-group" role="group" aria-label="View Mode">
            <button
              type="button"
              className={`view-btn ${viewMode === "breadboard" ? "active" : ""}`}
              onClick={() => setViewMode("breadboard")}
            >
              ⚪ Solderless Breadboard
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === "schematic" ? "active" : ""}`}
              onClick={() => setViewMode("schematic")}
            >
              📐 Schematic View
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === "pcb" ? "active" : ""}`}
              onClick={() => setViewMode("pcb")}
            >
              🟢 Soldered FR-4 PCB
            </button>
          </div>
        </div>

        <div className="eda-toolbar-right">
          {/* Wire Color Selector */}
          <div className="wire-color-picker" title="Select Jumper Wire Color">
            <span className="picker-label">Wire:</span>
            {(["red", "black", "green", "blue", "yellow"] as const).map((color) => (
              <button
                key={color}
                type="button"
                className={`color-dot color-${color} ${wireColor === color ? "selected" : ""}`}
                onClick={() => setWireColor(color)}
                aria-label={`${color} wire`}
              />
            ))}
          </div>

          {/* Reset Circuit */}
          <button
            type="button"
            className="eda-action-btn"
            onClick={() => {
              setVin(12.0);
              setPotRatio(0.65);
              setSwitchClosed(true);
              setIsBuckInstalled(false);
              setSimRunning(true);
            }}
            title="Reset circuit to initial conditions"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          {/* Master One-Click Fix Toggle */}
          <button
            type="button"
            className={`btn-apply-fix-top ${isBuckInstalled ? "revert" : "apply"}`}
            onClick={() => setIsBuckInstalled(!isBuckInstalled)}
          >
            <Zap size={14} />
            <span>{isBuckInstalled ? "Revert to Linear LM7805" : "⚡ Apply Buck Converter Fix"}</span>
          </button>
        </div>
      </section>

      {/* 2. PRIMARY WORKSPACE: INTERACTIVE CANVAS (LEFT) + INTELLIGENCE SIDEBAR (RIGHT) */}
      <div className="ece-workspace-layout">
        {/* Left Column: Interactive Circuit Canvas & Bench Instruments */}
        <div className="eda-canvas-column">
          {/* Main Interactive Circuit Stage */}
          <div className="circuit-stage-card">
            {/* Stage Status Header */}
            <div className="stage-header">
              <div className="stage-title-group">
                <span className="stage-badge">
                  {viewMode === "breadboard"
                    ? "SOLDERLESS BREADBOARD CANVAS"
                    : viewMode === "schematic"
                    ? "SPICE SCHEMATIC NETLIST"
                    : "FR-4 PCB COPPER ROUTING (1-OZ)"}
                </span>
                <h3>{isBuckInstalled ? "Active Circuit: TSR-1 2450 Buck Converter" : "Active Circuit: LM7805 Linear 5V Rail"}</h3>
              </div>
              <div className="stage-meters">
                <span className={`meter-pill ${sim.isThermalFault ? "fault" : "normal"}`}>
                  <Thermometer size={13} />
                  {sim.junctionTempC.toFixed(1)} °C
                  {sim.isThermalFault ? " (OVERHEATING)" : " (SAFE)"}
                </span>
                <span className="meter-pill efficiency">
                  <Activity size={13} />
                  {sim.efficiencyPercent.toFixed(1)}% Efficiency
                </span>
              </div>
            </div>

            {/* Interactive Schematic & Component Board */}
            <div className="interactive-board-viewport">
              {/* Bench DC Power Supply Block */}
              <div className="board-instrument power-supply-box">
                <div className="instrument-title">BENCH DC POWER SUPPLY</div>
                <div className="psu-display">
                  <div className="seven-seg">{vin.toFixed(1)} V</div>
                  <div className="seven-seg sub">{sim.iLoadMa} mA</div>
                </div>
                <div className="psu-controls">
                  <label>
                    <span>Vin: {vin.toFixed(1)} V</span>
                    <input
                      type="range"
                      min={5.0}
                      max={24.0}
                      step={0.5}
                      value={vin}
                      onChange={(e) => setVin(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              {/* Wire Path 1: PSU to Switch */}
              <div className="wire-segment psu-to-switch" style={{ borderColor: wireColor }} />

              {/* Interactive SPST Rocker Switch */}
              <div
                className={`board-component switch-box ${switchClosed ? "closed" : "open"}`}
                onClick={() => setSwitchClosed(!switchClosed)}
                role="button"
                tabIndex={0}
                title="Click to toggle power switch ON / OFF"
              >
                <div className="comp-label">SPST POWER SWITCH</div>
                <div className="rocker-switch">
                  <div className={`rocker-paddle ${switchClosed ? "on" : "off"}`}>
                    <span>{switchClosed ? "ON" : "OFF"}</span>
                  </div>
                </div>
                <small>{switchClosed ? "Circuit Closed (Current Flows)" : "Circuit Open (0 mA)"}</small>
              </div>

              {/* Wire Path 2: Switch to Regulator */}
              <div className="wire-segment switch-to-reg" style={{ borderColor: wireColor }} />

              {/* Active Regulator Socket */}
              <div className={`board-component regulator-box ${isBuckInstalled ? "buck" : "linear"}`}>
                <div className="comp-label">VOLTAGE REGULATION SOCKET</div>
                <div className="regulator-visual">
                  <div className={`part-icon-chip ${isBuckInstalled ? "buck-chip" : "linear-chip"}`}>
                    <Cpu size={24} />
                    <span>{isBuckInstalled ? "TSR 1-2450" : "LM7805"}</span>
                    <small>{isBuckInstalled ? "SIP-3 94% Buck" : "TO-220 Linear"}</small>
                  </div>
                  <div className={`thermal-indicator ${sim.isThermalFault ? "hot" : "cool"}`}>
                    <Flame size={14} />
                    <span>{sim.junctionTempC.toFixed(1)} °C</span>
                  </div>
                </div>
                <div className="regulator-pins">
                  <span>1: IN</span>
                  <span>2: GND</span>
                  <span>3: OUT</span>
                </div>
              </div>

              {/* Wire Path 3: Regulator to Potentiometer Load & LED */}
              <div className="wire-segment reg-to-load" style={{ borderColor: wireColor }} />

              {/* Interactive Potentiometer (Load Adjustment) */}
              <div className="board-component pot-box">
                <div className="comp-label">LOAD POTENTIOMETER (R_LOAD)</div>
                <div className="pot-dial-container">
                  <input
                    type="range"
                    min={0.1}
                    max={0.95}
                    step={0.01}
                    value={potRatio}
                    onChange={(e) => setPotRatio(parseFloat(e.target.value))}
                    className="pot-slider"
                  />
                  <div className="pot-readout">
                    <span>Load: {(10 + (1 - potRatio) * 100).toFixed(0)} Ω</span>
                    <strong>{sim.iLoadMa} mA</strong>
                  </div>
                </div>
                <small>Drag slider to vary load current</small>
              </div>

              {/* Wire Path 4: Regulator to Indicator LED */}
              <div className="wire-segment reg-to-led" style={{ borderColor: wireColor }} />

              {/* Functional Indicator LED */}
              <div className="board-component led-box">
                <div className="comp-label">5mm RED STATUS LED</div>
                <div className="led-lamp-fixture">
                  <div
                    className="led-bulb"
                    style={{
                      opacity: sim.ledBrightness > 0 ? 0.3 + sim.ledBrightness * 0.7 : 0.2,
                      boxShadow:
                        sim.ledBrightness > 0
                          ? `0 0 ${12 + sim.ledBrightness * 20}px rgba(239, 68, 68, ${sim.ledBrightness})`
                          : "none",
                    }}
                  />
                  <div className="led-base" />
                </div>
                <small>{sim.ledBrightness > 0 ? "Illuminated (5V Rail Active)" : "Dark (Unpowered)"}</small>
              </div>

              {/* Real Digital Multimeter (DMM) Instrument */}
              <div className="board-instrument multimeter-box">
                <div className="dmm-header">
                  <span className="instrument-title">DIGITAL MULTIMETER</span>
                  <div className="dmm-mode-selector">
                    <button
                      type="button"
                      className={`dmm-tab ${dmmMode === "V" ? "active" : ""}`}
                      onClick={() => setDmmMode("V")}
                    >
                      V
                    </button>
                    <button
                      type="button"
                      className={`dmm-tab ${dmmMode === "mA" ? "active" : ""}`}
                      onClick={() => setDmmMode("mA")}
                    >
                      mA
                    </button>
                    <button
                      type="button"
                      className={`dmm-tab ${dmmMode === "W" ? "active" : ""}`}
                      onClick={() => setDmmMode("W")}
                    >
                      W
                    </button>
                    <button
                      type="button"
                      className={`dmm-tab ${dmmMode === "degC" ? "active" : ""}`}
                      onClick={() => setDmmMode("degC")}
                    >
                      °C
                    </button>
                  </div>
                </div>
                <div className="dmm-screen">
                  <span className="dmm-lcd-text">{sim.dmmText}</span>
                  <span className="dmm-mode-label">{dmmMode === "degC" ? "THERMAL" : dmmMode}</span>
                </div>
                <div className="dmm-terminals">
                  <div className="terminal red-lead">
                    <span className="term-circle" />
                    <span>V/Ω/mA Probe (V_OUT)</span>
                  </div>
                  <div className="terminal black-lead">
                    <span className="term-circle" />
                    <span>COM Probe (GND)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bench Parameter Slider Bar */}
            <div className="bench-sliders-dock">
              <div className="dock-slider">
                <span className="slider-label">DC Input Voltage (Vin)</span>
                <div className="slider-row">
                  <input
                    type="range"
                    min={5.0}
                    max={24.0}
                    step={0.5}
                    value={vin}
                    onChange={(e) => setVin(parseFloat(e.target.value))}
                  />
                  <strong>{vin.toFixed(1)} V</strong>
                </div>
              </div>

              <div className="dock-slider">
                <span className="slider-label">Ambient Air Temp (Ta)</span>
                <div className="slider-row">
                  <input
                    type="range"
                    min={15}
                    max={60}
                    step={1}
                    value={tAmbient}
                    onChange={(e) => setTAmbient(parseInt(e.target.value, 10))}
                  />
                  <strong>{tAmbient} °C</strong>
                </div>
              </div>

              <div className="dock-slider">
                <span className="slider-label">PCB Trace Width</span>
                <div className="slider-row">
                  <input
                    type="range"
                    min={0.25}
                    max={3.0}
                    step={0.25}
                    value={traceWidthMm}
                    onChange={(e) => setTraceWidthMm(parseFloat(e.target.value))}
                  />
                  <strong>{traceWidthMm.toFixed(2)} mm</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Physical Geometry & Thermal Glow Viewport (Collapsible / Interactive) */}
          {run && (
            <div className="viewport-3d-card">
              <div className="card-header-bar">
                <div>
                  <span className="mini-badge">3D SPICE & THERMAL VIEWPORT</span>
                  <h4>Real-Time Thermal Dissipation Geometry</h4>
                </div>
                <div className="header-actions">
                  <span className={`status-pill ${sim.isThermalFault ? "fault" : "safe"}`}>
                    {sim.isThermalFault ? "🔥 THERMAL RUNAWAY" : "🟢 THERMALLY SAFE"}
                  </span>
                </div>
              </div>
              <div className="viewport-3d-frame">
                <Deferred3DViewport
                  run={run}
                  plan={run.candidate_plans_json[isBuckInstalled ? 0 : 1]}
                  layer={layer}
                  dark={false}
                  isPcb={viewMode === "pcb"}
                  isOverheating={sim.isThermalFault}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recommended Solution + Diagnosis + Component Tray + Copilot */}
        <div className="eda-sidebar-column">
          {/* 1. SINGLE RECOMMENDED SOLUTION (NO 3-PLAN NOISE) */}
          <div className="solution-hero-card">
            <div className="solution-badge">
              <Sparkles size={13} />
              <span>SINGLE RECOMMENDED SOLUTION</span>
            </div>
            <h3>TSR-1 2450 Switched Buck Converter</h3>
            <p className="solution-subtitle">
              Pin-compatible SIP-3 drop-in replacement. Eliminates bulky heatsinks and cuts thermal dissipation by 95.5%.
            </p>

            {/* Quantitative Scorecard */}
            <div className="scorecard-grid">
              <div className="score-item">
                <span className="score-label">Efficiency</span>
                <div className="score-diff">
                  <span className="old-val">41.7%</span>
                  <ArrowRight size={12} />
                  <span className="new-val good">94.0%</span>
                </div>
              </div>

              <div className="score-item">
                <span className="score-label">Junction Temp</span>
                <div className="score-diff">
                  <span className="old-val hot">118.2 °C</span>
                  <ArrowRight size={12} />
                  <span className="new-val cool">32.8 °C</span>
                </div>
              </div>

              <div className="score-item">
                <span className="score-label">Power Wasted</span>
                <div className="score-diff">
                  <span className="old-val hot">2.45 W</span>
                  <ArrowRight size={12} />
                  <span className="new-val cool">0.11 W</span>
                </div>
              </div>
            </div>

            {/* Single Click Apply Button */}
            <button
              type="button"
              className={`btn-apply-hero ${isBuckInstalled ? "active-fix" : ""}`}
              onClick={() => setIsBuckInstalled(!isBuckInstalled)}
            >
              <Zap size={16} />
              <span>{isBuckInstalled ? "Fix Applied: TSR-1 Buck Active (Click to Revert)" : "⚡ Apply Recommended Fix to Board"}</span>
            </button>
          </div>

          {/* 2. FIRST-PRINCIPLES DIAGNOSIS */}
          <div className="diagnosis-clean-card">
            <div className="diag-header">
              <Info size={15} />
              <h4>Circuit Diagnostics & Physics Breakdown</h4>
            </div>
            <ul className="diag-points">
              <li>
                <strong>What is happening:</strong> Dropping ({vin}V - 5V) = {(vin - 5).toFixed(1)}V across the internal pass transistor at {sim.iLoadMa} mA load.
              </li>
              <li>
                <strong>Why it fails:</strong> The LM7805 converts excess voltage into {sim.powerLossW.toFixed(2)} W of pure waste heat. Under thermal resistance of RθJA=36°C/W, junction temperature reaches {sim.junctionTempC.toFixed(1)}°C, triggering thermal protection shutdown.
              </li>
              <li>
                <strong>The Fix:</strong> Switched inductor bucking charges and discharges energy magnetically with 94% efficiency, virtually eliminating thermal dissipation without changing PCB layout.
              </li>
            </ul>
          </div>

          {/* 3. TINKERCAD-STYLE COMPONENT DRAWER */}
          <div className="component-tray-card">
            <div className="tray-header">
              <div className="tray-title-row">
                <Cpu size={15} />
                <h4>Component Library</h4>
                <span className="part-count">({filteredCatalog.length} parts)</span>
              </div>
              <div className="search-box">
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search 7805, Buck, 555, BJT, ESP32..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="category-scroll">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Component Cards Grid */}
            <div className="tray-grid">
              {filteredCatalog.map((part) => (
                <div
                  key={part.id}
                  className={`tray-part-card ${selectedDrawerPart.id === part.id ? "selected" : ""}`}
                  onClick={() => setSelectedDrawerPart(part)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="part-card-top">
                    <span className="part-name">{part.name}</span>
                    <span className="part-footprint">{part.footprint}</span>
                  </div>
                  <div className="part-specs">{part.specs}</div>
                  <p className="part-desc">{part.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. CIRCUIT ASSISTANT (COPILOT) */}
          <div className="copilot-card">
            <div className="copilot-header">
              <Sparkles size={14} />
              <h4>Circuit Assistant</h4>
            </div>
            <div className="chat-thread">
              {chatLog.map((chat, idx) => (
                <div key={idx} className="chat-bubble-pair">
                  <div className="chat-q">
                    <span>Q: {chat.q}</span>
                  </div>
                  <div className="chat-a">
                    <p>{chat.a}</p>
                  </div>
                </div>
              ))}
            </div>
            <form className="copilot-input-form" onSubmit={handleAskQuestion}>
              <input
                type="text"
                placeholder="Ask about thermal runaway, capacitor sizing..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button type="submit" disabled={copilotLoading || !question.trim()}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
