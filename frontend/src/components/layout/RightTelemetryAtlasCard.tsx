import { ArrowUpRight, ShieldAlert, ShieldCheck } from "lucide-react";
import type { AnalysisRun, CandidatePlan } from "../../types/patchpath";

function metricFor(run: AnalysisRun, plan: CandidatePlan) {
  if (run.mode === "cs_repo") {
    const findings = run.analysis_json.findings ?? [];
    return { primary: findings.length ? `${findings.length} findings` : "No match", label: "ADVISORIES", severity: findings.length ? "attention" : "clear", blast: run.analysis_json.package_count ? `${run.analysis_json.package_count} packages` : "Manifest only", signal: "Lockfile not checked" };
  }
  if (run.mode === "ece_circuit") {
    const m = run.analysis_json.metrics ?? {};
    if (m.current_ma !== undefined) return { primary: `${m.current_ma} mA`, label: "LED CURRENT ESTIMATE", severity: Number(m.current_ma) > 20 ? "attention" : "clear", blast: `${m.resistor_ohm} Ω series resistor`, signal: "LED voltage assumed" };
    if (m.data_pin) return { primary: String(m.data_pin), label: "SENSOR DATA PIN", severity: "clear", blast: "ESP32 + DHT22", signal: "Pull-up assumed" };
    return { primary: `${m.linear_loss_w ?? "—"} W`, label: "LINEAR LOSS", severity: "attention", blast: `${m.load_a ?? "—"} A load`, signal: "Thermal input assumed" };
  }
  if (run.mode === "civil_mech") {
    const m = run.analysis_json.metrics ?? {};
    return { primary: `${m.baseline_target_buckling_ratio ?? "—"}`, label: "EULER RATIO", severity: "attention", blast: `${m.member_count ?? "—"} members`, signal: "2D model only" };
  }
  if (run.mode === "mechanical_beam") {
    const m = run.analysis_json.metrics ?? {};
    const scenario = plan.scenario ?? m;
    return { primary: `${scenario.max_bending_stress_mpa ?? "—"} MPa`, label: "BENDING STRESS ESTIMATE", severity: "clear", blast: `${scenario.max_deflection_mm ?? "—"} mm center deflection`, signal: "Linear formula model" };
  }
  return { primary: "Draft", label: "TEMPLATE STATUS", severity: "clear", blast: "4 layers", signal: "Human review needed" };
}

export default function RightTelemetryAtlasCard({ run, plan, onRun, busy, onDiff }: { run: AnalysisRun; plan: CandidatePlan; onRun: () => void; busy: boolean; onDiff: () => void }) {
  const metric = metricFor(run, plan);
  const findings = run.analysis_json.findings?.length ?? 0;
  return <aside className="telemetry-card" aria-label="Selected system details">
    <div className="telemetry-kicker"><span>{run.mode.replaceAll("_", " ").toUpperCase()} / FIELD CARD</span><span className={`status-dot ${metric.severity}`} /></div>
    <div className="telemetry-title-row"><div><div className="mini-label">CURRENT SPECIMEN</div><h2>{run.title}</h2></div><span className={`state-chip ${findings ? "chip-fault" : "chip-calm"}`}>{findings ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}{run.mode === "mechanical_beam" ? "TEACHING MODEL" : run.mode === "custom_upskiller" || run.analysis_json.breadboard?.template !== "regulator-demo" && run.mode === "ece_circuit" ? "DRAFT" : findings ? "REVIEW" : "DRAFT"}</span></div>
    <div className="metric-primary"><div><span className="mini-label">{metric.label}</span><strong>{metric.primary}</strong></div><span className="metric-tag">MODEL<br />VALUE</span></div>
    <div className="fact-grid">
      <div><span>BLAST RADIUS</span><strong>{metric.blast}</strong></div>
      <div><span>VALIDATION</span><strong>{metric.signal}</strong></div>
      <div><span>SELECTED PLAN</span><strong>{plan.label} / {plan.name.split("·")[0].split(" ").slice(0, 3).join(" ")}</strong></div>
      <div><span>DATA STATUS</span><strong>Evidence tagged</strong></div>
    </div>
    <div className="evidence-line"><span className="evidence-bar"><i style={{ width: findings ? "64%" : "78%" }} /></span><div><span>Evidence coverage</span><strong>{run.mode === "cs_repo" ? "PARTIAL" : run.mode === "custom_upskiller" || run.analysis_json.breadboard?.template !== "regulator-demo" && run.mode === "ece_circuit" ? "DRAFT" : "MODELLED"}</strong></div></div>
    <p className="telemetry-note">{run.analysis_json.evidence_note ?? run.system_graph_json.evidence_note ?? "Review the evidence and assumptions before acting."}</p>
    <div className="telemetry-actions">
      <button className="button button-ink full-button" onClick={onRun} disabled={busy}>{busy ? <><span className="button-spinner" /> Running rules</> : <>Run rule simulation <ArrowUpRight size={15} /></>}</button>
      <button className="button button-outline full-button" onClick={onDiff}>Review proposed change <ArrowUpRight size={15} /></button>
    </div>
    <div className="run-label">RULE-BASED TEACHING SIMULATION · NO CODE OR HARDWARE EXECUTED</div>
  </aside>;
}

