import { ChevronDown, CircleHelp } from "lucide-react";
import type { AnalysisRun } from "../../types/patchpath";

const guides: Record<AnalysisRun["mode"], { title: string; summary: string; steps: string[]; limit: string }> = {
  cs_repo: {
    title: "Software repository review",
    summary: "The graph shows package dependencies from package.json files you selected. A supported npm lockfile can add exact installed versions; bundled advisories currently cover Lodash only.",
    steps: ["Choose a repository folder or paste a public GitHub URL / package.json.", "Review the dependency graph, matching advisory, and unknowns.", "Compare the proposed dependency change; nothing is edited automatically."],
    limit: "This prototype does not inspect source code, run the project, build a call graph, or provide a complete vulnerability scan. Folder upload sends only package.json and package-lock.json metadata.",
  },
  ece_circuit: {
    title: "Electronics breadboard",
    summary: "The board shows components and wires from a supported starter circuit. The seeded sample compares a 12 V to 5 V regulator; custom drafts support a series LED circuit or ESP32 + DHT22.",
    steps: ["Describe the parts and supply in the Electronics input.", "Check every wire, pin, and assumed part value in the breadboard view.", "Change the description and regenerate when you need a different circuit."],
    limit: "This is a wiring proposal, not a circuit simulator. Confirm the exact component datasheets, pinout, power, breadboard limits, and connections before building.",
  },
  civil_mech: {
    title: "Civil structures: five-panel truss",
    summary: "This solver calculates an idealized 2D Warren truss with 11 joints and 19 members. You can change the total load; the geometry, material, supports, and section assumptions remain fixed.",
    steps: ["Enter a truss description with a total load in kN.", "Inspect the highlighted target member and calculated stress / buckling results.", "Compare a member-section change; connection and code checks remain outside this model."],
    limit: "This does not model buildings, foundations, connections, 3D stability, or construction. Mechanical machine design and motion analysis are not implemented in this mode.",
  },
  mechanical_beam: {
    title: "Mechanical: center-loaded beam",
    summary: "Enter a span, center point load, rectangular section width and depth, and elastic modulus. The model calculates center deflection and maximum bending stress from a closed-form beam equation.",
    steps: ["Describe a simply supported beam and include units for any values you want to change.", "Inspect the load path, section, stress estimate, and deflection in the beam view.", "Select a plan to compare a wider section, a deeper section, or a lower load; the 3D curve is exaggerated up to 500× for visibility."],
    limit: "This is a single static Euler–Bernoulli teaching case. It does not model shear deformation, self-weight, local or lateral buckling, material failure, joints, fatigue, or design codes. No safety factor is calculated.",
  },
  custom_upskiller: {
    title: "Your idea: planning draft",
    summary: "The analyzer turns your description into a four-layer project outline and starter graph using keyword rules. It is not connected to an LLM.",
    steps: ["Describe the user, goal, constraints, and what success looks like.", "Check the automatically selected department lens and correct it if needed.", "Use the draft to plan a measurable first prototype, then add real inputs to a domain workspace."],
    limit: "The four graph nodes are a planning template, not components discovered from your project. Suggestions need human review.",
  },
};

export default function ModeGuide({ run }: { run: AnalysisRun }) {
  const guide = guides[run.mode];
  const repositoryScan = run.analysis_json.repository_scan as { manifest_count?: number; resolved_package_count?: number; coverage_note?: string } | undefined;
  const summary = run.mode === "cs_repo" && repositoryScan
    ? `Read ${repositoryScan.manifest_count ?? 1} package manifest(s) and resolved ${repositoryScan.resolved_package_count ?? 0} package versions from a supported npm lockfile. ${repositoryScan.coverage_note ?? ""}`
    : guide.summary;
  return <section className="mode-guide" aria-labelledby="mode-guide-title">
    <div className="mode-guide-icon"><CircleHelp size={18} /></div>
    <div className="mode-guide-copy">
      <div className="mini-label">WHAT THIS WORKSPACE ACTUALLY CHECKS</div>
      <h3 id="mode-guide-title">{guide.title}</h3>
      <p>{summary}</p>
      <details>
        <summary>How to use it and what it cannot prove <ChevronDown size={14} /></summary>
        <div className="mode-guide-details">
          <ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p><strong>Limit:</strong> {guide.limit}</p>
        </div>
      </details>
    </div>
  </section>;
}
