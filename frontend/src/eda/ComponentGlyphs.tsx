// Realistic SVG Component Visuals (Tinkercad-style Artwork for Drawer & Canvas)

export function ResistorGlyph({ width = 48, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 24" fill="none">
      <line x1="2" y1="12" x2="12" y2="12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="12" x2="46" y2="12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <rect x="12" y="6" width="24" height="12" rx="3" fill="#fde68a" stroke="#d97706" strokeWidth="1.2" />
      {/* 4-Band EIA Color Stripes: 1kΩ (Brown, Black, Red, Gold) */}
      <line x1="16" y1="6" x2="16" y2="18" stroke="#78350f" strokeWidth="2" />
      <line x1="20" y1="6" x2="20" y2="18" stroke="#0f172a" strokeWidth="2" />
      <line x1="25" y1="6" x2="25" y2="18" stroke="#dc2626" strokeWidth="2" />
      <line x1="31" y1="6" x2="31" y2="18" stroke="#ca8a04" strokeWidth="1.5" />
    </svg>
  );
}

export function PotentiometerGlyph({ width = 36, height = 36 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 36" fill="none">
      <rect x="3" y="3" width="30" height="30" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
      <line x1="18" y1="18" x2="18" y2="10" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2.5" fill="#38bdf8" />
    </svg>
  );
}

export function ElectrolyticCapacitorGlyph({ width = 28, height = 36 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 28 36" fill="none">
      <line x1="10" y1="30" x2="10" y2="35" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="30" x2="18" y2="35" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Can Body */}
      <rect x="4" y="6" width="20" height="24" rx="4" fill="#1e3a8a" stroke="#1d4ed8" strokeWidth="1.2" />
      {/* Aluminum Top Score */}
      <ellipse cx="14" cy="6" rx="10" ry="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
      {/* Negative White Stripe */}
      <rect x="18" y="7" width="5" height="22" fill="#f8fafc" opacity="0.85" />
      <text x="20.5" y="16" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#0f172a">-</text>
      <text x="20.5" y="24" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#0f172a">-</text>
    </svg>
  );
}

export function CeramicCapacitorGlyph({ width = 28, height = 32 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 28 32" fill="none">
      <line x1="10" y1="22" x2="10" y2="30" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="22" x2="18" y2="30" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="14" cy="12" rx="10" ry="8" fill="#ea580c" stroke="#c2410c" strokeWidth="1.2" />
      <text x="14" y="14" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#fff" fontFamily="monospace">104</text>
    </svg>
  );
}

export function InductorGlyph({ width = 44, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 44 24" fill="none">
      <line x1="2" y1="15" x2="8" y2="15" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="15" x2="42" y2="15" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Coiled loops */}
      <path d="M 8 15 C 8 7, 15 7, 15 15" stroke="#d97706" strokeWidth="2.5" fill="none" />
      <path d="M 15 15 C 15 7, 22 7, 22 15" stroke="#d97706" strokeWidth="2.5" fill="none" />
      <path d="M 22 15 C 22 7, 29 7, 29 15" stroke="#d97706" strokeWidth="2.5" fill="none" />
      <path d="M 29 15 C 29 7, 36 7, 36 15" stroke="#d97706" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

export function LedGlyph({ color = "#ef4444", width = 28, height = 36 }: { color?: string; width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 28 36" fill="none">
      {/* Lead pins */}
      <line x1="11" y1="26" x2="11" y2="35" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="26" x2="17" y2="33" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Dome */}
      <path d="M 6 22 A 8 8 0 0 1 22 22 L 22 24 A 1 1 0 0 1 21 25 L 7 25 A 1 1 0 0 1 6 24 Z" fill={color} stroke="#b91c1c" strokeWidth="1.2" />
      {/* Lens Reflection highlight */}
      <ellipse cx="11" cy="12" rx="3" ry="5" fill="#ffffff" opacity="0.45" />
    </svg>
  );
}

export function DiodeGlyph({ width = 42, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 42 20" fill="none">
      <line x1="2" y1="10" x2="10" y2="10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="10" x2="40" y2="10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="5" width="22" height="10" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
      {/* Silver Cathode Band */}
      <rect x="26" y="5" width="4" height="10" fill="#cbd5e1" />
    </svg>
  );
}

export function TransistorGlyph({ label = "BC547", width = 32, height = 36 }: { label?: string; width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 36" fill="none">
      {/* Leads */}
      <line x1="10" y1="24" x2="8" y2="34" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="24" x2="16" y2="35" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="24" x2="24" y2="34" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      {/* TO-92 Body */}
      <path d="M 6 12 A 10 10 0 0 1 26 12 L 26 22 A 2 2 0 0 1 24 24 L 8 24 A 2 2 0 0 1 6 22 Z" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
      <text x="16" y="17" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">{label}</text>
    </svg>
  );
}

export function IcPackageGlyph({ label = "NE555", width = 48, height = 36 }: { label?: string; width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 36" fill="none">
      {/* Silver pins on left and right */}
      <line x1="2" y1="10" x2="8" y2="10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="18" x2="8" y2="18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="26" x2="8" y2="26" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="10" x2="46" y2="10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="18" x2="46" y2="18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="26" x2="46" y2="26" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      {/* Black Plastic Case */}
      <rect x="8" y="4" width="32" height="28" rx="3" fill="#090d16" stroke="#475569" strokeWidth="1.2" />
      {/* Pin 1 Notch */}
      <path d="M 21 4 A 3 3 0 0 0 27 4 Z" fill="#1e293b" />
      <circle cx="12" cy="8" r="1.5" fill="#64748b" />
      <text x="24" y="20" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">{label}</text>
    </svg>
  );
}

export function SwitchGlyph({ width = 36, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 24" fill="none">
      <rect x="2" y="3" width="32" height="18" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
      <rect x="18" y="5" width="14" height="14" rx="2" fill="#22c55e" />
      <circle cx="25" cy="12" r="3" fill="#fff" />
      <line x1="9" y1="9" x2="9" y2="15" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PushbuttonGlyph({ width = 32, height = 32 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 32" fill="none">
      <rect x="4" y="4" width="24" height="24" rx="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="7" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
      <circle cx="16" cy="16" r="3" fill="#dc2626" />
    </svg>
  );
}

export function SevenSegmentGlyph({ width = 28, height = 40 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 28 40" fill="none">
      <rect x="1" y="1" width="26" height="38" rx="4" fill="#020617" stroke="#334155" strokeWidth="1.2" />
      {/* Standard illuminated digit 8 representation */}
      <rect x="7" y="6" width="14" height="2.5" rx="1" fill="#ef4444" />
      <rect x="19" y="8.5" width="2.5" height="10" rx="1" fill="#ef4444" />
      <rect x="19" y="20" width="2.5" height="10" rx="1" fill="#ef4444" />
      <rect x="7" y="30" width="14" height="2.5" rx="1" fill="#ef4444" />
      <rect x="6.5" y="20" width="2.5" height="10" rx="1" fill="#ef4444" />
      <rect x="6.5" y="8.5" width="2.5" height="10" rx="1" fill="#ef4444" />
      <rect x="7" y="18" width="14" height="2.5" rx="1" fill="#ef4444" />
      <circle cx="22" cy="31" r="1.5" fill="#ef4444" />
    </svg>
  );
}

export function Battery9VGlyph({ width = 32, height = 44 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 44" fill="none">
      {/* Snaps on top */}
      <circle cx="11" cy="4" r="3" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
      <polygon points="18,1 24,1 25,6 19,6" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
      {/* Battery body */}
      <rect x="3" y="6" width="26" height="36" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
      {/* Orange stripe */}
      <rect x="3" y="26" width="26" height="12" fill="#ea580c" />
      <text x="16" y="20" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">9V</text>
      <text x="16" y="34" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#fff" fontFamily="sans-serif">POWER</text>
    </svg>
  );
}

export function PowerSupplyGlyph({ width = 36, height = 30 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 30" fill="none">
      <rect x="2" y="2" width="32" height="26" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
      <rect x="6" y="5" width="24" height="10" rx="2" fill="#1e293b" />
      <text x="18" y="13" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#ef4444" fontFamily="monospace">5.00V</text>
      <circle cx="10" cy="21" r="3" fill="#ef4444" />
      <circle cx="26" cy="21" r="3" fill="#020617" stroke="#94a3b8" strokeWidth="1" />
    </svg>
  );
}

export function AcSineGlyph({ width = 36, height = 30 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 30" fill="none">
      <rect x="2" y="2" width="32" height="26" rx="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.2" />
      <path d="M 8 15 Q 14 5, 18 15 T 28 15" stroke="#38bdf8" strokeWidth="2" fill="none" />
      <text x="18" y="25" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">~ AC SINE</text>
    </svg>
  );
}

export function ClockGenGlyph({ width = 36, height = 30 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 30" fill="none">
      <rect x="2" y="2" width="32" height="26" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.2" />
      <path d="M 8 20 L 8 10 L 18 10 L 18 20 L 28 20 L 28 10" stroke="#c084fc" strokeWidth="2" fill="none" />
      <text x="18" y="26" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#e9d5ff" fontFamily="monospace">CLK GEN</text>
    </svg>
  );
}

export function GroundGlyph({ width = 32, height = 28 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 28" fill="none">
      <line x1="16" y1="4" x2="16" y2="14" stroke="#94a3b8" strokeWidth="2" />
      <line x1="8" y1="14" x2="24" y2="14" stroke="#94a3b8" strokeWidth="2" />
      <line x1="11" y1="18" x2="21" y2="18" stroke="#94a3b8" strokeWidth="2" />
      <line x1="14" y1="22" x2="18" y2="22" stroke="#94a3b8" strokeWidth="2" />
    </svg>
  );
}

export function BuzzerGlyph({ width = 36, height = 32 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 32" fill="none">
      <circle cx="18" cy="16" r="13" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="18" cy="16" r="5" fill="#1e293b" />
      <circle cx="18" cy="16" r="2" fill="#ef4444" />
      <path d="M 28 11 C 30 13, 30 19, 28 21" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function DcMotorGlyph({ width = 42, height = 30 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 42 30" fill="none">
      <rect x="4" y="5" width="26" height="20" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1.2" />
      {/* Motor axle */}
      <rect x="30" y="12" width="10" height="6" rx="1" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      <text x="17" y="17" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">M</text>
    </svg>
  );
}

export function LogicGateGlyph({ gate = "AND", width = 36, height = 24 }: { gate?: string; width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 24" fill="none">
      <line x1="2" y1="7" x2="8" y2="7" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="2" y1="17" x2="8" y2="17" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="28" y1="12" x2="34" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="8" y="3" width="20" height="18" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.2" />
      <text x="18" y="14" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">{gate}</text>
    </svg>
  );
}

export function RegulatorTO220Glyph({ label = "7805", width = 36, height = 38 }: { label?: string; width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 38" fill="none">
      {/* Heatsink tab */}
      <rect x="6" y="2" width="24" height="10" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      <circle cx="18" cy="7" r="2.5" fill="#475569" />
      {/* TO-220 Body */}
      <rect x="5" y="11" width="26" height="16" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
      <text x="18" y="22" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">{label}</text>
      {/* 3 Leads */}
      <line x1="10" y1="27" x2="10" y2="36" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="27" x2="18" y2="36" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="27" x2="26" y2="36" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Unified component resolver to get the exact Tinkercad visual for any catalog item
export function ComponentGlyph({ type, width = 44, height = 32 }: { type: string; width?: number; height?: number }) {
  switch (type) {
    case "RESISTOR":
      return <ResistorGlyph width={width} height={height} />;
    case "POTENTIOMETER":
      return <PotentiometerGlyph width={width} height={height} />;
    case "CAPACITOR_ELECTROLYTIC":
      return <ElectrolyticCapacitorGlyph width={width} height={height} />;
    case "CAPACITOR_CERAMIC":
      return <CeramicCapacitorGlyph width={width} height={height} />;
    case "INDUCTOR":
      return <InductorGlyph width={width} height={height} />;
    case "SWITCH_SPST":
      return <SwitchGlyph width={width} height={height} />;
    case "PUSHBUTTON":
      return <PushbuttonGlyph width={width} height={height} />;
    case "DIODE_RECTIFIER":
    case "DIODE_1N4148":
    case "DIODE_ZENER":
      return <DiodeGlyph width={width} height={height} />;
    case "LED":
    case "LED_RED":
      return <LedGlyph color="#ef4444" width={width} height={height} />;
    case "LED_GREEN":
      return <LedGlyph color="#22c55e" width={width} height={height} />;
    case "LED_BLUE":
      return <LedGlyph color="#3b82f6" width={width} height={height} />;
    case "BJT_NPN":
    case "TRANSISTOR_NPN_BC547":
      return <TransistorGlyph label="BC547" width={width} height={height} />;
    case "BJT_PNP":
    case "TRANSISTOR_PNP_BC557":
      return <TransistorGlyph label="BC557" width={width} height={height} />;
    case "MOSFET_NMOS":
      return <TransistorGlyph label="NMOS" width={width} height={height} />;
    case "IC_555":
    case "IC_NE555":
      return <IcPackageGlyph label="NE555" width={width} height={height} />;
    case "IC_OPAMP_741":
    case "IC_OPAMP_LM741":
      return <IcPackageGlyph label="LM741" width={width} height={height} />;
    case "REGULATOR_7805":
    case "IC_REGULATOR_LM7805":
      return <RegulatorTO220Glyph label="LM7805" width={width} height={height} />;
    case "BUCK_TSR1":
    case "IC_BUCK_CONVERTER":
      return <IcPackageGlyph label="TSR-1" width={width} height={height} />;
    case "GATE_AND":
    case "LOGIC_AND_7408":
      return <LogicGateGlyph gate="AND" width={width} height={height} />;
    case "GATE_OR":
    case "LOGIC_OR_7432":
      return <LogicGateGlyph gate="OR" width={width} height={height} />;
    case "GATE_NOT":
    case "LOGIC_NOT_7404":
      return <LogicGateGlyph gate="NOT" width={width} height={height} />;
    case "GATE_NAND":
    case "LOGIC_NAND_7400":
      return <LogicGateGlyph gate="NAND" width={width} height={height} />;
    case "GATE_NOR":
      return <LogicGateGlyph gate="NOR" width={width} height={height} />;
    case "GATE_XOR":
    case "LOGIC_XOR_7486":
      return <LogicGateGlyph gate="XOR" width={width} height={height} />;
    case "COUNTER_4BIT":
    case "LOGIC_COUNTER_74HC161":
      return <IcPackageGlyph label="74HC161" width={width} height={height} />;
    case "FLIPFLOP_D":
    case "LOGIC_FLIPFLOP_D":
      return <IcPackageGlyph label="74HC74" width={width} height={height} />;
    case "SOURCE_DC":
    case "SOURCE_DC_5V":
      return <PowerSupplyGlyph width={width} height={height} />;
    case "SOURCE_DC_BATTERY_9V":
      return <Battery9VGlyph width={width} height={height} />;
    case "SOURCE_AC":
    case "SOURCE_AC_SINE":
      return <AcSineGlyph width={width} height={height} />;
    case "SOURCE_CLOCK":
    case "SOURCE_CLOCK_GEN":
      return <ClockGenGlyph width={width} height={height} />;
    case "GROUND":
      return <GroundGlyph width={width} height={height} />;
    case "OUTPUT_LED_INDICATOR":
      return <LedGlyph color="#f59e0b" width={width} height={height} />;
    case "DISPLAY_7SEG":
    case "OUTPUT_SEVEN_SEGMENT":
      return <SevenSegmentGlyph width={width} height={height} />;
    case "OUTPUT_BUZZER":
      return <BuzzerGlyph width={width} height={height} />;
    case "OUTPUT_DC_MOTOR":
      return <DcMotorGlyph width={width} height={height} />;
    default:
      return <IcPackageGlyph label={type.slice(0, 5)} width={width} height={height} />;
  }
}
