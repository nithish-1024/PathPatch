import { Float, Line, Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CandidatePlan, SystemGraph, ViewLayer } from "../types/patchpath";

function ApplicationNode({ patched }: { patched: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.018);
  });
  return <mesh ref={ref}>
    <icosahedronGeometry args={[0.54, 2]} />
    <meshStandardMaterial color="#4f7770" metalness={0.32} roughness={0.32} emissive={patched ? "#0d6c4f" : "#263a42"} emissiveIntensity={0.35} />
  </mesh>;
}

export default function CodeNebulaScene({ graph, plan, layer }: { graph: SystemGraph; plan: CandidatePlan; layer: ViewLayer }) {
  const nodes = useMemo(() => graph.nodes, [graph]);
  const positions = useMemo(() => new Map(nodes.map((node) => [node.id, node.position as [number, number, number]])), [nodes]);
  const topology = layer === "topology" || layer === "flow";
  const showRisk = layer === "thermal" || layer === "overview";
  const appNode = nodes.find((node) => node.kind === "system") ?? nodes[0];
  const appPosition = (appNode?.position as [number, number, number] | undefined) ?? [0, 0, 0];
  return <group>
    {graph.edges.map((edge, index) => {
      const from = positions.get(edge.source);
      const to = positions.get(edge.target);
      if (!from || !to) return null;
      const affected = edge.status === "fault";
      return <Line key={`${edge.source}-${edge.target}-${index}`} points={[from, to]} color={affected && showRisk ? "#e87962" : topology ? "#94bbbc" : "#738994"} transparent opacity={topology ? 0.8 : 0.35} lineWidth={affected && showRisk ? 1.7 : topology ? 1.1 : 0.65} />;
    })}
    {nodes.map((node) => {
      const pos = node.position as [number, number, number];
      const isApp = node.id === appNode?.id;
      const patchedFinding = node.status === "fault" && plan.id === "plan_b";
      const color = node.status === "fault" && showRisk && !patchedFinding ? "#d5484a" : patchedFinding ? "#61b895" : isApp ? "#88b8a1" : "#c6a779";
      return <group key={node.id} position={pos}>
        {isApp ? <Float speed={0.35} floatIntensity={0.06} rotationIntensity={0.02}><ApplicationNode patched={patchedFinding} /></Float> : <mesh>
          <sphereGeometry args={[node.status === "fault" ? 0.12 : 0.085, 16, 14]} />
          <meshStandardMaterial color={color} emissive={node.status === "fault" ? color : "#263a42"} emissiveIntensity={node.status === "fault" ? 0.3 : 0.12} roughness={0.42} />
        </mesh>}
        {!isApp && <Text position={[0, 0.17, 0]} fontSize={nodes.length > 20 ? 0.075 : 0.1} color="#fff0e1" anchorX="center" maxWidth={0.9}>{node.label}</Text>}
      </group>;
    })}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}><ringGeometry args={[2.65, 2.67, 80]} /><meshBasicMaterial color="#e5d3b5" transparent opacity={0.3} /></mesh>
    <Text position={[0, 0.85, 0]} fontSize={0.13} color="#fff7ec" anchorX="center" letterSpacing={0.08}>{appNode?.label ?? "REPOSITORY"}</Text>
    <Text position={[0, -1.05, 0]} fontSize={0.085} color="#d7c9b2" anchorX="center">{layer === "flow" ? "APPLICATION → DECLARED DEPENDENCIES" : layer === "thermal" ? "RISK HIGHLIGHT · MATCHED ADVISORIES ONLY" : `${graph.nodes.length} GRAPH NODES · ${graph.edges.length} DEPENDENCY LINKS`}</Text>
  </group>;
}
