import { Line, Text } from "@react-three/drei";
import type { CandidatePlan, ViewLayer } from "../types/patchpath";

type BeamMetrics = Record<string, number>;

export default function MechanicalBeamScene({ metrics, plan, layer }: { metrics: BeamMetrics; plan: CandidatePlan; layer: ViewLayer }) {
  const scenario = (plan.scenario ?? metrics) as BeamMetrics;
  const spanScene = 8;
  const halfSpan = spanScene / 2;
  const sectionDepth = Math.max(0.08, Math.min(0.68, (scenario.depth_mm ?? 100) / 100 * 0.24));
  const sectionWidth = Math.max(0.08, Math.min(0.9, (scenario.width_mm ?? 50) / 50 * 0.42));
  const baselineY = 0.28 + sectionDepth / 2;
  const beamTopY = baselineY + sectionDepth / 2;
  const ratio = (scenario.max_deflection_mm ?? 0) / Math.max((scenario.span_m ?? 1) * 1000, 1);
  const visualDeflection = Math.min(ratio * spanScene * 500, 1.5);
  const actualVisualScale = ratio > 0 ? Math.round(visualDeflection / (ratio * spanScene)) : 0;
  const segmentCount = 28;
  const points: [number, number, number][] = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const x = -halfSpan + spanScene * index / segmentCount;
    const distanceRatio = Math.min((x + halfSpan) / spanScene, (halfSpan - x) / spanScene);
    const curveRatio = Math.max(0, distanceRatio * (3 - 4 * distanceRatio * distanceRatio));
    return [x, baselineY - visualDeflection * curveRatio, 0];
  });
  const stressLayer = layer === "thermal";
  const compareLayer = layer === "flow" || layer === "topology";

  return <group rotation={[0.015, 0.12, 0]}>
    {Array.from({ length: segmentCount }, (_, index) => {
      const from = points[index];
      const to = points[index + 1];
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const midpoint = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0] as [number, number, number];
      const momentRatio = 1 - Math.abs(midpoint[0]) / halfSpan;
      const stressAgainstBaseline = (scenario.max_bending_stress_mpa ?? 0) / Math.max(metrics.max_bending_stress_mpa ?? scenario.max_bending_stress_mpa ?? 1, 0.0001);
      const localStress = stressAgainstBaseline * momentRatio;
      const color = stressLayer ? localStress > 0.8 ? "#e16f52" : localStress > 0.4 ? "#e6ad60" : "#71b9a6" : compareLayer ? "#65bcae" : "#9cb6b2";
      return <mesh key={index} position={midpoint} rotation={[0, 0, Math.atan2(dy, dx)]}>
        <boxGeometry args={[Math.hypot(dx, dy) + 0.025, sectionDepth, sectionWidth]} />
        <meshStandardMaterial color={color} metalness={0.62} roughness={0.28} />
      </mesh>;
    })}

      <mesh position={[-halfSpan, 0.05, 0]}>
      <coneGeometry args={[0.36, 0.46, 3]} />
      <meshStandardMaterial color="#849597" metalness={0.42} roughness={0.44} />
    </mesh>
      <mesh position={[halfSpan, 0.05, 0]}>
      <coneGeometry args={[0.36, 0.46, 3]} />
      <meshStandardMaterial color="#849597" metalness={0.42} roughness={0.44} />
    </mesh>
    <mesh position={[halfSpan, -0.39, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.13, 0.13, 0.48, 18]} />
      <meshStandardMaterial color="#d2b679" metalness={0.6} roughness={0.3} />
    </mesh>

    <Line points={[[0, beamTopY + 0.82, sectionWidth / 2 + 0.12], [0, beamTopY + 0.12 - visualDeflection, sectionWidth / 2 + 0.12]]} color="#f07862" lineWidth={3} />
    <mesh position={[0, beamTopY + 0.12 - visualDeflection, sectionWidth / 2 + 0.12]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.14, 0.28, 12]} />
      <meshStandardMaterial color="#f07862" emissive="#672c28" emissiveIntensity={0.28} />
    </mesh>
    <Line points={[[-halfSpan, -0.82, 0.05], [halfSpan, -0.82, 0.05]]} color="#88a5a2" lineWidth={1.2} />
    <Line points={[[-halfSpan, -0.76, 0.05], [-halfSpan, -0.9, 0.05]]} color="#88a5a2" lineWidth={1.2} />
    <Line points={[[halfSpan, -0.76, 0.05], [halfSpan, -0.9, 0.05]]} color="#88a5a2" lineWidth={1.2} />
    <Line points={points} color={stressLayer ? "#f3c27a" : "#d4dfd6"} lineWidth={0.7} transparent opacity={0.55} />

    <Text position={[0, 1.72, 0]} fontSize={0.15} color="#fff4df" anchorX="center">CENTER POINT LOAD · {scenario.load_kn ?? "—"} kN</Text>
    <Text position={[-halfSpan, -0.66, 0.2]} fontSize={0.12} color="#e7e8dd" anchorX="center">PIN</Text>
    <Text position={[halfSpan, -0.66, 0.2]} fontSize={0.12} color="#e7e8dd" anchorX="center">ROLLER</Text>
    <Text position={[0, -1.08, 0.05]} fontSize={0.12} color="#c4d4cf" anchorX="center">SPAN · {scenario.span_m ?? "—"} m</Text>
    <Text position={[0, -1.38, 0.05]} fontSize={0.105} color="#f2c781" anchorX="center">SECTION · {scenario.width_mm ?? "—"} × {scenario.depth_mm ?? "—"} mm</Text>
    <Text position={[0, -1.62, 0.05]} fontSize={0.09} color="#9fb2ad" anchorX="center">SCHEMATIC SECTION SCALE</Text>
    <Text position={[0, 1.15, -0.3]} fontSize={0.1} color="#f3b493" anchorX="center">DEFLECTION SHAPE · {actualVisualScale}× VIEW SCALE</Text>
  </group>;
}
