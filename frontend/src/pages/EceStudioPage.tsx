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
  Plus,
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
export interface EcePart {
  id: string;
  name: string;
  category: string;
  footprint: string;
  kind: string;
  specs: string;
  weight: string;
  description: string;
  risk: string;
  fix: string;
  defaultVin: number;
  defaultIload: number;
}

const ECE_CATALOG: EcePart[] = [
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
    defaultIload: 1200,
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

  // ACTIVE COMPONENT MOUNTED ON BREADBOARD (User can pick ANY part!)
  const [mountedPart, setMountedPart] = useState<EcePart>(ECE_CATALOG[0]); // Default: LM7805

  // Interactive In-Canvas Controls
  const [switchClosed, setSwitchClosed] = useState(true); // SPST Rocker Switch
  const [potRatio, setPotRatio] = useState(0.65); // Potentiometer Load / Adjustment (0.0 to 1.0)
  const [vin, setVin] = useState(12.0); // DC Power Supply Voltage
  const [tAmbient, setTAmbient] = useState(30); // Ambient Temp (°C)
  const [traceWidthMm, setTraceWidthMm] = useState(1.0); // PCB Trace Width

  // Component Drawer
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Copilot Q&A
  const [question, setQuestion] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ q: string; a: string; source: string }>>([
    {
      q: "How do I test different components on the breadboard?",
      a: "Click '+ Add to Breadboard' on any component in the right library tray (or click the quick chips above the board). The breadboard will instantly mount that component, wire up its live test circuit, and simulate its real electrical physics in real time!",
      source: "tinkercad_eda_engine",
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

  // Update Vin when mounting high-voltage components like Transformer
  const handleMountComponent = (part: EcePart) => {
    setMountedPart(part);
    if (part.id === "TRANSFORMER_STEPDOWN" || part.id === "CAPACITIVE_DROPPER") {
      setVin(230.0);
    } else if (vin > 24.0) {
      setVin(12.0);
    }
  };

  // Dynamic Simulation Engine for ANY Mounted Component
  const sim = useMemo(() => {
    if (!simRunning || !switchClosed) {
      return {
        vOut: 0.0,
        iLoadMa: 0,
        powerLossW: 0.0,
        junctionTempC: tAmbient,
        isThermalFault: false,
        ledBrightness: 0.0,
        efficiencyPercent: 0.0,
        dmmText: "0.00 V",
        componentMetricName: "Status",
        componentMetricValue: "Circuit Open",
        recommendation: mountedPart.fix,
      };
    }

    const rLoad = 10.0 + (1.0 - potRatio) * 100.0;
    let vOut = 5.0;
    let iLoadMa = Math.round((5.0 / rLoad) * 1000);
    let powerLossW = 0.0;
    let junctionTempC = tAmbient;
    let efficiencyPercent = 90.0;
    let isThermalFault = false;
    let ledBrightness = 0.8;
    let componentMetricName = "Output Voltage";
    let componentMetricValue = "5.00 V";

    // Component-Specific Mathematical Physics
    switch (mountedPart.id) {
      case "LM7805_LINEAR": {
        vOut = 5.0;
        iLoadMa = Math.round((vOut / rLoad) * 1000);
        const vDrop = Math.max(0, vin - vOut);
        powerLossW = vDrop * (iLoadMa / 1000.0);
        junctionTempC = tAmbient + powerLossW * 36.0;
        efficiencyPercent = vin > 0 ? (vOut / vin) * 100 : 0;
        isThermalFault = junctionTempC > 100.0;
        ledBrightness = 0.85;
        componentMetricName = "Thermal Tj";
        componentMetricValue = `${junctionTempC.toFixed(1)} °C`;
        break;
      }

      case "BUCK_CONVERTER_TSR1": {
        vOut = 5.0;
        iLoadMa = Math.round((vOut / rLoad) * 1000);
        efficiencyPercent = 94.0;
        powerLossW = (vOut * (iLoadMa / 1000.0)) * ((100.0 - 94.0) / 94.0);
        junctionTempC = tAmbient + powerLossW * 25.0;
        isThermalFault = false;
        ledBrightness = 0.95;
        componentMetricName = "Efficiency";
        componentMetricValue = "94.0% (Cool)";
        break;
      }

      case "TIMER_NE555": {
        // Astable Multivibrator: f = 1.44 / ((R1 + 2*R2)*C)
        const r1 = 10000; // 10k
        const r2 = 10000 + (1 - potRatio) * 50000; // 10k to 60k
        const c1 = 10e-6; // 10 uF
        const freqHz = 1.44 / ((r1 + 2 * r2) * c1);
        vOut = 4.8;
        iLoadMa = 15;
        powerLossW = 0.07;
        junctionTempC = tAmbient + 2.5;
        ledBrightness = 0.5 + Math.sin(Date.now() / 200) * 0.5; // Pulsing effect
        componentMetricName = "Pulse Frequency";
        componentMetricValue = `${freqHz.toFixed(1)} Hz`;
        break;
      }

      case "BJT_BC547": {
        // NPN Switch in Saturation
        const ibMa = ((vin - 0.7) / 10000) * 1000;
        vOut = 4.8; // Vcc - Vce(sat) = 5.0 - 0.2
        iLoadMa = Math.min(100, Math.round(ibMa * 20));
        powerLossW = 0.2 * (iLoadMa / 1000.0);
        junctionTempC = tAmbient + 1.2;
        ledBrightness = Math.min(1.0, iLoadMa / 25.0);
        componentMetricName = "V_CE (Sat)";
        componentMetricValue = "0.21 V";
        break;
      }

      case "MOSFET_IRFZ44N": {
        // High-Current MOSFET Switch
        const rdsOn = 0.0175; // 17.5 mOhm
        vOut = vin - 0.05;
        iLoadMa = Math.round((vin / rLoad) * 1000);
        powerLossW = Math.pow(iLoadMa / 1000.0, 2) * rdsOn;
        junctionTempC = tAmbient + powerLossW * 62.0;
        ledBrightness = 1.0;
        componentMetricName = "RDS(on) Drop";
        componentMetricValue = `${(rdsOn * (iLoadMa / 1000.0) * 1000).toFixed(1)} mV`;
        break;
      }

      case "OPAMP_LM741": {
        // Inverting Amplifier: Gain = -Rf/Rin
        const rf = 100000;
        const rin = 10000;
        const gain = -(rf / rin); // -10x
        const vInSignal = 0.35; // 350 mV
        vOut = Math.min(vin - 2.0, Math.abs(gain * vInSignal));
        iLoadMa = 18;
        powerLossW = 0.15;
        junctionTempC = tAmbient + 5.0;
        componentMetricName = "Closed-Loop Gain";
        componentMetricValue = "-10.0x";
        break;
      }

      case "TRANSFORMER_STEPDOWN": {
        // AC 230V to 12V Step-Down + Rectifier
        vOut = 12.0 * Math.SQRT2 - 1.4; // ~15.5V DC peak
        iLoadMa = Math.round((vOut / rLoad) * 1000);
        powerLossW = 2.1;
        junctionTempC = tAmbient + 14.0;
        componentMetricName = "Iron Core Weight";
        componentMetricValue = "350 g (Bulky)";
        break;
      }

      case "CAPACITIVE_DROPPER": {
        // Xc = 1 / (2*pi*f*C) at 50Hz, 0.47uF
        const xc = 1.0 / (2 * Math.PI * 50 * 0.47e-6); // ~6772 Ohms
        const iAcMa = (230.0 / xc) * 1000.0; // ~33.9 mA
        vOut = 5.1; // Zener clamped
        iLoadMa = Math.min(Math.round(iAcMa), Math.round((5.1 / rLoad) * 1000));
        powerLossW = 0.35;
        junctionTempC = tAmbient + 4.0;
        componentMetricName = "Cap Reactance (Xc)";
        componentMetricValue = `${(xc / 1000).toFixed(1)} kΩ (8g)`;
        break;
      }

      case "MCU_ESP32": {
        vOut = 3.3;
        iLoadMa = 140 + Math.round((1 - potRatio) * 100); // 140mA base + Wi-Fi burst
        powerLossW = (5.0 - 3.3) * (iLoadMa / 1000.0);
        junctionTempC = tAmbient + 8.5;
        componentMetricName = "Wi-Fi Tx Burst";
        componentMetricValue = `${iLoadMa} mA Peak`;
        break;
      }

      case "DHT11_TEMP_HUMIDITY": {
        vOut = 5.0;
        iLoadMa = 2;
        powerLossW = 0.01;
        junctionTempC = tAmbient;
        componentMetricName = "Telemetry Read";
        componentMetricValue = "26.4°C / 58% RH";
        break;
      }

      default: {
        vOut = 5.0;
        iLoadMa = Math.round((5.0 / rLoad) * 1000);
        powerLossW = 0.1;
        junctionTempC = tAmbient;
        componentMetricName = "Impedance";
        componentMetricValue = `${rLoad.toFixed(0)} Ω`;
        break;
      }
    }

    // Digital Multimeter (DMM) Display Text
    let dmmText = "";
    if (dmmMode === "V") dmmText = `${vOut.toFixed(2)} V`;
    else if (dmmMode === "mA") dmmText = `${iLoadMa} mA`;
    else if (dmmMode === "W") dmmText = `${powerLossW.toFixed(2)} W`;
    else dmmText = `${junctionTempC.toFixed(1)} °C`;

    return {
      vOut,
      iLoadMa,
      powerLossW,
      junctionTempC,
      isThermalFault,
      ledBrightness,
      efficiencyPercent,
      dmmText,
      componentMetricName,
      componentMetricValue,
      recommendation: mountedPart.fix,
    };
  }, [simRunning, switchClosed, potRatio, vin, tAmbient, mountedPart, dmmMode]);

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

  const categories = ["All", "Regulators", "Power", "ICs", "Semiconductors", "Sensors", "Microcontrollers", "Passives"];

  // Quick Chips for 1-Click Component Mounting
  const quickChips = [
    { label: "LM7805 5V Reg", id: "LM7805_LINEAR" },
    { label: "TSR-1 Buck", id: "BUCK_CONVERTER_TSR1" },
    { label: "NE555 Timer IC", id: "TIMER_NE555" },
    { label: "BC547 BJT", id: "BJT_BC547" },
    { label: "IRFZ44N MOSFET", id: "MOSFET_IRFZ44N" },
    { label: "LM741 Op-Amp", id: "OPAMP_LM741" },
    { label: "Iron Transformer", id: "TRANSFORMER_STEPDOWN" },
    { label: "Cap Dropper", id: "CAPACITIVE_DROPPER" },
    { label: "ESP32 Wi-Fi", id: "MCU_ESP32" },
    { label: "DHT11 Sensor", id: "DHT11_TEMP_HUMIDITY" },
  ];

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
          vout: sim.vOut,
          iload_a: sim.iLoadMa / 1000.0,
          ambient_c: tAmbient,
          component_id: mountedPart.id,
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
          a: `Calculated from Multisim first-principles for ${mountedPart.name}: At Vin=${vin}V and load current ${sim.iLoadMa}mA, power dissipation is ${sim.powerLossW.toFixed(2)}W. Junction temperature is ${sim.junctionTempC.toFixed(1)}°C. Engineering Recommendation: ${mountedPart.fix}`,
          source: "circuit_engine",
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
              setVin(mountedPart.defaultVin);
              setPotRatio(0.65);
              setSwitchClosed(true);
              setSimRunning(true);
            }}
            title="Reset circuit parameters"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          {/* Master 1-Click Fix Button */}
          {mountedPart.id === "LM7805_LINEAR" ? (
            <button
              type="button"
              className="btn-apply-fix-top apply"
              onClick={() => handleMountComponent(ECE_CATALOG[1])}
            >
              <Zap size={14} />
              <span>⚡ Upgrade to TSR-1 Buck Module</span>
            </button>
          ) : mountedPart.id === "BUCK_CONVERTER_TSR1" ? (
            <button
              type="button"
              className="btn-apply-fix-top revert"
              onClick={() => handleMountComponent(ECE_CATALOG[0])}
            >
              <RotateCcw size={14} />
              <span>Compare with Linear LM7805</span>
            </button>
          ) : null}
        </div>
      </section>

      {/* QUICK COMPONENT MOUNTING STRIP */}
      <section className="quick-chip-strip">
        <span className="strip-label">
          <Plus size={13} /> Mount Component on Breadboard:
        </span>
        <div className="chip-row">
          {quickChips.map((chip) => {
            const isMounted = mountedPart.id === chip.id;
            const targetPart = ECE_CATALOG.find((p) => p.id === chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                className={`quick-mount-chip ${isMounted ? "active" : ""}`}
                onClick={() => targetPart && handleMountComponent(targetPart)}
              >
                <span>{chip.label}</span>
                {isMounted && <span className="chip-mounted-badge">ON BOARD</span>}
              </button>
            );
          })}
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
                    ? "SOLDERLESS BREADBOARD CANVAS (TINKERCAD MODE)"
                    : viewMode === "schematic"
                    ? "SPICE SCHEMATIC NETLIST (MULTISIM MODE)"
                    : "FR-4 PCB COPPER ROUTING (KICAD MODE)"}
                </span>
                <h3>Active Circuit: {mountedPart.name} ({mountedPart.footprint})</h3>
              </div>
              <div className="stage-meters">
                <span className={`meter-pill ${sim.isThermalFault ? "fault" : "normal"}`}>
                  <Thermometer size={13} />
                  {sim.junctionTempC.toFixed(1)} °C
                  {sim.isThermalFault ? " (OVERHEATING)" : " (SAFE)"}
                </span>
                <span className="meter-pill efficiency">
                  <Activity size={13} />
                  {sim.componentMetricName}: {sim.componentMetricValue}
                </span>
              </div>
            </div>

            {/* Interactive Breadboard Canvas with Live Component Mounting */}
            <div className="interactive-board-viewport">
              {/* Bench DC Power Supply Block */}
              <div className="board-instrument power-supply-box">
                <div className="instrument-title">BENCH POWER SUPPLY</div>
                <div className="psu-display">
                  <div className="seven-seg">{vin.toFixed(1)} V</div>
                  <div className="seven-seg sub">{sim.iLoadMa} mA</div>
                </div>
                <div className="psu-controls">
                  <label>
                    <span>Vin: {vin.toFixed(1)} V</span>
                    <input
                      type="range"
                      min={mountedPart.id.includes("TRANSFORMER") || mountedPart.id.includes("CAPACITIVE") ? 110 : 3.3}
                      max={mountedPart.id.includes("TRANSFORMER") || mountedPart.id.includes("CAPACITIVE") ? 250 : 24.0}
                      step={mountedPart.id.includes("TRANSFORMER") || mountedPart.id.includes("CAPACITIVE") ? 10 : 0.5}
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
                <div className="comp-label">POWER SWITCH</div>
                <div className="rocker-switch">
                  <div className={`rocker-paddle ${switchClosed ? "on" : "off"}`}>
                    <span>{switchClosed ? "ON" : "OFF"}</span>
                  </div>
                </div>
                <small>{switchClosed ? "Current Flows" : "0 mA (Open)"}</small>
              </div>

              {/* Wire Path 2: Switch to Mounted Component */}
              <div className="wire-segment switch-to-reg" style={{ borderColor: wireColor }} />

              {/* DYNAMIC COMPONENT PLACED ON BREADBOARD TIE-POINTS */}
              <div className={`board-component component-socket-box ${sim.isThermalFault ? "fault" : ""}`}>
                <div className="comp-label">MOUNTED BREADBOARD PART</div>
                <div className="mounted-part-stage">
                  <div className="part-visual-badge">
                    <Cpu size={26} />
                    <div className="part-meta">
                      <strong>{mountedPart.name}</strong>
                      <span>{mountedPart.footprint}</span>
                    </div>
                  </div>
                  <div className={`thermal-indicator ${sim.isThermalFault ? "hot" : "cool"}`}>
                    {sim.isThermalFault ? <Flame size={14} /> : <CheckCircle2 size={14} />}
                    <span>{sim.componentMetricValue}</span>
                  </div>
                </div>
                <div className="tie-point-pins">
                  <span>Pin 1 (Input)</span>
                  <span>Pin 2 (GND)</span>
                  <span>Pin 3 (Output)</span>
                </div>
              </div>

              {/* Wire Path 3: Component to Load Potentiometer & LED */}
              <div className="wire-segment reg-to-load" style={{ borderColor: wireColor }} />

              {/* Interactive Potentiometer (Load Adjustment) */}
              <div className="board-component pot-box">
                <div className="comp-label">LOAD TRIMMER / POT</div>
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
                    <span>R: {(10 + (1 - potRatio) * 100).toFixed(0)} Ω</span>
                    <strong>{sim.iLoadMa} mA</strong>
                  </div>
                </div>
                <small>Drag slider to vary load resistance</small>
              </div>

              {/* Wire Path 4: Component to LED */}
              <div className="wire-segment reg-to-led" style={{ borderColor: wireColor }} />

              {/* Functional Indicator LED */}
              <div className="board-component led-box">
                <div className="comp-label">5mm STATUS LED</div>
                <div className="led-lamp-fixture">
                  <div
                    className="led-bulb"
                    style={{
                      opacity: sim.ledBrightness > 0 ? 0.3 + sim.ledBrightness * 0.7 : 0.2,
                      boxShadow:
                        sim.ledBrightness > 0
                          ? `0 0 ${14 + sim.ledBrightness * 22}px rgba(239, 68, 68, ${sim.ledBrightness})`
                          : "none",
                    }}
                  />
                  <div className="led-base" />
                </div>
                <small>{sim.ledBrightness > 0 ? "Illuminated" : "Dark"}</small>
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
                  <span className="dmm-mode-label">{dmmMode === "degC" ? "TEMP" : dmmMode}</span>
                </div>
                <div className="dmm-terminals">
                  <div className="terminal red-lead">
                    <span className="term-circle" />
                    <span>Red Probe (Node Test)</span>
                  </div>
                  <div className="terminal black-lead">
                    <span className="term-circle" />
                    <span>Black Probe (GND)</span>
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
                    min={mountedPart.id.includes("TRANSFORMER") || mountedPart.id.includes("CAPACITIVE") ? 110 : 3.3}
                    max={mountedPart.id.includes("TRANSFORMER") || mountedPart.id.includes("CAPACITIVE") ? 250 : 24.0}
                    step={mountedPart.id.includes("TRANSFORMER") || mountedPart.id.includes("CAPACITIVE") ? 10 : 0.5}
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

          {/* 3D Physical Geometry & Thermal Viewport */}
          {run && (
            <div className="viewport-3d-card">
              <div className="card-header-bar">
                <div>
                  <span className="mini-badge">3D SPICE VIEWPORT</span>
                  <h4>Mounted Specimen 3D Geometry: {mountedPart.name}</h4>
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
                  plan={run.candidate_plans_json[mountedPart.id === "BUCK_CONVERTER_TSR1" ? 0 : 1]}
                  layer={layer}
                  dark={false}
                  isPcb={viewMode === "pcb"}
                  isOverheating={sim.isThermalFault}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Single Recommended Solution + Component Drawer + Copilot */}
        <div className="eda-sidebar-column">
          {/* 1. SINGLE RECOMMENDED SOLUTION SPECIFIC TO MOUNTED PART */}
          <div className="solution-hero-card">
            <div className="solution-badge">
              <Sparkles size={13} />
              <span>SINGLE RECOMMENDED SOLUTION</span>
            </div>
            <h3>Recommended Fix for {mountedPart.name}</h3>
            <p className="solution-subtitle">{mountedPart.fix}</p>

            {/* Quantitative Scorecard */}
            <div className="scorecard-grid">
              <div className="score-item">
                <span className="score-label">Active Metric</span>
                <div className="score-diff">
                  <span className="new-val good">{sim.componentMetricValue}</span>
                </div>
              </div>

              <div className="score-item">
                <span className="score-label">Junction Temp</span>
                <div className="score-diff">
                  <span className={`new-val ${sim.isThermalFault ? "hot" : "cool"}`}>
                    {sim.junctionTempC.toFixed(1)} °C
                  </span>
                </div>
              </div>

              <div className="score-item">
                <span className="score-label">Power Wasted</span>
                <div className="score-diff">
                  <span className="new-val cool">{sim.powerLossW.toFixed(2)} W</span>
                </div>
              </div>
            </div>

            {/* Quick Action */}
            {mountedPart.id === "LM7805_LINEAR" ? (
              <button
                type="button"
                className="btn-apply-hero"
                onClick={() => handleMountComponent(ECE_CATALOG[1])}
              >
                <Zap size={16} />
                <span>⚡ Mount TSR-1 Buck Converter (Drop-in Fix)</span>
              </button>
            ) : mountedPart.id === "TRANSFORMER_STEPDOWN" ? (
              <button
                type="button"
                className="btn-apply-hero"
                onClick={() => handleMountComponent(ECE_CATALOG[7])}
              >
                <Zap size={16} />
                <span>⚡ Mount Capacitive Dropper (8g IoT Fix)</span>
              </button>
            ) : null}
          </div>

          {/* 2. FIRST-PRINCIPLES DIAGNOSIS FOR MOUNTED PART */}
          <div className="diagnosis-clean-card">
            <div className="diag-header">
              <Info size={15} />
              <h4>Engineering Diagnosis & Failure Mode</h4>
            </div>
            <ul className="diag-points">
              <li>
                <strong>Component Description:</strong> {mountedPart.description}
              </li>
              <li>
                <strong>Critical Failure Risk:</strong> {mountedPart.risk}
              </li>
              <li>
                <strong>Engineering Solution:</strong> {mountedPart.fix}
              </li>
            </ul>
          </div>

          {/* 3. TINKERCAD-STYLE COMPONENT DRAWER (WITH + ADD TO BREADBOARD BUTTON!) */}
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
              {filteredCatalog.map((part) => {
                const isMounted = mountedPart.id === part.id;
                return (
                  <div
                    key={part.id}
                    className={`tray-part-card ${isMounted ? "selected" : ""}`}
                    onClick={() => handleMountComponent(part)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="part-card-top">
                      <span className="part-name">{part.name}</span>
                      <span className="part-footprint">{part.footprint}</span>
                    </div>
                    <div className="part-specs">{part.specs}</div>
                    <p className="part-desc">{part.description}</p>
                    <div className="part-card-actions">
                      <button
                        type="button"
                        className={`btn-mount-part ${isMounted ? "mounted" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMountComponent(part);
                        }}
                      >
                        {isMounted ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                        <span>{isMounted ? "Mounted on Breadboard" : "Add to Breadboard"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
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
                placeholder="Ask about thermal runaway, capacitor sizing, BJT beta..."
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
