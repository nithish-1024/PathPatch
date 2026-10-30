import { Line, RoundedBox, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BreadboardComponent, BreadboardModel, CandidatePlan, ViewLayer } from "../types/patchpath";

const rowZ = (row: number) => -1.56 + row * 0.108;

function useBreadboardHoleGeometry() {
  return useMemo(() => {
    const holes: [number, number, number][] = [];
    for (let row = 0; row < 30; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const offset = -0.62 + column * 0.18;
        holes.push([-0.29 + offset, 0.04, rowZ(row)], [0.29 - offset, 0.04, rowZ(row)]);
      }
      holes.push([-1.42, 0.04, rowZ(row)], [-1.32, 0.04, rowZ(row)], [1.32, 0.04, rowZ(row)], [1.42, 0.04, rowZ(row)]);
    }

    const source = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12);
    const copies = holes.map(([x, y, z]) => source.clone().translate(x, y, z));
    const combined = mergeGeometries(copies, false);
    source.dispose();
    copies.forEach((geometry) => geometry.dispose());
    combined?.computeBoundingBox();
    combined?.computeBoundingSphere();
    return combined ?? new THREE.BufferGeometry();
  }, []);
}

function BreadboardBase() {
  const holeGeometry = useBreadboardHoleGeometry();

  return <group>
    <RoundedBox args={[3.2, 0.2, 4.25]} radius={0.12} smoothness={2} position={[0, -0.1, 0]}>
      <meshStandardMaterial color="#e8e7dc" roughness={0.72} />
    </RoundedBox>
    <mesh position={[0, 0.007, 0]}><boxGeometry args={[0.105, 0.012, 3.45]} /><meshStandardMaterial color="#bab9ae" roughness={0.8} /></mesh>
    <mesh geometry={holeGeometry}><meshBasicMaterial color="#2b3b38" toneMapped={false} /></mesh>
    {[-1.42, -1.32, 1.32, 1.42].map((x, index) => <mesh key={x} position={[x, 0.014, 0]}>
      <boxGeometry args={[0.018, 0.012, 3.45]} />
      <meshStandardMaterial color={index % 2 === 0 ? "#d95750" : "#4c78c7"} roughness={0.42} />
    </mesh>)}
    {Array.from({ length: 30 }, (_, row) => row % 5 === 0 && <Text key={row} position={[1.03, 0.019, rowZ(row)]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.055} color="#62706a" anchorX="left">{String(row + 1).padStart(2, "0")}</Text>)}
    <Text position={[-1.45, 0.02, -1.87]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.07} color="#b84944" anchorX="center">+ POWER RAIL</Text>
    <Text position={[1.43, 0.02, 1.87]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.07} color="#426ab0" anchorX="center">− GROUND RAIL</Text>
    <Text position={[-0.77, 0.018, -1.88]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.06} color="#68726d" anchorX="center">A   B   C   D   E</Text>
    <Text position={[0.77, 0.018, -1.88]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.06} color="#68726d" anchorX="center">F   G   H   I   J</Text>
  </group>;
}

function Part({ component, plan, layer, template, powered }: { component: BreadboardComponent; plan: CandidatePlan; layer: ViewLayer; template: string; powered: boolean }) {
  const [x, z] = component.position;
  const regulatorLabel = component.id === "u1" && plan.id === "plan_b" && component.kind === "regulator";
  const thermalFocus = layer === "thermal" && ((template === "regulator-demo" && component.kind === "regulator") || (template === "led-series" && component.kind === "resistor"));
  const moduleColor = regulatorLabel ? "#278a72" : "#293f48";
  return <group position={[x, 0.12, z]}>
    {component.kind === "microcontroller" && <>
      <RoundedBox args={[0.57, 0.09, 0.92]} radius={0.035} smoothness={2}><meshStandardMaterial color="#274c60" roughness={0.46} metalness={0.22} /></RoundedBox>
      {Array.from({ length: 8 }, (_, index) => [-0.23, 0.23].map((pinX) => <mesh key={`${pinX}-${index}`} position={[pinX, -0.08, -0.34 + index * 0.095]}><boxGeometry args={[0.045, 0.2, 0.04]} /><meshStandardMaterial color="#b8a978" metalness={0.68} roughness={0.3} /></mesh>))}
      <RoundedBox args={[0.22, 0.06, 0.22]} radius={0.025} smoothness={1} position={[0, 0.08, 0]}><meshStandardMaterial color="#1d2b31" metalness={0.2} roughness={0.4} /></RoundedBox>
    </>}
    {component.kind === "regulator" && <>
      <RoundedBox args={[0.4, 0.35, 0.18]} radius={0.025} smoothness={2} position={[0, 0.18, 0]}><meshStandardMaterial color={moduleColor} metalness={0.2} roughness={0.42} emissive={thermalFocus ? "#f05a45" : plan.id === "plan_b" ? "#0a4937" : "#641f21"} emissiveIntensity={thermalFocus ? 0.72 : 0.16} /></RoundedBox>
      <mesh position={[0, 0.39, 0]}><cylinderGeometry args={[0.16, 0.16, 0.06, 32]} /><meshStandardMaterial color="#a7a9a2" metalness={0.8} roughness={0.35} /></mesh>
      {[-0.12, 0, 0.12].map((pin) => <mesh key={pin} position={[pin, -0.04, 0.12]}><boxGeometry args={[0.035, 0.2, 0.035]} /><meshStandardMaterial color="#b9aa7b" metalness={0.74} roughness={0.28} /></mesh>)}
    </>}
    {component.kind === "sensor" && <>
      <RoundedBox args={[0.42, 0.28, 0.46]} radius={0.04} smoothness={2}><meshStandardMaterial color="#f4efe4" roughness={0.58} /></RoundedBox>
      {[-0.1, 0, 0.1].map((slot) => <mesh key={slot} position={[slot, 0.15, 0.24]}><boxGeometry args={[0.026, 0.06, 0.016]} /><meshStandardMaterial color="#8e9a91" /></mesh>)}
      {[-0.12, 0, 0.12].map((pin) => <mesh key={pin} position={[pin, -0.09, 0.31]}><boxGeometry args={[0.025, 0.18, 0.025]} /><meshStandardMaterial color="#b9aa7b" metalness={0.72} /></mesh>)}
    </>}
    {component.kind === "resistor" && <>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.085, 0.085, 0.4, 20]} /><meshStandardMaterial color="#d5b991" roughness={0.52} emissive={thermalFocus ? "#f05a45" : "#000000"} emissiveIntensity={thermalFocus ? 0.7 : 0} /></mesh>
      {[-0.08, 0.03, 0.12].map((band, index) => <mesh key={band} position={[band, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.088, 0.088, 0.035, 20]} /><meshStandardMaterial color={["#8a4b32", "#202020", "#a27539"][index]} /></mesh>)}
      {[-0.34, 0.34].map((lead) => <mesh key={lead} position={[lead, 0, 0]}><cylinderGeometry args={[0.013, 0.013, 0.3, 8]} /><meshStandardMaterial color="#b7a97e" metalness={0.78} roughness={0.3} /></mesh>)}
    </>}
    {component.kind === "led" && <>
      <mesh position={[0, 0.12, 0]}><sphereGeometry args={[0.13, 22, 18]} /><meshStandardMaterial color={powered ? "#8ff0a6" : "#dc6860"} emissive={powered ? "#36df68" : "#7b211e"} emissiveIntensity={powered ? 2.1 : 0.4} roughness={0.25} transparent opacity={0.92} /></mesh>
      {[-0.045, 0.045].map((pin) => <mesh key={pin} position={[pin, -0.07, 0]}><cylinderGeometry args={[0.012, 0.012, 0.3, 8]} /><meshStandardMaterial color="#b7a97e" metalness={0.7} /></mesh>)}
    </>}
    {component.kind === "capacitor" && <>
      <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.13, 0.13, 0.32, 24]} /><meshStandardMaterial color="#657d83" metalness={0.28} roughness={0.37} /></mesh>
      <mesh position={[0, 0.33, 0]}><cylinderGeometry args={[0.1, 0.1, 0.018, 24]} /><meshStandardMaterial color="#c8b57f" metalness={0.5} /></mesh>
      {[-0.045, 0.045].map((pin) => <mesh key={pin} position={[pin, -0.06, 0]}><cylinderGeometry args={[0.012, 0.012, 0.24, 8]} /><meshStandardMaterial color="#b7a97e" metalness={0.7} /></mesh>)}
    </>}
    {component.kind === "supply" && <>
      <RoundedBox args={[0.48, 0.18, 0.34]} radius={0.035} smoothness={2}><meshStandardMaterial color="#e4e0d4" roughness={0.5} /></RoundedBox>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.065, 0.065, 0.12, 18]} /><meshStandardMaterial color="#c2904e" metalness={0.68} roughness={0.3} /></mesh>
    </>}
    {component.kind !== "microcontroller" && component.kind !== "regulator" && component.kind !== "sensor" && component.kind !== "resistor" && component.kind !== "led" && component.kind !== "capacitor" && component.kind !== "supply" && <RoundedBox args={[0.42, 0.22, 0.34]} radius={0.03} smoothness={1}><meshStandardMaterial color="#767e78" roughness={0.5} /></RoundedBox>}
    {component.pins?.map((pin) => <mesh key={pin.label} position={[pin.position[0] - x, -0.065, pin.position[1] - z]}>
      <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} /><meshStandardMaterial color="#bba875" metalness={0.76} roughness={0.3} />
    </mesh>)}
    <Text position={[0, 0.57, 0]} fontSize={0.12} color="#19211f" anchorX="center" maxWidth={1.1}>{regulatorLabel ? "U1 · BUCK MODULE" : component.label}</Text>
    <Text position={[0, 0.43, 0]} fontSize={0.085} color="#58645f" anchorX="center" maxWidth={1.1}>{component.value}</Text>
  </group>;
}

function FlowParticle({ points, offset }: { points: [number, number, number][]; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || points.length < 2) return;
    const progress = (clock.elapsedTime * 0.24 + offset) % 1;
    const segmentProgress = progress * (points.length - 1);
    const segment = Math.min(points.length - 2, Math.floor(segmentProgress));
    const local = segmentProgress - segment;
    const from = points[segment]; const to = points[segment + 1];
    ref.current.position.set(from[0] + (to[0] - from[0]) * local, from[1] + (to[1] - from[1]) * local, from[2] + (to[2] - from[2]) * local);
  });
  return <mesh ref={ref}><sphereGeometry args={[0.027, 8, 8]} /><meshBasicMaterial color="#b8ffd0" toneMapped={false} /></mesh>;
}

const fallbackBoard: BreadboardModel = {
  template: "empty",
  evidence_note: "This run does not include a breadboard layout.",
  components: [],
  wires: [],
};

export default function PcbSpecimenScene({ board, plan, layer, powered = false, reducedMotion = false }: { board?: BreadboardModel; plan: CandidatePlan; layer: ViewLayer; powered?: boolean; reducedMotion?: boolean }) {
  const model = board ?? fallbackBoard;
  const pathPoints = (points: [number, number][]) => points.map(([x, z], index) => [x, 0.11 + (index % 2 ? 0.055 : 0.025), z] as [number, number, number]);
  const wireOpacity = layer === "topology" || layer === "flow" ? 1 : 0.86;
  return <group rotation={[-0.06, 0.08, 0]}>
    <BreadboardBase />
    {model.wires.map((wire) => <group key={wire.id}>
      <Line points={pathPoints(wire.points)} color={wire.color} lineWidth={layer === "flow" ? 3.2 : 2.4} transparent opacity={wireOpacity} />
      {powered && !reducedMotion && pathPoints(wire.points).length > 1 && <FlowParticle points={pathPoints(wire.points)} offset={(wire.id.length % 5) / 5} />}
      {layer === "flow" && <mesh position={[wire.points[Math.floor(wire.points.length / 2)][0], 0.2, wire.points[Math.floor(wire.points.length / 2)][1]]}>
        <sphereGeometry args={[0.045, 12, 10]} /><meshBasicMaterial color={wire.color} />
      </mesh>}
    </group>)}
    {model.components.map((component) => <Part key={component.id} component={component} plan={plan} layer={layer} template={model.template} powered={powered && component.kind === "led"} />)}
    <Text position={[0, 1.25, -1.95]} fontSize={0.12} color="#f5eee0" anchorX="center">{model.template === "regulator-demo" ? "12 V → 5 V · REGULATOR SAMPLE" : model.template === "empty" ? "NO BREADBOARD LAYOUT IN THIS RUN" : "USER CIRCUIT · STARTER WIRING DRAFT"}</Text>
    <Text position={[0, 0.04, 2.0]} fontSize={0.07} color="#f5eee0" anchorX="center">{layer === "flow" ? "FOLLOW THE COLORED PATHS" : layer === "thermal" ? "HIGHLIGHTED PARTS NEED REVIEW" : "A–E  /  CENTER TRENCH  /  F–J"}</Text>
  </group>;
}
