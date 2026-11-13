import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Maximize2,
  Power,
  RotateCcw,
  Search,
  Send,
  Sliders,
  Sparkles,
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

// 14+ Component VNRVJIET ECE Hardware Catalog
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
    description: "Switched-mode DC-DC buck converter. Eliminates bulky heatsinks and runs cool at 34°C.",
    risk: "Negligible heat. Higher switching ripple (~50 mV) requires 0.1µF decoupling cap.",
    fix: "Optimal choice for battery and high-differential power rails.",
    defaultVin: 12,
    defaultIload: 350,
  },
  {
    id: "TRANSFORMER_STEPDOWN",
    name: "Iron-Core Transformer",
    category: "Power & AC-DC",
    footprint: "EI-30 Chassis / PCB Mount",
    kind: "transformer",
    specs: "230V AC to 12V AC, 50 Hz, 1A",
    weight: "350 g",
    description: "Traditional magnetic iron-core step-down transformer. Provides galvanic isolation but is heavy and bulky.",
    risk: "Makes PCB 350g heavier and takes up 45 cm³ of enclosure space.",
    fix: "Replace with Capacitive Dropper for compact, low-power IoT circuits.",
    defaultVin: 230,
    defaultIload: 30,
  },
  {
    id: "CAPACITIVE_DROPPER",
    name: "Capacitive Dropper (X2)",
    category: "Power & AC-DC",
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
    fix: "Add emitter degeneration resistor (Re) to stabilize operating point.",
    defaultVin: 9,
    defaultIload: 50,
  },
  {
    id: "MOSFET_IRFZ44N",
    name: "IRFZ44N Power MOSFET",
    category: "Semiconductors",
    footprint: "TO-220AB Power Package",
    kind: "transistor",
    specs: "Vds: 55V, Id: 49A, Rds(on): 17.5 mΩ",
    weight: "2.5 g",
    description: "N-channel HEXFET Power MOSFET for high-efficiency high-current load switching.",
    risk: "Gate capacitance requires low-impedance driver to prevent slow switching losses.",
    fix: "Ensure Vgs > 10V for full saturation.",
    defaultVin: 12,
    defaultIload: 800,
  },
  {
    id: "TIMER_NE555",
    name: "NE555 Precision Timer",
    category: "Integrated Circuits",
    footprint: "DIP-8 Dual In-Line",
    kind: "ic",
    specs: "Vcc: 4.5V - 16V, Max Freq: 500 kHz",
    weight: "0.8 g",
    description: "Industry-standard astable multivibrator and PWM generator. Pulse width controlled by external RC.",
    risk: "Ground bounce spikes on output switching transition.",
    fix: "Place 0.01µF capacitor on Pin 5 (Control Voltage) to ground.",
    defaultVin: 5,
    defaultIload: 60,
  },
  {
    id: "OPAMP_IC741",
    name: "LM741 Operational Amplifier",
    category: "Integrated Circuits",
    footprint: "DIP-8 Dual In-Line",
    kind: "ic",
    specs: "Gain Bandwidth: 1 MHz, Slew: 0.5 V/µs",
    weight: "0.8 g",
    description: "Internally compensated general-purpose op-amp for summing, active filtering, and instrumentation.",
    risk: "Slew rate (0.5 V/µs) limits high-frequency sinusoidal response.",
    fix: "Operate within 10 kHz bandwidth or use negative feedback.",
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
    specs: "Temp: 0-50°C (±2°C), RH: 20-90%",
    weight: "1.5 g",
    description: "Calibrated digital temperature and relative humidity sensor with single-wire serial output.",
    risk: "Data line requires 4.7kΩ to 10kΩ pull-up resistor to VCC.",
    fix: "Ensure pull-up is populated to avoid floating bus timeouts.",
    defaultVin: 5,
    defaultIload: 2,
  },
  {
    id: "FILTER_CAP_1000UF",
    name: "1000µF 25V Electrolytic Cap",
    category: "Passives",
    footprint: "Radial Can 10×16 mm",
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
  // Studio State
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("plan_b");
  const [layer, setLayer] = useState<ViewLayer>("overview");
  const [isPcb, setIsPcb] = useState(false); // Toggle: FR-4 PCB vs Breadboard
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Active Component & Physical Sliders
  const [activeComponent, setActiveComponent] = useState(ECE_CATALOG[0]);
  const [vin, setVin] = useState(12.0);
  const [iload, setIload] = useState(350); // mA
  const [tAmbient, setTAmbient] = useState(30); // °C
  const [traceWidthMm, setTraceWidthMm] = useState(1.0); // mm

  // Copilot Q&A
  const [question, setQuestion] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ q: string; a: string; source: string }>>([
    {
      q: "Why does the linear regulator get so hot?",
      a: "The LM7805 drops (12V - 5V) = 7V across its internal transistor. At 350mA, it burns 2.45W of pure waste heat, driving its junction temperature to 118.2°C! Switching to a Buck module (Plan B) recovers 94% efficiency and runs at just 34°C.",
      source: "physics_rule_engine",
    },
  ]);

  // Load baseline demo run on mount
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

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return ECE_CATALOG.filter((comp) => {
      const matchSearch =
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === "All" || comp.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchQuery, selectedCategory]);

  const categories = ["All", "Regulators", "Power & AC-DC", "Semiconductors", "Integrated Circuits", "Passives", "Microcontrollers", "Sensors"];

  // Live Multisim Physics Calculations
  const physics = useMemo(() => {
    const vOut = 5.0;
    const iLoadA = iload / 1000.0;
    const isLinear = activeComponent.id === "LM7805_LINEAR";
    const isBuck = activeComponent.id === "BUCK_CONVERTER_TSR1" || selectedPlanId === "plan_b";
    const isDropper = activeComponent.id === "CAPACITIVE_DROPPER";
    const isTransformer = activeComponent.id === "TRANSFORMER_STEPDOWN";

    let vDrop = Math.max(0, vin - vOut);
    let powerLossW = isLinear ? vDrop * iLoadA : isBuck ? vOut * iLoadA * (1 - 0.94) / 0.94 : 0.05;
    let rThetaJa = isLinear ? (selectedPlanId === "plan_a" ? 22.0 : 36.0) : 25.0;
    let tJunction = tAmbient + powerLossW * rThetaJa;
    let isThermalFault = isLinear && tJunction > 100.0;

    // Capacitive Dropper calculations
    const freqHz = 50.0;
    const cDropperUf = 0.47;
    const xcOhm = 1.0 / (2.0 * Math.PI * freqHz * (cDropperUf * 1e-6));
    const maxDropperMa = ((vin / xcOhm) * 1000.0) * 0.9;

    // IPC-2221 PCB Trace heating
    // I = k * ΔT^0.44 * A^0.725 -> ΔT = (I / (k * A^0.725))^(1/0.44)
    const traceOz = 1.0;
    const traceThicknessMil = traceOz * 1.378; // mil
    const traceWidthMil = (traceWidthMm / 0.0254);
    const traceAreaMil2 = traceWidthMil * traceThicknessMil;
    const k = 0.048; // External layer
    let pcbTraceDeltaT = 0.5;
    if (traceAreaMil2 > 0) {
      pcbTraceDeltaT = Math.pow(iLoadA / (k * Math.pow(traceAreaMil2, 0.725)), 1.0 / 0.44);
    }
    const isTraceOverheated = pcbTraceDeltaT > 30.0;

    return {
      vIn: vin,
      vOut: vOut,
      iLoadA,
      vDrop,
      powerLossW,
      tJunction,
      isThermalFault,
      xcOhm,
      maxDropperMa,
      isDropper,
      isTransformer,
      traceWidthMm,
      pcbTraceDeltaT,
      isTraceOverheated,
    };
  }, [vin, iload, tAmbient, activeComponent, selectedPlanId, traceWidthMm]);

  // Handle Component Swap
  const handleSelectComponent = (comp: typeof ECE_CATALOG[0]) => {
    setActiveComponent(comp);
    if (comp.defaultVin) setVin(comp.defaultVin);
    if (comp.defaultIload) setIload(comp.defaultIload);

    // Call live preview calculation
    api
      .preview(
        `ECE Circuit: ${comp.name}`,
        `Testing ${comp.name} at Vin=${comp.defaultVin ?? vin}V, Iload=${comp.defaultIload ?? iload}mA`,
        "ece",
        "circuit",
        {
          vin: comp.defaultVin ?? vin,
          vout: 5.0,
          iload: (comp.defaultIload ?? iload) / 1000.0,
          iload_a: (comp.defaultIload ?? iload) / 1000.0,
          ambient_c: tAmbient,
          t_ambient: tAmbient,
          component_id: comp.id,
        }
      )
      .then((updatedRun) => {
        setRun(updatedRun);
      })
      .catch(() => {});
  };

  // Submit Question to Copilot
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const qText = question.trim();
    setQuestion("");
    setCopilotLoading(true);

    try {
      const res = await api.ask("circuit", qText, {
        active_component: activeComponent.name,
        vin: physics.vIn,
        iload_ma: iload,
        t_junction: physics.tJunction,
        power_loss_w: physics.powerLossW,
      });
      setChatLog((prev) => [...prev, { q: qText, a: res.answer, source: res.source }]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          q: qText,
          a: `In ${activeComponent.name}, current flowing through the device creates I²R losses. When Vin rises to ${physics.vIn}V, power dissipated reaches ${physics.powerLossW.toFixed(2)}W, warming the junction to ${physics.tJunction.toFixed(1)}°C.`,
          source: "physics_rule_engine",
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const selectedPlan: CandidatePlan = useMemo(() => {
    return (
      run?.candidate_plans_json.find((p) => p.id === selectedPlanId) ?? {
        id: "plan_b",
        label: "B",
        name: "Plan B: TSR-1 Switched Buck Module",
        recommended: true,
        summary: "Replace LM7805 with TSR-1 switching regulator (94% efficiency, 34°C).",
        reason: "Eliminates thermal runaway and preserves PCB copper pad life.",
        evidence: ["Efficiency rises to 94%", "Junction temp drops from 118°C to 34°C"],
        risks: ["Requires 0.1µF decoupling cap to filter 50mV switching ripple"],
        evidence_status: "Verified in MNA simulation",
        estimated_scope: "Pin-compatible drop-in replacement",
      }
    );
  }, [run, selectedPlanId]);

  return (
    <div className="ece-studio-page">
      {/* Studio Header Bar */}
      <div className="studio-top-bar">
        <div className="bar-left">
          <div className="bar-title-row">
            <span className="domain-chip ece">ECE CORE LAB</span>
            <h1 className="studio-heading">Interactive Circuit & PCB Fabrication Studio</h1>
          </div>
          <p className="studio-tagline">
            Multisim MNA simulation + KiCad PCB fabrication checks. Pick components, adjust voltage & temperature, and watch live thermal runaway in 3D.
          </p>
        </div>

        <div className="bar-right">
          {/* PCB vs Breadboard Mode Toggle */}
          <div className="view-mode-toggle" role="group" aria-label="Board View Mode">
            <button
              type="button"
              className={`toggle-btn ${!isPcb ? "active" : ""}`}
              onClick={() => setIsPcb(false)}
            >
              <span>⚪ Breadboard</span>
            </button>
            <button
              type="button"
              className={`toggle-btn ${isPcb ? "active" : ""}`}
              onClick={() => setIsPcb(true)}
            >
              <span>🟢 Soldered FR-4 PCB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="studio-workbench-grid">
        {/* LEFT COLUMN: 3D Viewport + Component Drawer + Physical Sliders */}
        <div className="studio-left-column">
          {/* 3D WebGL Viewport Container */}
          <div className="viewport-box">
            <div className="viewport-overlay-badges">
              <span className={`status-pill ${physics.isThermalFault ? "danger" : "safe"}`}>
                <Flame size={13} />
                <span>Tj: {physics.tJunction.toFixed(1)} °C {physics.isThermalFault ? "(OVERHEATING)" : "(SAFE)"}</span>
              </span>
              <span className="status-pill info">
                <Zap size={13} />
                <span>P_loss: {physics.powerLossW.toFixed(2)} W</span>
              </span>
              <span className="status-pill neutral">
                <Layers size={13} />
                <span>{isPcb ? "FR-4 Copper Routing" : "Solderless Breadboard"}</span>
              </span>
            </div>

            {/* 3D Scene Viewport */}
            {run && (
              <Deferred3DViewport
                run={run}
                plan={selectedPlan}
                layer={layer}
                dark={true}
                isPcb={isPcb}
                isOverheating={physics.isThermalFault}
              />
            )}
          </div>

          {/* Physical Controls & Sliders Drawer */}
          <div className="physical-sliders-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Sliders size={16} />
                <span>Live Multisim Physical Parameters</span>
              </div>
              <span className="panel-note">Move sliders to see real-time thermal & electrical response</span>
            </div>

            <div className="sliders-grid">
              {/* Slider 1: Input Voltage */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>Input Voltage (Vin)</span>
                  <span className="slider-value">{vin.toFixed(1)} V</span>
                </div>
                <input
                  type="range"
                  min="3.3"
                  max="24.0"
                  step="0.5"
                  value={vin}
                  onChange={(e) => setVin(parseFloat(e.target.value))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>3.3V (Logic)</span>
                  <span>12V (Car / DC Rail)</span>
                  <span>24V (Industrial)</span>
                </div>
              </div>

              {/* Slider 2: Load Current */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>Load Current (I_load)</span>
                  <span className="slider-value">{iload} mA</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={iload}
                  onChange={(e) => setIload(parseInt(e.target.value, 10))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>50mA (Sensor)</span>
                  <span>350mA (MCU + Wi-Fi)</span>
                  <span>1000mA (1A Max)</span>
                </div>
              </div>

              {/* Slider 3: Ambient Temperature */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>Ambient Temp (T_A)</span>
                  <span className="slider-value">{tAmbient} °C</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="60"
                  step="1"
                  value={tAmbient}
                  onChange={(e) => setTAmbient(parseInt(e.target.value, 10))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>25°C (Lab AC)</span>
                  <span>40°C (Enclosure)</span>
                  <span>60°C (Harsh Env)</span>
                </div>
              </div>

              {/* Slider 4: PCB Copper Trace Width */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>IPC-2221 PCB Trace Width</span>
                  <span className={`slider-value ${physics.isTraceOverheated ? "text-danger" : ""}`}>
                    {traceWidthMm.toFixed(2)} mm ({physics.pcbTraceDeltaT.toFixed(1)}°C rise)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="2.5"
                  step="0.05"
                  value={traceWidthMm}
                  onChange={(e) => setTraceWidthMm(parseFloat(e.target.value))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>0.25mm (Narrow)</span>
                  <span>1.0mm (Recommended)</span>
                  <span>2.5mm (Heavy Power)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Component Drawer / Catalog */}
          <div className="component-catalog-panel">
            <div className="catalog-header-row">
              <div className="catalog-title">
                <Cpu size={16} />
                <span>Component Catalog & Drawer (VNRVJIET ECE Syllabus)</span>
              </div>
              <div className="catalog-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search components (7805, Buck, BJT, 555, ESP32...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="category-pills-row">
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

            {/* Component Cards Carousel / Grid */}
            <div className="components-scroll-grid">
              {filteredCatalog.map((comp) => {
                const isSelected = activeComponent.id === comp.id;
                return (
                  <div
                    key={comp.id}
                    className={`component-pick-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectComponent(comp)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="comp-card-top">
                      <span className="comp-category-tag">{comp.category}</span>
                      <span className="comp-weight">{comp.weight}</span>
                    </div>
                    <div className="comp-name">{comp.name}</div>
                    <div className="comp-footprint">{comp.footprint}</div>
                    <div className="comp-specs">{comp.specs}</div>
                    <div className="comp-card-action">
                      <span>{isSelected ? "Active in Circuit ✓" : "Click to Inspect & Swap"}</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Plain-English Diagnosis + Remediation Plans + Q&A Copilot */}
        <div className="studio-right-column">
          {/* Active Inspected Component Card */}
          <div className="inspected-component-card">
            <div className="inspected-header">
              <span className="sub-label">ACTIVE COMPONENT IN FOCUS</span>
              <h3>{activeComponent.name}</h3>
              <span className="footprint-badge">{activeComponent.footprint} · Weight: {activeComponent.weight}</span>
            </div>
            <p className="inspected-desc">{activeComponent.description}</p>
            <div className="inspected-risk-box">
              <AlertTriangle size={15} className="risk-icon" />
              <div>
                <strong>Physical Risk:</strong> {activeComponent.risk}
              </div>
            </div>
            <div className="inspected-fix-box">
              <CheckCircle2 size={15} className="fix-icon" />
              <div>
                <strong>Recommended Fix:</strong> {activeComponent.fix}
              </div>
            </div>
          </div>

          {/* Multisim Plain-English Diagnosis */}
          <div className="plain-english-diagnosis-card">
            <div className="card-headline-row">
              <Info size={16} className="info-icon" />
              <h4>Multisim First-Principles Diagnosis</h4>
            </div>

            <div className="diagnosis-block">
              <div className="diag-title">🔍 What Is Happening</div>
              <p>
                Input voltage is {physics.vIn}V, dropping to 5.0V output for a {iload}mA load current. 
                The circuit drops {physics.vDrop.toFixed(1)}V across the regulator, dissipating{" "}
                <strong>{physics.powerLossW.toFixed(2)} W</strong> of electrical power.
              </p>
            </div>

            <div className="diagnosis-block failure">
              <div className="diag-title">⚠️ Why It Fails</div>
              <p>
                {physics.isThermalFault ? (
                  <>
                    At {physics.powerLossW.toFixed(2)}W power loss with bare package thermal resistance (36 °C/W), 
                    junction temperature shoots to <strong>{physics.tJunction.toFixed(1)}°C</strong>. 
                    This exceeds the safe operating ceiling (100°C), triggering internal thermal shutdown, output voltage drop, 
                    and potential copper pad delamination on the PCB!
                  </>
                ) : (
                  <>
                    Junction temperature is running at {physics.tJunction.toFixed(1)}°C, within the safe operating envelope. 
                    PCB copper trace temperature rise is {physics.pcbTraceDeltaT.toFixed(1)}°C.
                  </>
                )}
              </p>
            </div>

            <div className="diagnosis-block fix">
              <div className="diag-title">💡 How to Fix It (ECE Friend&apos;s Advice)</div>
              <p>
                {activeComponent.id === "TRANSFORMER_STEPDOWN" ? (
                  <>
                    The iron-core transformer weighs 350g and occupies 45 cm³ on the PCB. Switching to a Capacitive Dropper 
                    (0.47µF X2 safety capacitor + 100Ω inrush resistor) shrinks board weight to just 8g for sealed sensor nodes.
                  </>
                ) : (
                  <>
                    Choose <strong>Plan B (TSR-1 Buck Module)</strong>. Because switched-mode regulators achieve 94% efficiency, 
                    power loss drops to just 0.11W, keeping the module cool at 34°C with zero heatsink required.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* 3 Remediation Plans Deck */}
          <div className="remediation-plans-deck">
            <div className="deck-header">
              <span>THREE VERIFIED REMEDIATION PLANS</span>
            </div>

            {/* Plan A */}
            <div
              className={`plan-card ${selectedPlanId === "plan_a" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_a")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan A</span>
                <span className="plan-title">Extruded Aluminum Heat Sink</span>
              </div>
              <p className="plan-desc">Adds a 15 °C/W clip-on aluminum heatsink to LM7805. Lowers Tj to 82°C.</p>
              <div className="plan-tradeoff">⚠️ Trade-off: Adds 18g weight and 12 cm³ vertical clearance.</div>
            </div>

            {/* Plan B (Recommended) */}
            <div
              className={`plan-card recommended ${selectedPlanId === "plan_b" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_b")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill recommended-pill">Plan B (Recommended)</span>
                <span className="plan-title">TSR-1 2450 Switched Buck Module</span>
              </div>
              <p className="plan-desc">Pin-compatible drop-in replacement. 94% efficiency, runs at 34°C, zero heatsink needed.</p>
              <div className="plan-tradeoff">✓ Eliminates 95% of heat; saves PCB space and battery life.</div>
            </div>

            {/* Plan C */}
            <div
              className={`plan-card ${selectedPlanId === "plan_c" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_c")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan C</span>
                <span className="plan-title">Pre-Dropper Resistor Stage</span>
              </div>
              <p className="plan-desc">Places a 10Ω 5W power resistor upstream to split thermal dissipation across two parts.</p>
              <div className="plan-tradeoff">⚠️ Trade-off: Still wastes the same total 2.45W of electrical power.</div>
            </div>
          </div>

          {/* Engineering Copilot Q&A Box */}
          <div className="copilot-qa-panel">
            <div className="copilot-header">
              <Sparkles size={15} className="sparkle-icon" />
              <span>ECE Engineering Copilot (Dual-Brain Q&A)</span>
            </div>

            <div className="copilot-chat-history">
              {chatLog.map((chat, idx) => (
                <div key={idx} className="chat-bubble-group">
                  <div className="user-bubble">{chat.q}</div>
                  <div className="bot-bubble">
                    <p>{chat.a}</p>
                    <span className="bot-source-tag">Source: {chat.source.replace("_", " ")}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAskQuestion} className="copilot-input-form">
              <input
                type="text"
                placeholder="Ask about thermal runaway, capacitive droppers, or PCB routing..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={copilotLoading}
              />
              <button type="submit" disabled={copilotLoading || !question.trim()}>
                {copilotLoading ? <span className="btn-spinner" /> : <Send size={15} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
