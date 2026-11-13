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

  return (
    <group>
      <RoundedBox args={[3.2, 0.2, 4.25]} radius={0.12} smoothness={2} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#e8e7dc" roughness={0.72} />
      </RoundedBox>
      <mesh position={[0, 0.007, 0]}>
        <boxGeometry args={[0.105, 0.012, 3.45]} />
        <meshStandardMaterial color="#bab9ae" roughness={0.8} />
      </mesh>
      <mesh geometry={holeGeometry}>
        <meshBasicMaterial color="#2b3b38" toneMapped={false} />
      </mesh>
      {[-1.42, -1.32, 1.32, 1.42].map((x, index) => (
        <mesh key={x} position={[x, 0.014, 0]}>
          <boxGeometry args={[0.018, 0.012, 3.45]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#d95750" : "#4c78c7"} roughness={0.42} />
        </mesh>
      ))}
      {Array.from({ length: 30 }, (_, row) => row % 5 === 0 && (
        <Text key={row} position={[1.03, 0.019, rowZ(row)]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.055} color="#62706a" anchorX="left">
          {String(row + 1).padStart(2, "0")}
        </Text>
      ))}
      <Text position={[-1.45, 0.02, -1.87]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.07} color="#b84944" anchorX="center">+ POWER RAIL</Text>
      <Text position={[1.43, 0.02, 1.87]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.07} color="#426ab0" anchorX="center">− GROUND RAIL</Text>
      <Text position={[-0.77, 0.018, -1.88]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.06} color="#68726d" anchorX="center">A   B   C   D   E</Text>
      <Text position={[0.77, 0.018, -1.88]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.06} color="#68726d" anchorX="center">F   G   H   I   J</Text>
    </group>
  );
}

function PcbBase() {
  return (
    <group>
      {/* High-grade FR-4 Green/Obsidian Substrate */}
      <RoundedBox args={[3.4, 0.09, 4.4]} radius={0.06} smoothness={2} position={[0, -0.045, 0]}>
        <meshStandardMaterial color="#0f3422" roughness={0.42} metalness={0.15} />
      </RoundedBox>

      {/* Silkscreen Board Outline Inner Border */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[3.25, 0.002, 4.25]} />
        <meshStandardMaterial color="#14442c" roughness={0.6} />
      </mesh>

      {/* Gilded Top Layer Copper Traces */}
      {[-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2].map((x) => (
        <mesh key={`trace-${x}`} position={[x, 0.007, 0]}>
          <boxGeometry args={[0.045, 0.002, 3.6]} />
          <meshStandardMaterial color="#cda45a" metalness={0.88} roughness={0.25} />
        </mesh>
      ))}

      {/* Gilded Cross Signal Traces */}
      {[-1.4, -0.7, 0, 0.7, 1.4].map((z) => (
        <mesh key={`cross-${z}`} position={[0, 0.007, z]}>
          <boxGeometry args={[2.4, 0.002, 0.04]} />
          <meshStandardMaterial color="#cda45a" metalness={0.88} roughness={0.25} />
        </mesh>
      ))}

      {/* Gold-plated Through-Hole Solder Annular Pads */}
      {Array.from({ length: 20 }, (_, row) =>
        [-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
          <mesh key={`pad-${row}-${x}`} position={[x, 0.008, -1.6 + row * 0.17]}>
            <cylinderGeometry args={[0.042, 0.042, 0.004, 16]} />
            <meshStandardMaterial color="#e0c068" metalness={0.92} roughness={0.2} />
          </mesh>
        ))
      )}

      {/* Silkscreen White Text Markings */}
      <Text position={[-1.4, 0.012, -1.95]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.08} color="#f5f7f6" anchorX="left">
        PATCHPATH PCB FABRICATION LAB · REV 2.0
      </Text>
      <Text position={[1.4, 0.012, -1.95]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.065} color="#cda45a" anchorX="right">
        IPC-2221 CLASS 2
      </Text>
      <Text position={[-1.35, 0.012, 1.95]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.07} color="#f5f7f6" anchorX="left">
        +12V_IN  GND  +5V_REG  DATA
      </Text>
      <Text position={[1.35, 0.012, 1.95]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.065} color="#94a39d" anchorX="right">
        VNRVJIET ECE LAB
      </Text>

      {/* 4 Corner M3 Gold Grounded Mounting Holes */}
      {[[-1.5, -1.95], [1.5, -1.95], [-1.5, 1.95], [1.5, 1.95]].map(([x, z], i) => (
        <group key={`mount-${i}`} position={[x, 0.008, z]}>
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 0.005, 24]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.12, 24]} />
            <meshBasicMaterial color="#0b110e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Part({
  component,
  plan,
  layer,
  template,
  powered,
  isOverheating,
}: {
  component: BreadboardComponent;
  plan: CandidatePlan;
  layer: ViewLayer;
  template: string;
  powered: boolean;
  isOverheating?: boolean;
}) {
  const [x, z] = component.position;
  const isBuckPlan = plan.id === "plan_b";
  const regulatorLabel = component.id === "u1" && isBuckPlan && component.kind === "regulator";
  const thermalFocus = isOverheating || (layer === "thermal" && (component.kind === "regulator" || component.kind === "resistor"));
  const moduleColor = regulatorLabel ? "#278a72" : "#293f48";

  return (
    <group position={[x, 0.12, z]}>
      {/* 1. Microcontroller / ESP32 */}
      {(component.kind === "microcontroller" || component.kind === "mcu") && (
        <>
          <RoundedBox args={[0.57, 0.09, 0.92]} radius={0.035} smoothness={2}>
            <meshStandardMaterial color="#274c60" roughness={0.46} metalness={0.22} />
          </RoundedBox>
          {Array.from({ length: 8 }, (_, index) =>
            [-0.23, 0.23].map((pinX) => (
              <mesh key={`${pinX}-${index}`} position={[pinX, -0.08, -0.34 + index * 0.095]}>
                <boxGeometry args={[0.045, 0.2, 0.04]} />
                <meshStandardMaterial color="#b8a978" metalness={0.68} roughness={0.3} />
              </mesh>
            ))
          )}
          <RoundedBox args={[0.22, 0.06, 0.22]} radius={0.025} smoothness={1} position={[0, 0.08, 0]}>
            <meshStandardMaterial color="#1d2b31" metalness={0.2} roughness={0.4} />
          </RoundedBox>
        </>
      )}

      {/* 2. Linear Regulator (LM7805) vs TSR-1 Buck Module */}
      {component.kind === "regulator" && (
        <>
          <RoundedBox args={[0.4, 0.35, 0.18]} radius={0.025} smoothness={2} position={[0, 0.18, 0]}>
            <meshStandardMaterial
              color={moduleColor}
              metalness={0.2}
              roughness={0.42}
              emissive={thermalFocus ? "#f05a45" : isBuckPlan ? "#0a4937" : "#641f21"}
              emissiveIntensity={thermalFocus ? 0.95 : 0.16}
            />
          </RoundedBox>
          {/* Metal Heatsink Tab for TO-220 */}
          {!regulatorLabel && (
            <mesh position={[0, 0.39, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.06, 32]} />
              <meshStandardMaterial color="#a7a9a2" metalness={0.8} roughness={0.35} />
            </mesh>
          )}
          {[-0.12, 0, 0.12].map((pin) => (
            <mesh key={pin} position={[pin, -0.04, 0.12]}>
              <boxGeometry args={[0.035, 0.2, 0.035]} />
              <meshStandardMaterial color="#b9aa7b" metalness={0.74} roughness={0.28} />
            </mesh>
          ))}
        </>
      )}

      {/* 3. Step-down Transformer (Bulky Iron Core + Dual Coils) */}
      {(component.kind === "transformer" || component.kind === "magnetics") && (
        <group position={[0, 0.22, 0]}>
          <RoundedBox args={[0.75, 0.52, 0.65]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color="#32373c" metalness={0.7} roughness={0.4} />
          </RoundedBox>
          <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.26, 24]} />
            <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.24, 24]} />
            <meshStandardMaterial color="#c68a4c" metalness={0.82} roughness={0.32} />
          </mesh>
          <mesh position={[0, -0.24, 0]}>
            <boxGeometry args={[0.82, 0.04, 0.72]} />
            <meshStandardMaterial color="#555c62" metalness={0.75} roughness={0.35} />
          </mesh>
        </group>
      )}

      {/* 4. Capacitive Dropper (X2 Safety Film Cap + Inrush Resistor) */}
      {(component.kind === "capacitive_dropper" || component.kind === "dropper") && (
        <group position={[0, 0.16, 0]}>
          <RoundedBox args={[0.48, 0.38, 0.24]} radius={0.02} smoothness={2}>
            <meshStandardMaterial color="#e5ba35" metalness={0.1} roughness={0.35} />
          </RoundedBox>
          <mesh position={[0.34, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.32, 16]} />
            <meshStandardMaterial color="#a06038" roughness={0.5} />
          </mesh>
          {[-0.15, 0.15].map((lx) => (
            <mesh key={`clead-${lx}`} position={[lx, -0.22, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.16, 8]} />
              <meshStandardMaterial color="#b8a978" metalness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {/* 5. Transistor (TO-92 BJT / MOSFET) */}
      {(component.kind === "transistor" || component.kind === "bjt" || component.kind === "mosfet") && (
        <group position={[0, 0.12, 0]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.22, 24, 1, false, 0, Math.PI * 1.5]} />
            <meshStandardMaterial color="#1a1c1d" roughness={0.4} />
          </mesh>
          {[-0.07, 0, 0.07].map((tx) => (
            <mesh key={`tlead-${tx}`} position={[tx, -0.12, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
              <meshStandardMaterial color="#c0b585" metalness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {/* 6. Integrated Circuits (NE555 Timer, LM741 Op-Amp, 74HC Logic) */}
      {(component.kind === "ic" || component.kind === "timer" || component.kind === "opamp" || component.kind === "logic") && (
        <group position={[0, 0.11, 0]}>
          <RoundedBox args={[0.48, 0.18, 0.38]} radius={0.02} smoothness={1}>
            <meshStandardMaterial color="#1e2225" roughness={0.5} />
          </RoundedBox>
          <mesh position={[-0.23, 0.09, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {[-0.14, -0.05, 0.05, 0.14].map((px) => (
            <group key={`icpin-${px}`}>
              <mesh position={[px, -0.09, -0.22]}>
                <boxGeometry args={[0.03, 0.14, 0.08]} />
                <meshStandardMaterial color="#b8c0c4" metalness={0.8} />
              </mesh>
              <mesh position={[px, -0.09, 0.22]}>
                <boxGeometry args={[0.03, 0.14, 0.08]} />
                <meshStandardMaterial color="#b8c0c4" metalness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* 7. Sensors (DHT11, LDR, PIR) */}
      {component.kind === "sensor" && (
        <>
          <RoundedBox args={[0.42, 0.28, 0.46]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color="#2d7fa8" roughness={0.58} />
          </RoundedBox>
          {[-0.1, 0, 0.1].map((slot) => (
            <mesh key={slot} position={[slot, 0.15, 0.24]}>
              <boxGeometry args={[0.026, 0.06, 0.016]} />
              <meshStandardMaterial color="#8e9a91" />
            </mesh>
          ))}
          {[-0.12, 0, 0.12].map((pin) => (
            <mesh key={pin} position={[pin, -0.09, 0.31]}>
              <boxGeometry args={[0.025, 0.18, 0.025]} />
              <meshStandardMaterial color="#b9aa7b" metalness={0.72} />
            </mesh>
          ))}
        </>
      )}

      {/* 8. Resistor with Color Bands */}
      {component.kind === "resistor" && (
        <>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.085, 0.085, 0.4, 20]} />
            <meshStandardMaterial
              color="#d5b991"
              roughness={0.52}
              emissive={thermalFocus ? "#f05a45" : "#000000"}
              emissiveIntensity={thermalFocus ? 0.7 : 0}
            />
          </mesh>
          {[-0.08, 0.03, 0.12].map((band, index) => (
            <mesh key={band} position={[band, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.088, 0.088, 0.035, 20]} />
              <meshStandardMaterial color={["#8a4b32", "#202020", "#a27539"][index]} />
            </mesh>
          ))}
          {[-0.34, 0.34].map((lead) => (
            <mesh key={lead} position={[lead, 0, 0]}>
              <cylinderGeometry args={[0.013, 0.013, 0.3, 8]} />
              <meshStandardMaterial color="#b7a97e" metalness={0.78} roughness={0.3} />
            </mesh>
          ))}
        </>
      )}

      {/* 9. LED Indicator with Real Glow */}
      {component.kind === "led" && (
        <>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.13, 22, 18]} />
            <meshStandardMaterial
              color={powered ? "#8ff0a6" : "#dc6860"}
              emissive={powered ? "#36df68" : "#7b211e"}
              emissiveIntensity={powered ? 2.1 : 0.4}
              roughness={0.25}
              transparent
              opacity={0.92}
            />
          </mesh>
          {[-0.045, 0.045].map((pin) => (
            <mesh key={pin} position={[pin, -0.07, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
              <meshStandardMaterial color="#b7a97e" metalness={0.7} />
            </mesh>
          ))}
        </>
      )}

      {/* 10. Filter Capacitor (Electrolytic Can) */}
      {component.kind === "capacitor" && (
        <>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.32, 24]} />
            <meshStandardMaterial color="#657d83" metalness={0.28} roughness={0.37} />
          </mesh>
          <mesh position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.018, 24]} />
            <meshStandardMaterial color="#c8b57f" metalness={0.5} />
          </mesh>
          {[-0.045, 0.045].map((pin) => (
            <mesh key={pin} position={[pin, -0.06, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
              <meshStandardMaterial color="#b7a97e" metalness={0.7} />
            </mesh>
          ))}
        </>
      )}

      {/* 11. DC Power Supply / Terminal */}
      {component.kind === "supply" && (
        <>
          <RoundedBox args={[0.48, 0.18, 0.34]} radius={0.035} smoothness={2}>
            <meshStandardMaterial color="#e4e0d4" roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.12, 18]} />
            <meshStandardMaterial color="#c2904e" metalness={0.68} roughness={0.3} />
          </mesh>
        </>
      )}

      {/* Fallback Box for other components */}
      {component.kind !== "microcontroller" &&
        component.kind !== "mcu" &&
        component.kind !== "regulator" &&
        component.kind !== "transformer" &&
        component.kind !== "magnetics" &&
        component.kind !== "capacitive_dropper" &&
        component.kind !== "dropper" &&
        component.kind !== "transistor" &&
        component.kind !== "bjt" &&
        component.kind !== "mosfet" &&
        component.kind !== "ic" &&
        component.kind !== "timer" &&
        component.kind !== "opamp" &&
        component.kind !== "logic" &&
        component.kind !== "sensor" &&
        component.kind !== "resistor" &&
        component.kind !== "led" &&
        component.kind !== "capacitor" &&
        component.kind !== "supply" && (
          <RoundedBox args={[0.42, 0.22, 0.34]} radius={0.03} smoothness={1}>
            <meshStandardMaterial color="#767e78" roughness={0.5} />
          </RoundedBox>
        )}

      {component.pins?.map((pin) => (
        <mesh key={pin.label} position={[pin.position[0] - x, -0.065, pin.position[1] - z]}>
          <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} />
          <meshStandardMaterial color="#bba875" metalness={0.76} roughness={0.3} />
        </mesh>
      ))}

      <Text position={[0, 0.58, 0]} fontSize={0.11} color="#f5eee0" anchorX="center" maxWidth={1.2}>
        {regulatorLabel ? "U1 · BUCK MODULE" : component.label}
      </Text>
      <Text position={[0, 0.44, 0]} fontSize={0.08} color="#b3c4bd" anchorX="center" maxWidth={1.2}>
        {component.value}
      </Text>
    </group>
  );
}

function FlowParticle({ points, offset }: { points: [number, number, number][]; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || points.length < 2) return;
    const progress = (clock.elapsedTime * 0.24 + offset) % 1;
    const segmentProgress = progress * (points.length - 1);
    const segment = Math.min(points.length - 2, Math.floor(segmentProgress));
    const local = segmentProgress - segment;
    const from = points[segment];
    const to = points[segment + 1];
    ref.current.position.set(from[0] + (to[0] - from[0]) * local, from[1] + (to[1] - from[1]) * local, from[2] + (to[2] - from[2]) * local);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.027, 8, 8]} />
      <meshBasicMaterial color="#b8ffd0" toneMapped={false} />
    </mesh>
  );
}

const fallbackBoard: BreadboardModel = {
  template: "empty",
  evidence_note: "This run does not include a breadboard layout.",
  components: [],
  wires: [],
};

export default function PcbSpecimenScene({
  board,
  plan,
  layer,
  powered = false,
  reducedMotion = false,
  isPcb = false,
  isOverheating = false,
}: {
  board?: BreadboardModel;
  plan: CandidatePlan;
  layer: ViewLayer;
  powered?: boolean;
  reducedMotion?: boolean;
  isPcb?: boolean;
  isOverheating?: boolean;
}) {
  const model = board ?? fallbackBoard;
  const pathPoints = (points: [number, number][]) => points.map(([x, z], index) => [x, 0.11 + (index % 2 ? 0.055 : 0.025), z] as [number, number, number]);
  const wireOpacity = layer === "topology" || layer === "flow" ? 1 : 0.86;

  return (
    <group rotation={[-0.06, 0.08, 0]}>
      {isPcb ? <PcbBase /> : <BreadboardBase />}
      {model.wires.map((wire) => (
        <group key={wire.id}>
          <Line points={pathPoints(wire.points)} color={wire.color} lineWidth={layer === "flow" ? 3.2 : 2.4} transparent opacity={wireOpacity} />
          {powered && !reducedMotion && pathPoints(wire.points).length > 1 && <FlowParticle points={pathPoints(wire.points)} offset={(wire.id.length % 5) / 5} />}
          {layer === "flow" && (
            <mesh position={[wire.points[Math.floor(wire.points.length / 2)][0], 0.2, wire.points[Math.floor(wire.points.length / 2)][1]]}>
              <sphereGeometry args={[0.045, 12, 10]} />
              <meshBasicMaterial color={wire.color} />
            </mesh>
          )}
        </group>
      ))}
      {model.components.map((component) => (
        <Part
          key={component.id}
          component={component}
          plan={plan}
          layer={layer}
          template={model.template}
          powered={powered && component.kind === "led"}
          isOverheating={isOverheating}
        />
      ))}
      <Text position={[0, 1.25, -1.95]} fontSize={0.12} color="#f5eee0" anchorX="center">
        {isPcb
          ? "FR-4 PCB SOLDERED BOARD · FABRICATION VIEW"
          : model.template === "regulator-demo"
          ? "12 V → 5 V · REGULATOR & BUCK BENCH"
          : model.template === "empty"
          ? "CUSTOM CIRCUIT BENCH"
          : "USER CIRCUIT · STARTER WIRING DRAFT"}
      </Text>
      <Text position={[0, 0.04, 2.0]} fontSize={0.075} color="#d4ded8" anchorX="center">
        {layer === "flow" ? "FLOW: WATCH ELECTRON CURRENT MOVE THROUGH WIRES" : layer === "thermal" ? "THERMAL REVIEW: HIGHLIGHTED HOTSPOTS EXCEED SAFE MARGINS" : isPcb ? "COPPER ROUTING · SILKSCREEN LABELS · ANNULAR PADS" : "A–E  /  CENTER TRENCH  /  F–J"}
      </Text>
    </group>
  );
}
