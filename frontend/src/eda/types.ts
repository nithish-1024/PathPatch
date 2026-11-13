// Universal EDA Studio Core Types (Tinkercad + Multisim + KiCad + Vivado + OurCircuits)

export type ComponentCategory =
  | "passives"
  | "semiconductors"
  | "ics"
  | "digital"
  | "sources"
  | "outputs"
  | "instruments"
  | "sensors";

export type PinType = "in" | "out" | "passive" | "pwr" | "gnd" | "clk" | "trig";

export interface ComponentPin {
  id: string;
  name: string;
  relX: number; // relative to component center (grid units: 1 unit = 20px)
  relY: number;
  type: PinType;
  label?: string;
  voltage?: number;
  current?: number;
}

export interface EdaComponentDef {
  type: string;
  name: string;
  category: ComponentCategory;
  prefix: string; // R, C, L, D, Q, U, V, J, etc.
  description: string;
  defaultProperties: Record<string, number | string | boolean>;
  width: number; // grid units
  height: number;
  pins: ComponentPin[];
}

export interface EdaPlacedComponent {
  id: string; // e.g. "R1", "C1", "U1"
  type: string;
  name: string;
  designator: string; // R1, C1...
  category: ComponentCategory;
  x: number; // canvas grid coordinates (x in units)
  y: number; // canvas grid coordinates (y in units)
  rotation: 0 | 90 | 180 | 270; // degrees
  properties: Record<string, number | string | boolean>;
  pins: ComponentPin[];
  // Dynamic runtime simulation state
  state?: {
    voltage?: number;
    current?: number;
    power?: number;
    tempC?: number;
    logicState?: 0 | 1;
    active?: boolean;
    dutyCycle?: number;
    frequency?: number;
    gain?: number;
    rippleMv?: number;
    segments?: boolean[]; // For 7-segment display [a,b,c,d,e,f,g,dp]
    countValue?: number; // For 4-bit binary counter (0-15)
  };
}

export interface WireJunction {
  x: number;
  y: number;
}

export interface EdaWire {
  id: string;
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  color: string; // "red" | "black" | "green" | "blue" | "yellow" | "purple" | "cyan"
  // Dynamic simulation telemetry
  voltage: number;
  current: number; // Amperes (direction: positive from -> to)
  // Animation particles along the wire
  particles?: Array<{ progress: number }>;
}

export type ViewMode = "breadboard" | "schematic" | "pcb";
export type InstrumentTab = "oscilloscope" | "bode_analyzer" | "logic_analyzer" | "multimeter" | "netlist";

export interface OscilloscopeState {
  timeDiv: number; // seconds per div (e.g. 0.001 = 1ms/div)
  voltsDivCh1: number; // volts per div (e.g. 1.0 = 1V/div)
  voltsDivCh2: number; // volts per div
  offsetYCh1: number;
  offsetYCh2: number;
  triggerLevel: number;
  triggerSource: "ch1" | "ch2";
  channel1Enabled: boolean;
  channel2Enabled: boolean;
  isRunning: boolean;
}

export interface LogicAnalyzerState {
  timePerDivNs: number; // e.g. 50 ns
  cursorPositionNs: number;
  channels: Array<{
    id: string;
    label: string;
    color: string;
  }>;
}

export interface MultimeterState {
  mode: "DC_V" | "AC_V" | "DC_I" | "AC_I" | "RESISTANCE" | "CONTINUITY";
  autoRange: boolean;
  value: number;
  unit: string;
  leadRedNode: string | null;
  leadBlackNode: string | null;
}

export interface CircuitFaultLocation {
  componentId: string;
  componentDesignator: string;
  pinId?: string;
  pinName?: string;
  netId?: string;
  nodePotentialV?: number;
}

export interface CircuitDiagnostic {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  componentId?: string;
  faultLocation?: CircuitFaultLocation;
  whereItWentWrong: string;
  whyItWentWrong: string;
  whyThisHappened: string; // for backward compatibility
  firstPrinciplesProof?: string;
  recommendation: string;
}

export interface BodePlotData {
  frequencies: number[]; // Hz
  gainDb: number[];     // dB
  phaseDeg: number[];   // degrees
  cutoffFreqHz?: number;
  resonanceFreqHz?: number;
  qFactor?: number;
}

export interface SimulationResult {
  time: number;
  step: number;
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  oscilloscopeSamples: {
    time: number[];
    ch1: number[];
    ch2: number[];
  };
  bodeData?: BodePlotData;
  logicWaveforms: Record<string, (0 | 1)[]>;
  thermalMap: Record<string, number>;
  activeAlerts: string[];
  diagnostics: CircuitDiagnostic[];
}

export interface CommunityCircuit {
  id: string;
  title: string;
  author: string;
  authorAvatar?: string;
  verified: boolean;
  category: "analog" | "digital" | "power" | "audio" | "filter";
  description: string;
  rating: number; // 1-5 stars
  starsCount: number;
  forksCount: number;
  commentsCount: number;
  componentsCount: number;
  wiresCount: number;
  presetId: string;
  tags: string[];
  discussions: Array<{
    id: string;
    author: string;
    role: "Student" | "TA" | "Professor" | "Engineer";
    timestamp: string;
    content: string;
  }>;
}
