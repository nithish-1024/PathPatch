import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useMemo, useState } from "react";
import { Box, MousePointer2, Rotate3D } from "lucide-react";
import type { AnalysisRun, BreadboardComponent, BreadboardWire, CandidatePlan, ViewLayer } from "../types/patchpath";
import CodeNebulaScene from "./CodeNebulaScene";
import PcbSpecimenScene from "./PcbSpecimenScene";
import StructuralTrussScene from "./StructuralTrussScene";
import CustomUpskillerGraphScene from "./CustomUpskillerGraphScene";
import MechanicalBeamScene from "./MechanicalBeamScene";

function StaticFallback({ run }: { run: AnalysisRun }) {
  return <div className="scene-fallback"><div className="fallback-glyph"><Box size={29} /></div><strong>{run.title}</strong><p>The 3D view is unavailable here. The written model and inputs remain visible alongside it.</p><div className="fallback-node-row">{run.system_graph_json.nodes.slice(0, 6).map((node) => <span key={node.id}>{node.label}</span>)}</div></div>;
}

export default function Center3DViewport({ run, plan, layer, dark }: { run: AnalysisRun; plan: CandidatePlan; layer: ViewLayer; dark: boolean }) {
  const [powered, setPowered] = useState(false);
  const [addedParts, setAddedParts] = useState<BreadboardComponent[]>([]);
  const [addedWires, setAddedWires] = useState<BreadboardWire[]>([]);
  const [disconnectedIds, setDisconnectedIds] = useState<string[]>([]);
  const [removedPartIds, setRemovedPartIds] = useState<string[]>([]);
  const isBreadboard = run.mode === "ece_circuit";
  const breadboard = run.analysis_json.breadboard;
  const layerLabels: Record<ViewLayer, string> = {
    overview: "Overview",
    topology: "Topology",
    thermal: run.mode === "cs_repo" ? "Risk" : run.mode === "civil_mech" || run.mode === "mechanical_beam" ? "Stress" : run.mode === "custom_upskiller" ? "Assumptions" : "Thermal",
    flow: "Flow",
    logs: "Run log",
    diff: "Patch notes",
  };
  const supportsWebGL = useMemo(() => {
    try { const canvas = document.createElement("canvas"); return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); }
    catch { return false; }
  }, []);
  const isLedTemplate = breadboard?.template === "led-series";
  const visibleBaseParts = (breadboard?.components ?? []).filter((part: BreadboardComponent) => !removedPartIds.includes(part.id));
  const displayedParts = [...visibleBaseParts, ...addedParts];
  const missingPart = isLedTemplate && (!displayedParts.some((part) => part.kind === "supply") || !displayedParts.some((part) => part.kind === "resistor") || !displayedParts.some((part) => part.kind === "led"));
  const criticalWire = isLedTemplate ? "return" : breadboard?.template === "esp32-dht22" ? "gnd" : "ground";
  const disconnected = disconnectedIds.includes(criticalWire);
  const missingPath = isLedTemplate && (!breadboard.wires.some((wire: BreadboardWire) => wire.id === "positive") || !breadboard.wires.some((wire: BreadboardWire) => wire.id === "return") || disconnected);
  const addedUnconnected = addedParts.length > 0 || addedWires.length > 0;
  const ledCurrentValid = !isLedTemplate || (Number(run.analysis_json.metrics?.current_ma) > 0 && Number(run.analysis_json.metrics?.current_ma) <= 20);
  const circuitValid = isLedTemplate ? !missingPart && !missingPath && !addedUnconnected && ledCurrentValid : Boolean(breadboard?.components.length && breadboard?.wires.length) && !disconnected && !addedUnconnected;
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const sceneBoard = breadboard ? { ...breadboard, components: displayedParts, wires: [...breadboard.wires.filter((wire: BreadboardWire) => !disconnectedIds.includes(wire.id)), ...addedWires] } : breadboard;
  const addPart = (kind: "led" | "resistor") => setAddedParts((parts) => parts.length >= 6 ? parts : [...parts, { id: `added-${kind}-${Date.now()}`, label: kind === "led" ? "Added LED · unconnected" : "Added resistor · unconnected", kind, value: "practice part", position: [parts.length % 2 ? 0.8 : -0.8, 0.92 + Math.floor(parts.length / 2) * 0.25] }]);
  const removePart = () => {
    if (addedParts.length) setAddedParts((parts) => parts.slice(0, -1));
    else {
      const removable = [...visibleBaseParts].reverse().find((part: BreadboardComponent) => part.kind === "led" || part.kind === "resistor");
      if (removable) setRemovedPartIds((ids) => [...ids, removable.id]);
    }
  };
  const canRemovePart = addedParts.length > 0 || visibleBaseParts.some((part: BreadboardComponent) => part.kind === "led" || part.kind === "resistor");
  const addJumper = () => setAddedWires((wires) => wires.length >= 6 ? wires : [...wires, { id: `jumper-${Date.now()}`, label: "Practice jumper · unconnected", color: "#e2b451", points: [[-1.1, 0.92 + wires.length * 0.12], [1.1, 0.92 + wires.length * 0.12]] }]);
  return <section className="viewport-panel" aria-label="Interactive engineering scene">
    <div className="viewport-head"><span><i className="live-point" /> LIVE SYSTEM MODEL</span><span className="viewport-mode">{layerLabels[layer].toUpperCase()} <b>·</b> {run.mode.replaceAll("_", " ").toUpperCase()}</span></div>
    <div className={`canvas-wrap ${dark ? "canvas-dark" : ""}`}>
      {supportsWebGL ? <Canvas shadows={false} dpr={[1, 1.5]} camera={{ position: isBreadboard ? [0, 4.1, 5.5] : [0, 3.2, 8.3], fov: isBreadboard ? 38 : 41 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={[dark ? "#101615" : "#192321"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 7, 5]} intensity={1.6} color="#ffead0" />
        <pointLight position={[-4, -2, 4]} intensity={0.7} color="#74a7a3" />
        <Stars radius={24} depth={20} count={260} factor={1.1} saturation={0.12} fade speed={0.1} />
        {run.mode === "cs_repo" && <CodeNebulaScene graph={run.system_graph_json} plan={plan} layer={layer} />}
        {run.mode === "ece_circuit" && <PcbSpecimenScene board={sceneBoard} plan={plan} layer={layer} powered={powered && circuitValid} reducedMotion={reducedMotion} />}
        {run.mode === "civil_mech" && <StructuralTrussScene graph={run.system_graph_json} plan={plan} layer={layer} />}
        {run.mode === "mechanical_beam" && <MechanicalBeamScene metrics={run.analysis_json.metrics ?? {}} plan={plan} layer={layer} />}
        {run.mode === "custom_upskiller" && <CustomUpskillerGraphScene graph={run.system_graph_json} layer={layer} />}
        <OrbitControls enablePan={false} minDistance={isBreadboard ? 4.6 : 5.5} maxDistance={isBreadboard ? 10 : 12} minPolarAngle={0.55} maxPolarAngle={2.25} enableDamping dampingFactor={0.08} />
      </Canvas> : <StaticFallback run={run} />}
      <div className="viewport-legend"><span><i className="legend-dot fault" /> {isBreadboard ? "Power rail" : run.mode === "mechanical_beam" ? "Applied load" : "Finding"}</span><span><i className="legend-dot stable" /> {isBreadboard ? "Part" : run.mode === "mechanical_beam" ? "Beam and supports" : "Component"}</span><span><Rotate3D size={13} /> Drag to inspect</span></div>
      <div className="viewport-coordinates">{isBreadboard ? <>BOARD / {(sceneBoard?.components.length ?? 0).toString().padStart(2, "0")} PARTS<br />{(sceneBoard?.wires.length ?? 0).toString().padStart(2, "0")} WIRES</> : <>SYS / {run.system_graph_json.nodes.length.toString().padStart(2, "0")} NODES<br />{run.system_graph_json.edges.length.toString().padStart(2, "0")} LINKS</>}</div>
      <div className="viewport-help"><MousePointer2 size={13} /> Drag to rotate · layers update this model</div>
    </div>
    {isBreadboard && <div className="breadboard-tools" aria-label="Breadboard practice controls"><div className="breadboard-control-row"><div><span className="mini-label">BENCH CONTROLS</span><strong role="status" className={circuitValid ? "circuit-state-valid" : "circuit-state-fault"}>{circuitValid ? "Connections present" : "Open connection / review layout"}</strong></div><button className={`power-toggle ${powered ? "is-on" : ""}`} onClick={() => setPowered((value) => !value)} aria-pressed={powered}><i /> Power {powered ? "ON" : "OFF"}</button></div><div className="breadboard-control-row breadboard-edit-row"><button className="button button-outline" onClick={() => addPart("led")} disabled={addedParts.length >= 6}>+ LED</button><button className="button button-outline" onClick={() => addPart("resistor")} disabled={addedParts.length >= 6}>+ Resistor</button><button className="button button-outline" onClick={addJumper} disabled={addedWires.length >= 6}>+ Jumper</button><button className="button button-outline" onClick={removePart} disabled={!canRemovePart}>Remove part</button><button className="button button-outline" onClick={() => setAddedWires((wires) => wires.slice(0, -1))} disabled={!addedWires.length}>Remove jumper</button><button className="button button-outline" onClick={() => setDisconnectedIds((ids) => disconnected ? ids.filter((id) => id !== criticalWire) : [...ids, criticalWire])}>{disconnected ? "Reconnect return" : "Disconnect return"}</button></div><p>{powered && circuitValid ? "Power enabled for this template rule check. Voltage and current values remain the saved calculation only." : addedUnconnected ? "Added practice parts and jumpers are visual and unconnected; remove them to restore the template check." : !circuitValid ? "Fault: a required path is open, current is outside the teaching range, or a practice part is unconnected." : "Local visual practice only. Added parts are not connected to breadboard holes; no new voltage or current is calculated."}</p></div>}
    <div className="viewport-foot"><span>MODEL: {run.mode === "civil_mech" ? "2D AXIAL TRUSS · EXTRUDED VIEW" : run.mode === "mechanical_beam" ? "SIMPLY SUPPORTED BEAM · POINT LOAD" : run.mode === "ece_circuit" ? "BREADBOARD CONNECTION DRAFT" : run.mode === "cs_repo" ? "REPOSITORY DEPENDENCY GRAPH" : "TEMPLATE ARCHITECTURE GRAPH"}</span><span>INPUT STATUS: {run.mode === "custom_upskiller" ? "DRAFT" : run.mode === "mechanical_beam" ? "FORMULA ESTIMATE" : "SEE EVIDENCE CARD"}</span></div>
  </section>;
}
