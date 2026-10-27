import { Line, Text } from "@react-three/drei";
import type { CandidatePlan, SystemGraph, ViewLayer } from "../types/patchpath";

export default function StructuralTrussScene({ graph, plan, layer }: { graph: SystemGraph; plan: CandidatePlan; layer: ViewLayer }) {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node.position as [number, number, number]]));
  const calm = plan.id === "plan_b";
  const emphasized = layer === "topology" || layer === "flow";
  return <group rotation={[0.02, 0.12, 0]}>
    {graph.edges.map((edge, index) => {
      const from = nodeMap.get(edge.source);
      const to = nodeMap.get(edge.target);
      if (!from || !to) return null;
      const fault = edge.status === "fault";
      return <Line key={`${edge.source}-${edge.target}-${index}`} points={[from, to]} color={fault && layer === "thermal" ? "#f07862" : fault && !calm ? "#d5484a" : emphasized ? "#9fcac5" : "#8fa2a4"} lineWidth={fault ? 2.4 : emphasized ? 1.8 : 1.1} transparent opacity={emphasized || fault ? 0.96 : 0.56} />;
    })}
    {graph.nodes.map((node) => <group key={node.id} position={node.position as [number, number, number]}>
      <mesh><sphereGeometry args={[0.075, 18, 18]} /><meshStandardMaterial color={node.status === "fault" && !calm ? "#d5484a" : "#d0b98f"} metalness={0.55} roughness={0.32} /></mesh>
    </group>)}
    {[-4.8, 4.8].map((x) => <mesh key={x} position={[x, -0.45, 0]}><cylinderGeometry args={[0.13, 0.23, 0.8, 6]} /><meshStandardMaterial color="#69777a" metalness={0.48} roughness={0.5} /></mesh>)}
    <Text position={[0, 1.28, 0]} fontSize={0.14} color="#fff6e7" anchorX="center">FIVE-PANEL · 2D AXIAL MODEL</Text>
    <Text position={[2.4, 0.12, 0.15]} fontSize={0.1} color={calm ? "#a7d1b2" : "#f3b4a9"} anchorX="center">B4–C4 · EULER CHECK</Text>
  </group>;
}

