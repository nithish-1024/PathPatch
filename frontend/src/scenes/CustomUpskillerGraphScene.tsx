import { Line, Text } from "@react-three/drei";
import type { SystemGraph, ViewLayer } from "../types/patchpath";

const layerY: Record<string, number> = { experience: 2.2, product: 0.8, intelligence: -0.65, runtime: -2.05 };

export default function CustomUpskillerGraphScene({ graph, layer }: { graph: SystemGraph; layer: ViewLayer }) {
  const nodes = graph.nodes.map((node, index) => {
    const sameLayer = graph.nodes.filter((item) => item.layer === node.layer).length || 1;
    const peers = graph.nodes.filter((item) => item.layer === node.layer);
    const peerIndex = peers.findIndex((item) => item.id === node.id);
    return { ...node, scenePosition: [((peerIndex - (sameLayer - 1) / 2) * 1.12), layerY[node.layer] ?? 0, (index % 2 ? 0.3 : -0.3)] as [number, number, number] };
  });
  const positions = new Map(nodes.map((node) => [node.id, node.scenePosition]));
  return <group>
    {["experience", "product", "intelligence", "runtime"].map((layer, i) => <group key={layer}>
      <mesh position={[0, layerY[layer], -0.12]}><torusGeometry args={[2.6 - i * 0.17, 0.012, 8, 72]} /><meshBasicMaterial color={i % 2 ? "#728f92" : "#bea77f"} transparent opacity={0.52} /></mesh>
      <Text position={[-2.55, layerY[layer] + 0.2, 0]} fontSize={0.075} color="#d7c9b2" anchorX="left">{layer.toUpperCase()}</Text>
    </group>)}
    {graph.edges.map((edge, index) => {
      const a = positions.get(edge.source); const b = positions.get(edge.target);
      return a && b ? <Line key={`${edge.source}-${edge.target}-${index}`} points={[a, b]} color={layer === "topology" || layer === "flow" ? "#a3d0c4" : "#739597"} transparent opacity={layer === "topology" || layer === "flow" ? 0.9 : 0.48} lineWidth={layer === "flow" ? 1.6 : 1} /> : null;
    })}
    {nodes.map((node) => <group key={node.id} position={node.scenePosition}>
      <mesh><octahedronGeometry args={[node.status === "fault" ? 0.17 : 0.12, 1]} /><meshStandardMaterial color={node.status === "fault" && layer === "thermal" ? "#e17b61" : node.status === "fault" ? "#d5484a" : "#c5a879"} emissive={node.status === "fault" ? "#532024" : "#202a28"} metalness={0.45} roughness={0.34} /></mesh>
      <Text position={[0, -0.26, 0]} fontSize={0.08} color="#f5ede0" anchorX="center" maxWidth={1.3}>{node.label}</Text>
    </group>)}
  </group>;
}

