import { useEffect, useRef, useState } from "react";
import type {
  CircuitDiagnostic,
  EdaPlacedComponent,
  EdaWire,
  SimulationResult,
  ViewMode,
} from "./types";
import { DIGIT_SEGMENTS } from "./engine";

// Helper for dynamic EIA 4-band resistor stripes
function getResistorStripeColors(rOhms: number) {
  const EIA = ["#000000", "#78350f", "#dc2626", "#ea580c", "#eab308", "#16a34a", "#2563eb", "#9333ea", "#64748b", "#ffffff"];
  if (rOhms <= 0) return { b1: EIA[1], b2: EIA[0], mult: EIA[0] };
  const s = Math.round(rOhms).toString();
  const d1 = parseInt(s[0] ?? "1", 10);
  const d2 = parseInt(s[1] ?? "0", 10);
  const exp = Math.max(0, Math.floor(Math.log10(rOhms)) - 1);
  return {
    b1: EIA[d1] ?? "#78350f",
    b2: EIA[d2] ?? "#000000",
    mult: EIA[exp % 10] ?? "#78350f",
  };
}

interface CanvasProps {
  components: EdaPlacedComponent[];
  wires: EdaWire[];
  viewMode: ViewMode;
  wireColor: string;
  isRunning: boolean;
  simResult: SimulationResult;
  onUpdateComponents: (comps: EdaPlacedComponent[]) => void;
  onUpdateWires: (wires: EdaWire[]) => void;
  onSelectComponent: (comp: EdaPlacedComponent | null) => void;
}

export default function Canvas({
  components,
  wires,
  viewMode,
  wireColor,
  isRunning,
  simResult,
  onUpdateComponents,
  onUpdateWires,
  onSelectComponent,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeFaultTooltip, setActiveFaultTooltip] = useState<CircuitDiagnostic | null>(null);

  // Wiring State (Pin to Pin connection)
  const [pendingWire, setPendingWire] = useState<{
    fromCompId: string;
    fromPinId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Grid unit size in pixels (1 grid unit = 24px)
  const GRID_SIZE = 24;

  // Handle Global Keydowns (Escape, Delete, Rotate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingWire(null);
        setSelectedCompId(null);
        setSelectedWireId(null);
        onSelectComponent(null);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedCompId) {
          onUpdateComponents(components.filter((c) => c.id !== selectedCompId));
          onUpdateWires(
            wires.filter((w) => w.fromCompId !== selectedCompId && w.toCompId !== selectedCompId)
          );
          setSelectedCompId(null);
          onSelectComponent(null);
        } else if (selectedWireId) {
          onUpdateWires(wires.filter((w) => w.id !== selectedWireId));
          setSelectedWireId(null);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (selectedCompId) {
          onUpdateComponents(
            components.map((c) => {
              if (c.id === selectedCompId) {
                const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
                return { ...c, rotation: nextRot };
              }
              return c;
            })
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCompId, selectedWireId, components, wires, onUpdateComponents, onUpdateWires, onSelectComponent]);

  // Convert Grid units to Screen pixels
  const gridToPx = (gx: number, gy: number) => ({
    x: gx * GRID_SIZE + 40,
    y: gy * GRID_SIZE + 40,
  });

  // Calculate Pin Absolute Screen Position
  const getPinPos = (comp: EdaPlacedComponent, pinId: string) => {
    const pin = comp.pins.find((p) => p.id === pinId);
    if (!pin) return { x: 0, y: 0 };

    // Apply component rotation to pin offset
    const rad = (comp.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rotX = pin.relX * cos - pin.relY * sin;
    const rotY = pin.relX * sin + pin.relY * cos;

    return gridToPx(comp.x + rotX, comp.y + rotY);
  };

  // Mouse Move on Canvas
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (pendingWire) {
      setPendingWire({ ...pendingWire, currentX: mouseX, currentY: mouseY });
    }

    if (draggingCompId) {
      const newGx = Math.max(1, Math.round((mouseX - dragOffset.x - 40) / GRID_SIZE));
      const newGy = Math.max(1, Math.round((mouseY - dragOffset.y - 40) / GRID_SIZE));

      onUpdateComponents(
        components.map((c) => (c.id === draggingCompId ? { ...c, x: newGx, y: newGy } : c))
      );
    }
  };

  // Mouse Up on Canvas
  const handleMouseUp = () => {
    setDraggingCompId(null);
  };

  // Pin Click (Start or Complete Wire)
  const handlePinClick = (e: React.MouseEvent, comp: EdaPlacedComponent, pinId: string) => {
    e.stopPropagation();
    const pos = getPinPos(comp, pinId);

    if (!pendingWire) {
      // Start wire
      setPendingWire({
        fromCompId: comp.id,
        fromPinId: pinId,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
    } else {
      // Complete wire
      if (pendingWire.fromCompId === comp.id && pendingWire.fromPinId === pinId) {
        // Cancel if clicked the same pin
        setPendingWire(null);
        return;
      }

      const newWire: EdaWire = {
        id: `wire_${Date.now()}`,
        fromCompId: pendingWire.fromCompId,
        fromPinId: pendingWire.fromPinId,
        toCompId: comp.id,
        toPinId: pinId,
        color: wireColor,
        voltage: 0,
        current: 0,
      };

      onUpdateWires([...wires, newWire]);
      setPendingWire(null);
    }
  };

  // Component Drag Start
  const handleCompMouseDown = (e: React.MouseEvent, comp: EdaPlacedComponent) => {
    e.stopPropagation();
    setSelectedCompId(comp.id);
    setSelectedWireId(null);
    onSelectComponent(comp);

    const pos = gridToPx(comp.x, comp.y);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDragOffset({ x: mouseX - pos.x, y: mouseY - pos.y });
    }
    setDraggingCompId(comp.id);
  };

  // Direct Interactive In-Canvas Controls (Toggling Switch, Turning Pot)
  const handleToggleSwitch = (e: React.MouseEvent, comp: EdaPlacedComponent) => {
    e.stopPropagation();
    const isClosed = Boolean(comp.properties.closed);
    onUpdateComponents(
      components.map((c) =>
        c.id === comp.id
          ? {
              ...c,
              properties: { ...c.properties, closed: !isClosed },
              state: { ...c.state, active: !isClosed },
            }
          : c
      )
    );
  };

  const handleAdjustPotentiometer = (e: React.MouseEvent, comp: EdaPlacedComponent) => {
    e.stopPropagation();
    const currentWiper = Number(comp.properties.wiperPosition ?? 0.5);
    const nextWiper = currentWiper >= 0.9 ? 0.1 : currentWiper + 0.2;
    onUpdateComponents(
      components.map((c) =>
        c.id === comp.id
          ? {
              ...c,
              properties: { ...c.properties, wiperPosition: nextWiper },
            }
          : c
      )
    );
  };

  return (
    <div className={`eda-canvas-wrapper view-${viewMode}`} ref={containerRef}>
      <svg
        className="eda-interactive-canvas-svg"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => {
          setSelectedCompId(null);
          setSelectedWireId(null);
          setPendingWire(null);
          onSelectComponent(null);
        }}
      >
        <defs>
          {/* Breadboard Hole Pattern */}
          <pattern id="breadboardGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="2.2" fill="#94a3b8" />
          </pattern>

          {/* Schematic Grid Pattern */}
          <pattern id="schematicGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1.2" fill="rgba(148, 163, 184, 0.4)" />
          </pattern>

          {/* Dynamic LED Glow Shader */}
          <filter id="ledGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Background Grid */}
        <rect
          width="100%"
          height="100%"
          fill={viewMode === "breadboard" ? "url(#breadboardGrid)" : "url(#schematicGrid)"}
        />

        {/* 2. Breadboard Power Rails (When in Breadboard Mode) */}
        {viewMode === "breadboard" && (
          <g className="breadboard-rails-group">
            {/* Top Red (+) and Blue (-) Lines */}
            <line x1="20" y1="20" x2="1600" y2="20" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" />
            <line x1="20" y1="36" x2="1600" y2="36" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" />
            {/* Center Dividers */}
            <rect x="20" y="240" width="1580" height="12" fill="#cbd5e1" opacity="0.6" />
            {/* Bottom Red and Blue Lines */}
            <line x1="20" y1="460" x2="1600" y2="460" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" />
            <line x1="20" y1="476" x2="1600" y2="476" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" />
          </g>
        )}

        {/* 3. Wires & Animated Current Particles */}
        {wires.map((wire) => {
          const fromComp = components.find((c) => c.id === wire.fromCompId);
          const toComp = components.find((c) => c.id === wire.toCompId);
          if (!fromComp || !toComp) return null;

          const p1 = getPinPos(fromComp, wire.fromPinId);
          const p2 = getPinPos(toComp, wire.toPinId);

          // Bezier Sag Curve
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2 + (viewMode === "breadboard" ? 28 : 0);
          const pathD = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

          const isSelected = selectedWireId === wire.id;
          const strokeColor =
            wire.color === "red"
              ? "#ef4444"
              : wire.color === "black"
              ? "#1e293b"
              : wire.color === "green"
              ? "#22c55e"
              : wire.color === "blue"
              ? "#3b82f6"
              : wire.color === "yellow"
              ? "#eab308"
              : wire.color === "cyan"
              ? "#06b6d4"
              : "#a855f7";

          return (
            <g
              key={wire.id}
              className="canvas-wire-group"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWireId(wire.id);
                setSelectedCompId(null);
                onSelectComponent(null);
              }}
            >
              {/* Thick hit area for easy clicking */}
              <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" cursor="pointer" />

              {/* Visible Wire Line */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? 4.5 : 2.5}
                strokeLinecap="round"
                opacity={isSelected ? 1.0 : 0.85}
              />

              {/* Animated Current Flow Dots (Falstad Style) */}
              {isRunning && wire.particles && wire.particles.map((particle, pIdx) => {
                const t = particle.progress;
                // Evaluate Quadratic Bezier at t: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
                const dotX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * midX + t * t * p2.x;
                const dotY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * midY + t * t * p2.y;

                return (
                  <circle
                    key={pIdx}
                    cx={dotX}
                    cy={dotY}
                    r="3.0"
                    fill="#fef08a"
                    stroke="#ca8a04"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          );
        })}

        {/* 4. Active Rubberband Wire Being Drawn */}
        {pendingWire && (
          <path
            d={`M ${pendingWire.startX} ${pendingWire.startY} Q ${(pendingWire.startX + pendingWire.currentX) / 2} ${(pendingWire.startY + pendingWire.currentY) / 2 + 20} ${pendingWire.currentX} ${pendingWire.currentY}`}
            fill="none"
            stroke="#eab308"
            strokeWidth="2.5"
            strokeDasharray="5,4"
          />
        )}

        {/* 5. Components Rendering */}
        {components.map((comp) => {
          const pos = gridToPx(comp.x, comp.y);
          const isSelected = selectedCompId === comp.id;

          return (
            <g
              key={comp.id}
              transform={`translate(${pos.x}, ${pos.y}) rotate(${comp.rotation})`}
              className={`canvas-comp-group ${isSelected ? "selected" : ""}`}
              onMouseDown={(e) => handleCompMouseDown(e, comp)}
              cursor="move"
            >
              {/* Visual Body Rendering Based on Component Type */}
              {/* --- RESISTOR --- */}
              {comp.type === "RESISTOR" && (() => {
                const rVal = Number(comp.properties.resistance ?? 1000);
                const stripes = getResistorStripeColors(rVal);
                return (
                  <g>
                    {/* Lead wires */}
                    <line x1="-36" y1="0" x2="-18" y2="0" stroke="#64748b" strokeWidth="2.5" />
                    <line x1="18" y1="0" x2="36" y2="0" stroke="#64748b" strokeWidth="2.5" />
                    {/* Ceramic Body */}
                    <rect x="-18" y="-7" width="36" height="14" rx="4" fill="#fde68a" stroke="#d97706" strokeWidth="1.5" />
                    {/* Dynamic 4-Band EIA Color Stripes */}
                    <line x1="-10" y1="-7" x2="-10" y2="7" stroke={stripes.b1} strokeWidth="2.5" />
                    <line x1="-4" y1="-7" x2="-4" y2="7" stroke={stripes.b2} strokeWidth="2.5" />
                    <line x1="2" y1="-7" x2="2" y2="7" stroke={stripes.mult} strokeWidth="2.5" />
                    <line x1="10" y1="-7" x2="10" y2="7" stroke="#ca8a04" strokeWidth="2" />
                  </g>
                );
              })()}

              {/* --- POTENTIOMETER --- */}
              {comp.type === "POTENTIOMETER" && (
                <g onClick={(e) => handleAdjustPotentiometer(e, comp)}>
                  <rect x="-24" y="-18" width="48" height="36" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
                  {/* Rotary Dial */}
                  <circle cx="0" cy="0" r="12" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                  {/* Pointer Knob Notch */}
                  <line
                    x1="0"
                    y1="0"
                    x2={10 * Math.cos(Number(comp.properties.wiperPosition ?? 0.5) * 2 * Math.PI - Math.PI / 2)}
                    y2={10 * Math.sin(Number(comp.properties.wiperPosition ?? 0.5) * 2 * Math.PI - Math.PI / 2)}
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                  <text x="0" y="26" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                    {Math.round(Number(comp.properties.wiperPosition ?? 0.5) * 100)}%
                  </text>
                </g>
              )}

              {/* --- 5mm INDICATOR LED --- */}
              {comp.type === "LED" && (
                <g>
                  {/* LED Dome Body */}
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill={comp.state?.active ? "#ef4444" : "#7f1d1d"}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    filter={comp.state?.active ? "url(#ledGlowFilter)" : "none"}
                  />
                  {/* Flat cathode notch */}
                  <line x1="9" y1="-8" x2="9" y2="8" stroke="#dc2626" strokeWidth="2" />
                  {/* Inner Reflector Cup */}
                  <circle cx="-2" cy="-2" r="4" fill="#ffffff" opacity="0.4" />
                </g>
              )}

              {/* --- SPST TOGGLE SWITCH --- */}
              {comp.type === "SWITCH_SPST" && (
                <g onClick={(e) => handleToggleSwitch(e, comp)}>
                  <rect x="-22" y="-12" width="44" height="24" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                  <rect
                    x={comp.properties.closed ? "0" : "-18"}
                    y="-9"
                    width="18"
                    height="18"
                    rx="3"
                    fill={comp.properties.closed ? "#22c55e" : "#ef4444"}
                  />
                  <text x="0" y="22" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                    {comp.properties.closed ? "ON" : "OFF"}
                  </text>
                </g>
              )}

              {/* --- NE555 TIMER IC (DIP-8) --- */}
              {comp.type === "IC_555" && (
                <g>
                  <rect x="-36" y="-36" width="72" height="72" rx="4" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
                  {/* Orientation Notch at top */}
                  <path d="M -10 -36 A 10 10 0 0 0 10 -36 Z" fill="#1e293b" />
                  <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                    NE555
                  </text>
                  <text x="0" y="16" textAnchor="middle" fontSize="8" fill="#94a3b8">
                    TIMER
                  </text>
                </g>
              )}

              {/* --- LM741 OP-AMP --- */}
              {comp.type === "IC_OPAMP_741" && (
                <g>
                  <polygon points="-36,-30 36,0 -36,30" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
                  <text x="-24" y="-12" fontSize="12" fill="#94a3b8">-</text>
                  <text x="-24" y="18" fontSize="12" fill="#94a3b8">+</text>
                  <text x="-6" y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc">
                    LM741
                  </text>
                </g>
              )}

              {/* --- LM7805 LINEAR REGULATOR (TO-220) --- */}
              {comp.type === "REGULATOR_7805" && (
                <g>
                  {/* Metal Heatsink Tab */}
                  <rect x="-24" y="-20" width="48" height="10" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1" />
                  <circle cx="0" cy="-15" r="3" fill="#0f172a" />
                  {/* Plastic Case */}
                  <rect x="-24" y="-10" width="48" height="26" rx="3" fill="#0f172a" stroke={comp.state?.power && comp.state.power > 1.5 ? "#ef4444" : "#475569"} strokeWidth="1.5" />
                  <text x="0" y="6" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                    LM7805
                  </text>
                </g>
              )}

              {/* --- TSR-1 BUCK CONVERTER --- */}
              {comp.type === "BUCK_TSR1" && (
                <g>
                  <rect x="-24" y="-16" width="48" height="32" rx="4" fill="#065f46" stroke="#10b981" strokeWidth="1.5" />
                  <text x="0" y="-2" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                    TSR-1
                  </text>
                  <text x="0" y="10" textAnchor="middle" fontSize="8" fill="#a7f3d0">
                    BUCK 94%
                  </text>
                </g>
              )}

              {/* --- BC547 NPN TRANSISTOR --- */}
              {comp.type === "BJT_NPN" && (
                <g>
                  {/* TO-92 Half-Moon Package */}
                  <path d="M -18 -12 A 18 18 0 0 1 18 -12 L 18 12 L -18 12 Z" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                  <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                    BC547
                  </text>
                  <text x="0" y="10" textAnchor="middle" fontSize="7" fill="#94a3b8">
                    NPN
                  </text>
                </g>
              )}

              {/* --- 7-SEGMENT LED DISPLAY (COMMON CATHODE) --- */}
              {comp.type === "DISPLAY_7SEG" && (
                <g>
                  <rect x="-28" y="-40" width="56" height="80" rx="6" fill="#020617" stroke="#334155" strokeWidth="2" />
                  {/* Segments a through g */}
                  {(() => {
                    const segs = comp.state?.segments || DIGIT_SEGMENTS[comp.state?.countValue ?? 0] || DIGIT_SEGMENTS[0];
                    const activeColor = "#ef4444";
                    const inactiveColor = "#1e293b";
                    return (
                      <g>
                        {/* a: top */}
                        <rect x="-14" y="-28" width="28" height="5" rx="2" fill={segs[0] ? activeColor : inactiveColor} filter={segs[0] ? "url(#ledGlowFilter)" : "none"} />
                        {/* b: top-right */}
                        <rect x="11" y="-24" width="5" height="22" rx="2" fill={segs[1] ? activeColor : inactiveColor} filter={segs[1] ? "url(#ledGlowFilter)" : "none"} />
                        {/* c: bottom-right */}
                        <rect x="11" y="2" width="5" height="22" rx="2" fill={segs[2] ? activeColor : inactiveColor} filter={segs[2] ? "url(#ledGlowFilter)" : "none"} />
                        {/* d: bottom */}
                        <rect x="-14" y="23" width="28" height="5" rx="2" fill={segs[3] ? activeColor : inactiveColor} filter={segs[3] ? "url(#ledGlowFilter)" : "none"} />
                        {/* e: bottom-left */}
                        <rect x="-16" y="2" width="5" height="22" rx="2" fill={segs[4] ? activeColor : inactiveColor} filter={segs[4] ? "url(#ledGlowFilter)" : "none"} />
                        {/* f: top-left */}
                        <rect x="-16" y="-24" width="5" height="22" rx="2" fill={segs[5] ? activeColor : inactiveColor} filter={segs[5] ? "url(#ledGlowFilter)" : "none"} />
                        {/* g: middle */}
                        <rect x="-14" y="-2" width="28" height="5" rx="2" fill={segs[6] ? activeColor : inactiveColor} filter={segs[6] ? "url(#ledGlowFilter)" : "none"} />
                        {/* dp: dot */}
                        <circle cx="20" cy="25" r="3" fill={segs[7] ? activeColor : inactiveColor} />
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* --- 4-BIT BINARY COUNTER (74HC161) --- */}
              {comp.type === "COUNTER_4BIT" && (
                <g>
                  <rect x="-36" y="-36" width="72" height="72" rx="4" fill="#0f172a" stroke="#8b5cf6" strokeWidth="1.5" />
                  <text x="0" y="-4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                    74HC161
                  </text>
                  <text x="0" y="8" textAnchor="middle" fontSize="8" fill="#c4b5fd">
                    4-BIT COUNTER
                  </text>
                  <text x="0" y="24" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#a78bfa" fontFamily="monospace">
                    VAL: {comp.state?.countValue ?? 0}
                  </text>
                </g>
              )}

              {/* --- DIGITAL LOGIC GATES (NOT, AND, OR, XOR) --- */}
              {comp.type.startsWith("GATE_") && (
                <g>
                  <rect x="-24" y="-18" width="48" height="36" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1.5" />
                  <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                    {comp.type.replace("GATE_", "")}
                  </text>
                  <text x="0" y="26" textAnchor="middle" fontSize="8" fill="#e9d5ff">
                    Y={comp.state?.logicState ?? 0}
                  </text>
                </g>
              )}

              {/* --- SOURCES & GROUND --- */}
              {comp.type === "SOURCE_DC" && (
                <g>
                  <circle cx="0" cy="0" r="18" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
                  <text x="0" y="-2" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f8fafc">
                    {comp.properties.voltage ?? 5}V
                  </text>
                  <text x="0" y="8" textAnchor="middle" fontSize="8" fill="#94a3b8">
                    DC
                  </text>
                </g>
              )}

              {comp.type === "GROUND" && (
                <g>
                  <line x1="0" y1="-12" x2="0" y2="0" stroke="#64748b" strokeWidth="2.5" />
                  <line x1="-14" y1="0" x2="14" y2="0" stroke="#64748b" strokeWidth="3" />
                  <line x1="-9" y1="5" x2="9" y2="5" stroke="#64748b" strokeWidth="2.5" />
                  <line x1="-4" y1="10" x2="4" y2="10" stroke="#64748b" strokeWidth="2" />
                </g>
              )}

              {/* Generic fallback badge if not explicitly matched */}
              {!["RESISTOR", "POTENTIOMETER", "LED", "SWITCH_SPST", "IC_555", "IC_OPAMP_741", "REGULATOR_7805", "BUCK_TSR1", "BJT_NPN", "DISPLAY_7SEG", "COUNTER_4BIT", "SOURCE_DC", "GROUND"].includes(comp.type) && !comp.type.startsWith("GATE_") && (
                <g>
                  <rect x="-24" y="-18" width="48" height="36" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                  <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc">
                    {comp.name}
                  </text>
                </g>
              )}

              {/* Component Designator Label (KiCad Style: R1, C1, U1...) */}
              <text
                x="0"
                y="-26"
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#38bdf8"
                fontFamily="monospace"
              >
                {comp.designator}
              </text>

              {/* Pin Terminal Connectors (Clickable for wiring) */}
              {comp.pins.map((pin) => {
                const pinRad = (comp.rotation * Math.PI) / 180;
                const cos = Math.cos(pinRad);
                const sin = Math.sin(pinRad);
                const rx = pin.relX * GRID_SIZE;
                const ry = pin.relY * GRID_SIZE;
                const pinX = rx * cos - ry * sin;
                const pinY = rx * sin + ry * cos;

                // Check for pin-level fault diagnostic
                const faultDiag = simResult.diagnostics.find(
                  (d) =>
                    d.faultLocation?.componentId === comp.id &&
                    (d.faultLocation?.pinId === pin.id || !d.faultLocation?.pinId)
                );

                return (
                  <g
                    key={pin.id}
                    transform={`translate(${pinX}, ${pinY})`}
                    onClick={(e) => handlePinClick(e, comp, pin.id)}
                    onMouseEnter={() => {
                      if (faultDiag) setActiveFaultTooltip(faultDiag);
                    }}
                    onMouseLeave={() => {
                      if (faultDiag) setActiveFaultTooltip(null);
                    }}
                    className="canvas-terminal-pin cursor-pointer"
                  >
                    {/* Magnetic snap halo */}
                    <circle cx="0" cy="0" r="8" fill="transparent" stroke="#22c55e" strokeWidth="1.5" opacity="0.6" className="pin-target-halo" />

                    {/* Metal Pin Contact */}
                    <circle cx="0" cy="0" r="4.0" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.5" />

                    {/* Pin-Level Fault Warning Beacon (Pulsing Red Halo) */}
                    {faultDiag && (
                      <g className="cursor-help">
                        <circle cx="0" cy="0" r="14" fill="#ef4444" opacity="0.4" className="animate-ping" />
                        <circle cx="0" cy="0" r="10" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="3" fill="#ef4444" />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Floating On-Canvas Pin Fault Explanation Card */}
      {activeFaultTooltip && (
        <div className="absolute top-4 left-4 max-w-sm bg-slate-900/95 border border-rose-500/80 rounded-xl p-3 shadow-2xl text-xs backdrop-blur z-20 text-slate-100 flex flex-col gap-1.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-400 flex items-center gap-1.5">
              <span>⚠️</span> Fault Location Identified
            </span>
            <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800 font-mono">
              {activeFaultTooltip.severity.toUpperCase()}
            </span>
          </div>
          <div className="text-[11px] leading-tight">
            <strong className="text-slate-300">Where it went wrong:</strong>{" "}
            <span className="text-amber-300 font-mono">{activeFaultTooltip.whereItWentWrong}</span>
          </div>
          <div className="text-[11px] text-slate-300 leading-snug">
            <strong className="text-slate-200">Why it went wrong:</strong> {activeFaultTooltip.whyItWentWrong}
          </div>
          {activeFaultTooltip.firstPrinciplesProof && (
            <div className="font-mono text-[10px] bg-slate-950 p-2 rounded border border-slate-800 text-cyan-300">
              {activeFaultTooltip.firstPrinciplesProof}
            </div>
          )}
          <div className="text-[10px] text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-900/50">
            <strong>Fix:</strong> {activeFaultTooltip.recommendation}
          </div>
        </div>
      )}

      {/* Floating Keyboard Shortcuts HUD */}
      <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 shadow-lg flex items-center gap-3 backdrop-blur font-mono pointer-events-none">
        <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600">Esc</kbd> Cancel Wire</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600">Del</kbd> Delete</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600">R</kbd> Rotate 90°</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-600">Pin Click</kbd> Connect</span>
      </div>
    </div>
  );
}
