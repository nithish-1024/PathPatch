import { Activity, FileText, GitCompare, Network, ScanEye, Thermometer } from "lucide-react";
import type { Mode, ViewLayer } from "../../types/patchpath";

const items: { id: ViewLayer; label: string; Icon: typeof Network }[] = [
  { id: "overview", label: "Overview", Icon: ScanEye },
  { id: "topology", label: "Topology", Icon: Network },
  { id: "thermal", label: "Stress / thermal", Icon: Thermometer },
  { id: "flow", label: "Flow", Icon: Activity },
  { id: "logs", label: "Run log", Icon: FileText },
  { id: "diff", label: "Patch notes", Icon: GitCompare },
];

export default function LeftInspectionRail({ active, onSelect, mode }: { active: ViewLayer; onSelect: (layer: ViewLayer) => void; mode: Mode }) {
  const riskLabel = mode === "cs_repo" ? "Risk" : mode === "civil_mech" || mode === "mechanical_beam" ? "Stress" : mode === "custom_upskiller" ? "Assumptions" : "Thermal";
  return <nav className="inspection-rail" aria-label="Visualization layer">
    <div className="rail-heading">LAYER</div>
    {items.map(({ id, label, Icon }) => <button key={id} className={active === id ? "rail-item selected" : "rail-item"} onClick={() => onSelect(id)} aria-pressed={active === id} title={id === "thermal" ? riskLabel : label}>
      <Icon size={17} strokeWidth={1.8} /><span>{id === "thermal" ? riskLabel : label}</span>
    </button>)}
  </nav>;
}

