import { Activity, ArrowDownRight, ArrowRight, FileDiff, Info, Network, Thermometer } from "lucide-react";
import type { AnalysisRun, CandidatePlan, ProgressEvent, ViewLayer } from "../../types/patchpath";

function metricEntries(run: AnalysisRun, plan?: CandidatePlan): [string, string][] {
  const metrics = run.analysis_json.metrics ?? {};
  if (run.mode === "cs_repo") {
    const advisories = run.analysis_json.findings ?? [];
    return [["Declared packages", String(run.analysis_json.package_count ?? run.system_graph_json.nodes.length - 1)], ["Matching bundled advisories", String(advisories.length)], ["Resolved versions", String(run.analysis_json.repository_scan?.resolved_package_count ?? 0)]];
  }
  if (run.mode === "ece_circuit") {
    if (metrics.current_ma !== undefined) return [["Supply", `${metrics.supply_v} V`], ["LED current estimate", `${metrics.current_ma} mA`], ["Series resistor", `${metrics.resistor_ohm} Ω`], ["Resistor power", `${metrics.resistor_power_w} W`]];
    return [["Input / output", `${metrics.vin_v ?? "—"} V → ${metrics.vout_v ?? "—"} V`], ["Load", `${metrics.load_a ?? "—"} A`], ["Linear regulator loss", `${metrics.linear_loss_w ?? "—"} W`], ["Temperature estimate", `${metrics.linear_junction_estimate_c ?? "—"} °C`]];
  }
  if (run.mode === "civil_mech") return [["Total load", `${metrics.load_total_kn ?? "—"} kN`], ["Target member", String(metrics.target_member ?? "—")], ["Target Euler ratio", String(metrics.baseline_target_buckling_ratio ?? "—")], ["Max stress", `${metrics.baseline_max_stress_mpa ?? "—"} MPa`]];
  if (run.mode === "mechanical_beam") {
    const scenario = plan?.scenario ?? metrics;
    return [["Span", `${scenario.span_m ?? "—"} m`], ["Center load", `${scenario.load_kn ?? "—"} kN`], ["Young’s modulus E", `${scenario.youngs_modulus_gpa ?? "—"} GPa`], ["Rectangular section", `${scenario.width_mm ?? "—"} × ${scenario.depth_mm ?? "—"} mm`], ["Max moment", `${scenario.max_moment_knm ?? "—"} kN·m`], ["Max bending stress", `${scenario.max_bending_stress_mpa ?? "—"} MPa`], ["Center deflection", `${scenario.max_deflection_mm ?? "—"} mm`], ["Second moment I", `${scenario.inertia_mm4 ?? "—"} mm⁴`]];
  }
  return [["Graph nodes", String(run.system_graph_json.nodes.length)], ["Connections", String(run.system_graph_json.edges.length)], ["Template status", "Planning draft"]];
}

export default function LayerInspector({ run, plan, layer, busy, progress, onRun }: {
  run: AnalysisRun; plan: CandidatePlan; layer: ViewLayer; busy: boolean; progress: ProgressEvent[]; onRun: () => void;
}) {
  const graph = run.system_graph_json;
  const nodeLabel = (label: string) => run.mode === "civil_mech" ? `Joint ${label}` : label;
  if (layer === "overview") return <section className="layer-inspector" aria-live="polite">
    <div className="layer-inspector-heading"><span className="mini-label">OVERVIEW</span><strong>{run.title}</strong></div>
    <p>{run.analysis_json.evidence_note ?? graph.evidence_note ?? "This view summarizes the current model and its evidence limits."}</p>
    <div className="layer-metrics">{metricEntries(run, plan).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <details className="learn-why"><summary>Learn why · understand this result</summary><div className="learn-why-grid"><article><strong>What happened?</strong><p>{run.mode === "cs_repo" ? `${(run.analysis_json.findings ?? []).length} bundled advisory match(es) were found in the submitted package metadata.` : run.mode === "ece_circuit" ? run.analysis_json.breadboard?.evidence_note ?? "A rule-based electronics estimate was produced from the saved circuit inputs." : run.mode === "civil_mech" ? `The idealized truss model estimates member forces and checks the target member against Euler buckling.` : run.mode === "mechanical_beam" ? "A simply supported center-load formula estimated bending stress and deflection." : "A keyword-based planning template was generated."}</p></article><article><strong>Why did it happen?</strong><p>{run.mode === "cs_repo" ? "The advisory matcher checks supported package metadata; it does not inspect call sites or prove that a vulnerable path is used." : run.mode === "ece_circuit" ? "Circuit values and connections come from a supported template and stated assumptions; this is not an electrical simulator." : run.mode === "civil_mech" ? "The result follows the fixed geometry, material, support, and load assumptions in this 2D teaching model." : run.mode === "mechanical_beam" ? "The estimate follows the saved beam dimensions and linear elastic center-load equations." : "The output is selected by deterministic keywords, not a validated engineering design."}</p></article><article><strong>How does the proposed fix work?</strong><p>{plan.reason} {plan.evidence_status}. {plan.risks?.[0] ? `Still to check: ${plan.risks[0]}` : "Review the stated assumptions before acting."}</p></article></div></details>
  </section>;

  if (layer === "topology") return <section className="layer-inspector" aria-live="polite">
    <div className="layer-inspector-heading"><span className="mini-label"><Network size={13} /> TOPOLOGY</span><strong>{graph.nodes.length} parts · {graph.edges.length} connections</strong></div>
    <div className="topology-list">{graph.nodes.slice(0, 18).map((node) => <article key={node.id}><span className={`node-status status-${node.status ?? "stable"}`} /> <strong>{nodeLabel(node.label)}</strong><small>{node.kind ?? node.layer} · {node.status ?? "stable"}</small></article>)}</div>
    {graph.nodes.length > 18 && <p>Showing the first 18 labelled nodes; the count above includes the complete graph.</p>}
    <p>{graph.evidence_note ?? "Connections are derived from the input graph."}</p>
  </section>;

  if (layer === "thermal") return <section className="layer-inspector" aria-live="polite">
    <div className="layer-inspector-heading"><span className="mini-label">{run.mode === "custom_upskiller" ? <Info size={13} /> : <Thermometer size={13} />} {run.mode === "cs_repo" ? "RISK / ADVISORY" : run.mode === "civil_mech" ? "STRESS / BUCKLING" : run.mode === "mechanical_beam" ? "BENDING / DEFLECTION" : run.mode === "custom_upskiller" ? "ASSUMPTIONS" : "STRESS / THERMAL"}</span><strong>What the numbers mean</strong></div>
    <div className="layer-metrics">{metricEntries(run, plan).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {run.mode === "cs_repo" && <div className="finding-list">{(run.analysis_json.findings ?? []).map((finding: { id: string; title: string; affected: string; fixed: string }) => <article key={finding.id}><strong>{finding.id} · {finding.title}</strong><span>Affected: {finding.affected}; fixed: {finding.fixed}.</span></article>)}{!(run.analysis_json.findings ?? []).length && <p>No match in the bundled Lodash advisories; this does not mean the repository is free of vulnerabilities.</p>}</div>}
    {run.mode === "custom_upskiller" && <p>This mode has no physical, thermal, or code-advisory solver. Its four-layer output is a heuristic planning template.</p>}
    {run.mode === "mechanical_beam" && <><p><strong>Model:</strong> I = b h³ / 12; Mmax = P L / 4; σmax = M(h/2) / I; δmax = P L³ / (48 E I).</p><p><strong>Assumptions:</strong> {(run.analysis_json.metrics?.assumptions ?? []).join(" ")}</p></>}
    <p><strong>Assumptions:</strong> {run.analysis_json.metrics?.assumption_note ?? graph.evidence_note ?? "No measured stress or temperature is available for this model."}</p>
  </section>;

  if (layer === "flow") {
    const labels = new Map(graph.nodes.map((node) => [node.id, nodeLabel(node.label)]));
    return <section className="layer-inspector" aria-live="polite">
      <div className="layer-inspector-heading"><span className="mini-label"><ArrowDownRight size={13} /> FLOW / PATH</span><strong>Follow the connections</strong></div>
      <div className="flow-list">{graph.edges.slice(0, 20).map((edge, index) => <article key={`${edge.source}-${edge.target}-${index}`}><span>{labels.get(edge.source) ?? edge.source}</span><ArrowRight size={14} /><span>{labels.get(edge.target) ?? edge.target}</span><small>{edge.label || "connected"}</small></article>)}</div>
      {graph.edges.length > 20 && <p>Showing the first 20 paths. The 3D model still contains all {graph.edges.length} connections.</p>}
      {run.mode === "custom_upskiller" && <p>These arrows are template architecture dependencies inferred from a planning scaffold, not discovered runtime traffic.</p>}
    </section>;
  }

  if (layer === "logs") return <section className="execution-log" aria-live="polite">
    <div className="log-heading"><span><Activity size={15} /> RULE SIMULATION</span><span>{busy ? "RUNNING" : progress.length ? "COMPLETE" : "READY"}</span></div>
    {progress.length === 0 ? <><p>Run the selected plan to see each rule-based step. This does not execute code, energize hardware, or run a certified engineering simulation.</p><button className="button button-outline" onClick={onRun} disabled={busy}>{busy ? "Running…" : "Run this plan"}</button></> : progress.map((event) => <div className="log-event" key={event.sequence}><span className="log-seq">{String(event.sequence).padStart(2, "0")}</span><div><strong>{event.step_name.replaceAll("_", " ")}</strong><p>{event.message}</p></div></div>)}
  </section>;

  return <section className="layer-inspector" aria-live="polite">
    <div className="layer-inspector-heading"><span className="mini-label"><FileDiff size={13} /> PATCH NOTES</span><strong>{plan.label} · {plan.name}</strong></div>
    <p>{plan.summary}</p>
    <p>{plan.reason}</p>
    <div className="patch-note-columns"><div><strong>Evidence</strong><ul>{plan.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Risks / still to check</strong><ul>{plan.risks.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
    <p className="layer-evidence-label">{plan.evidence_status} · {plan.estimated_scope}. Nothing is applied automatically.</p>
  </section>;
}
