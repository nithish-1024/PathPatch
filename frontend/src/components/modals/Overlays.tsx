import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, CircleHelp, FileDiff, FolderUp, LogIn, ShieldCheck, X } from "lucide-react";
import type { AnalysisRun, CandidatePlan, Mode, User } from "../../types/patchpath";

function ModalFrame({ title, kicker, onClose, children, size = "normal" }: { title: string; kicker?: string; onClose: () => void; children: ReactNode; size?: "normal" | "wide" }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal-card ${size === "wide" ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header className="modal-header"><div>{kicker && <span className="mini-label">{kicker}</span>}<h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
      {children}
    </section>
  </div>;
}

export function AuthModal({ onClose, onDemo, onLogin, onRegister, busy, error, demoLoginEnabled = true }: {
  onClose: () => void; onDemo: () => void; onLogin: (email: string, password: string) => void;
  onRegister: (email: string, name: string, password: string, department: string) => void; busy: boolean; error: string;
  demoLoginEnabled?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("CSE / Interdisciplinary DT");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (creating) onRegister(email, name, password, department);
    else onLogin(email, password);
  };
  return <ModalFrame title={creating ? "Create your account" : "Welcome back"} kicker="SAVE YOUR WORK" onClose={onClose}>
    <p className="modal-intro">Save analyses and return to your engineering field notes later.</p>
    <form className="stacked-form" onSubmit={submit}>
      {creating && <label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}
      <label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input required minLength={creating ? 8 : 1} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={creating ? "new-password" : "current-password"} /></label>
      {creating && <label>Department<input value={department} onChange={(e) => setDepartment(e.target.value)} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-ink full-button" disabled={busy}>{busy ? "Working…" : creating ? "Create account" : <>Sign in <LogIn size={15} /></>}</button>
    </form>
    <div className="modal-divider"><span>OR</span></div>
    <button className="demo-login-button" onClick={onDemo} disabled={busy}><ShieldCheck size={16} /><span><strong>{demoLoginEnabled ? "One-click demo login" : "One-click demo login (Disabled)"}</strong><small>{demoLoginEnabled ? "Open the seeded judge account" : "Disabled in production; register an account above"}</small></span><ArrowRight size={16} /></button>
    <button className="modal-text-button" onClick={() => setCreating((value) => !value)}>{creating ? "Already have an account? Sign in" : "New here? Create a free account"}</button>
  </ModalFrame>;
}

export function AuthPage({ onReturn, onDemo, onLogin, onRegister, busy, error, initialCreating = false, demoLoginEnabled = true }: {
  onReturn: () => void; onDemo: () => void; onLogin: (email: string, password: string) => void;
  onRegister: (email: string, name: string, password: string, department: string) => void;
  busy: boolean; error: string; initialCreating?: boolean; demoLoginEnabled?: boolean;
}) {
  const [creating, setCreating] = useState(initialCreating);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("CSE / Interdisciplinary DT");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (creating) onRegister(email, name, password, department);
    else onLogin(email, password);
  };
  return <main className="auth-page">
    <header className="auth-page-header">
      <a href="/" className="brand-lockup" onClick={(event) => { event.preventDefault(); onReturn(); }}><span className="brand-mark"><span /><span /><span /></span><span>PATCHPATH<small>UNIVERSAL</small></span></a>
      <button className="auth-return" onClick={onReturn}><ArrowLeft size={15} /> Back to the workbench</button>
    </header>
    <div className="auth-page-grid">
      <section className="auth-story">
        <span className="mini-label">ENGINEERING FIELD NOTES / ACCOUNT</span>
        <h1>{creating ? <>Start your<br /><em>field notes.</em></> : <>Keep your<br /><em>work in view.</em></>}</h1>
        <p>Save analyses, revisit assumptions, and continue comparing plans in your local PatchPath workspace.</p>
        <div className="auth-story-stamp"><span>01</span><div><strong>Evidence stays attached</strong><small>Each saved run keeps its input and limits together.</small></div></div>
        <div className="auth-story-stamp"><span>02</span><div><strong>Changes stay yours</strong><small>Plans are proposals. Nothing is applied automatically.</small></div></div>
      </section>
      <section className="auth-page-card" aria-labelledby="auth-page-title">
        <span className="mini-label">{creating ? "CREATE A LOCAL ACCOUNT" : "WELCOME BACK"}</span>
        <h2 id="auth-page-title">{creating ? "Create your account" : "Sign in"}</h2>
        <p className="auth-page-intro">{creating ? "Your account saves analysis runs to your durable database." : "Sign in to open your saved analyses and simulation logs."}</p>
        <form className="stacked-form" onSubmit={submit}>
          {creating && <label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
          <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
          <label>Password<input required minLength={creating ? 8 : 1} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={creating ? "new-password" : "current-password"} /></label>
          {creating && <label>Department<input value={department} onChange={(event) => setDepartment(event.target.value)} /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-ink full-button" disabled={busy}>{busy ? "Working…" : creating ? "Create account" : <>Sign in <LogIn size={15} /></>}</button>
        </form>
        <div className="modal-divider"><span>OR</span></div>
        <button className="demo-login-button" onClick={onDemo} disabled={busy}><ShieldCheck size={16} /><span><strong>{demoLoginEnabled ? "Continue with the demo account" : "One-click demo login (Disabled)"}</strong><small>{demoLoginEnabled ? "Open the seeded local examples" : "Disabled in production; register a personal account"}</small></span><ArrowRight size={16} /></button>
        <button className="modal-text-button" onClick={() => setCreating((value) => !value)}>{creating ? "Already have an account? Sign in" : "New here? Create an account"}</button>
      </section>
    </div>
    <footer className="auth-page-footer">SECURE AUTHENTICATION · PASSWORDS ARE HASHED · SESSION COOKIE IS HTTPONLY</footer>
  </main>;
}

export function IdeaAndRepoUpskillerModal({ onClose, onSubmit, busy, error, mode = "custom_upskiller" }: { onClose: () => void; onSubmit: (title: string, raw: string, lens: string, repositoryFiles?: Record<string, string>, analysisType?: "repository" | "circuit" | "truss" | "beam" | "idea") => void; busy: boolean; error: string; mode?: Mode }) {
  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [lens, setLens] = useState("auto");
  const [repositoryFiles, setRepositoryFiles] = useState<Record<string, string>>({});
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const folderInput = useRef<HTMLInputElement>(null);
  useEffect(() => { folderInput.current?.setAttribute("webkitdirectory", ""); }, []);
  const isRepository = mode === "cs_repo";
  const lensForMode = mode === "ece_circuit" ? "ece" : mode === "civil_mech" ? "civil" : isRepository ? "cse" : lens;
  const handleFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? []);
    const metadata = selected.filter((file) => file.name === "package.json" || file.name === "package-lock.json");
    const manifests = metadata.filter((file) => file.name === "package.json");
    const total = metadata.reduce((sum, file) => sum + file.size, 0);
    if (!manifests.length) { setFolderError("No package.json was found. Choose a Node.js repository folder or paste the manifest."); setRepositoryFiles({}); return; }
    if (metadata.length > 40 || total > 500_000 || metadata.some((file) => file.size > 100_000)) {
      setFolderError("This prototype accepts up to 40 package metadata files, 100 KB each, and 500 KB total."); setRepositoryFiles({}); return;
    }
    const entries: Record<string, string> = {};
    for (const file of metadata) {
      const path = file.webkitRelativePath || file.name;
      entries[path] = await file.text();
    }
    setRepositoryFiles(entries);
    setFolderName(selected[0]?.webkitRelativePath.split("/")[0] || "Selected repository");
    setFolderError("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const analysisType = mode === "cs_repo" ? "repository" : mode === "ece_circuit" ? "circuit" : mode === "civil_mech" ? "truss" : mode === "mechanical_beam" ? "beam" : "idea";
    const defaultTitle = mode === "ece_circuit" ? "Starter breadboard circuit" : mode === "civil_mech" ? "Warren truss study" : mode === "mechanical_beam" ? "Beam section study" : mode === "custom_upskiller" ? "Project idea" : "Repository review";
    onSubmit(title || folderName || defaultTitle, raw || folderName || "Selected repository folder", lensForMode, Object.keys(repositoryFiles).length ? repositoryFiles : undefined, analysisType);
  };
  const copy = mode === "cs_repo" ? {
    title: "Review a software repository", kicker: "SOFTWARE / NODE DEPENDENCIES",
    intro: "Choose a repository folder, paste package.json, or enter a public GitHub URL. Only package.json and package-lock.json are read; source code is not uploaded or executed.",
    inputLabel: "Public GitHub URL or package.json", placeholder: "https://github.com/owner/repository\n\nOr paste package.json…", button: "Review repository",
  } : mode === "ece_circuit" ? {
    title: "Draft a breadboard circuit", kicker: "ELECTRONICS / SUPPORTED STARTER CIRCUITS",
    intro: "Describe an LED with a series resistor, or an ESP32 with a DHT22 temperature sensor. The generated layout shows assumptions and needs hardware review.",
    inputLabel: "Parts, supply, and intended connections", placeholder: "Build a 5 V red LED circuit with a resistor\n\nOr: ESP32 with a DHT22 temperature sensor…", button: "Generate breadboard draft",
  } : mode === "civil_mech" ? {
    title: "Change the truss load", kicker: "CIVIL / FIVE-PANEL TEACHING TRUSS",
    intro: "This workspace solves only the fixed 2D Warren truss. Provide its total load in kN. The geometry, supports, and material assumptions stay fixed.",
    inputLabel: "Truss and total load", placeholder: "Warren truss, total load 180 kN", button: "Recalculate truss",
  } : mode === "mechanical_beam" ? {
    title: "Study a simply supported beam", kicker: "MECHANICAL / CENTER POINT LOAD",
    intro: "Change span, center load, rectangular section width/depth, or Young’s modulus. Missing values use the displayed starter assumptions. This is a static teaching formula, not a design check.",
    inputLabel: "Beam description and values with units", placeholder: "Simply supported beam, span 2 m, center load 1 kN, width 50 mm, depth 100 mm, E 200 GPa", button: "Calculate beam estimate",
  } : {
    title: "Turn an idea into a plan", kicker: "YOUR IDEA / PLANNING DRAFT",
    intro: "Describe the people, goal, constraints, and what success looks like. This is a deterministic starting draft, not an AI review.",
    inputLabel: "Project idea", placeholder: "I want to build…", button: "Create planning draft",
  };
  return <ModalFrame title={copy.title} kicker={copy.kicker} onClose={onClose} size="wide">
    <p className="modal-intro">{copy.intro}</p>
    <form className="stacked-form idea-form" onSubmit={submit}>
      <label>Project title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={folderName || (mode === "ece_circuit" ? "e.g. Room temperature monitor" : "Optional title")} /></label>
      {isRepository && <div className="repository-picker">
        <input ref={folderInput} type="file" multiple hidden onChange={handleFolder} aria-label="Choose a Node.js repository folder" />
        <button type="button" className="button button-outline" onClick={() => folderInput.current?.click()}><FolderUp size={15} /> Choose repository folder</button>
        {folderName && <span className="repository-picked">{folderName} · {Object.keys(repositoryFiles).length} metadata files</span>}
      </div>}
      <label>{copy.inputLabel}<textarea value={raw} onChange={(event) => setRaw(event.target.value)} required={!Object.keys(repositoryFiles).length} minLength={Object.keys(repositoryFiles).length ? undefined : 2} maxLength={100000} rows={7} placeholder={copy.placeholder} /></label>
      {mode === "custom_upskiller" && <label>Department lens<select value={lens} onChange={(event) => setLens(event.target.value)}><option value="auto">Auto-detect</option><option value="cse">Computer science / software</option><option value="ece">Electronics / IoT</option><option value="civil">Civil / structural</option><option value="mechanical">Mechanical / robotics</option><option value="all_department_dt">Cross-department DT</option></select></label>}
      {(folderError || error) && <p className="form-error" role="alert">{folderError || error}</p>}
      <button className="button button-ink" disabled={busy}>{busy ? "Analyzing…" : <>{copy.button} <ArrowRight size={16} /></>}</button>
    </form>
  </ModalFrame>;
}

export function HistoryDrawer({ onClose, runs, user, onSelect }: { onClose: () => void; runs: AnalysisRun[]; user: User | null; onSelect: (run: AnalysisRun) => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="history-drawer" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <header className="modal-header"><div><span className="mini-label">LOCAL WORKSPACE</span><h2 id="history-title">Saved runs</h2></div><button className="icon-button" onClick={onClose} aria-label="Close history"><X size={18} /></button></header>
      {!user && <div className="empty-history"><CircleHelp size={20} /><p>Sign in to see your saved analyses.</p></div>}
      {user && runs.length === 0 && <div className="empty-history"><CircleHelp size={20} /><p>Your analyses will appear here.</p></div>}
      {user && runs.map((run) => <button className="history-row" key={run.id} onClick={() => onSelect(run)}><span className="history-index">{run.mode === "cs_repo" ? "01" : run.mode === "ece_circuit" ? "02" : run.mode === "civil_mech" ? "03" : run.mode === "mechanical_beam" ? "04" : "05"}</span><span><strong>{run.title}</strong><small>{run.mode.replaceAll("_", " ")} · {new Date(run.created_at).toLocaleDateString()}</small></span><ArrowRight size={15} /></button>)}
      <div className="drawer-foot">Analyses are saved to this local project database.</div>
    </aside>
  </div>;
}

function patchForRun(run: AnalysisRun, plan: CandidatePlan): { before: string; after: string; label: string } {
  if (run.mode === "cs_repo") {
    let before = run.raw_input;
    let after = before;
    try {
      const parsed = JSON.parse(before);
      if (parsed.dependencies?.lodash) parsed.dependencies.lodash = "^4.18.1";
      else if (parsed.devDependencies?.lodash) parsed.devDependencies.lodash = "^4.18.1";
      after = JSON.stringify(parsed, null, 2);
    } catch { after = "No valid package.json was saved for this run."; }
    return { before, after, label: "package.json proposal · lockfile and compatibility checks not included" };
  }
  if (run.mode === "ece_circuit") return {
    before: "U1: LM7805 linear regulator\nVIN: 12 V\nVOUT: 5 V\nILOAD: 0.35 A\nPLOSS: 2.45 W (ideal linear model)",
    after: "U1: TSR 1-2450 step-down module\nVIN: 12 V (within datasheet input range)\nVOUT: 5 V\nILOAD: 0.35 A (below 1 A rating)\nTHERMAL / RIPPLE: requires board validation",
    label: "teaching comparison · component ratings sourced; PCB not validated",
  };
  if (run.mode === "civil_mech") return {
    before: `Target member: ${run.analysis_json.metrics?.target_member ?? "B4-C4"}\nBuckling ratio: ${run.analysis_json.metrics?.baseline_target_buckling_ratio ?? "n/a"}\nModel: 2D ideal axial truss`,
    after: `${plan.summary}\n\nConnection checks: not modeled\nCode review: not performed\nModel: 2D ideal axial truss`,
    label: "solver input comparison · not a construction drawing or approval",
  };
  if (run.mode === "mechanical_beam") {
    const scenario = plan.scenario ?? run.analysis_json.metrics ?? {};
    return {
      before: `Span: ${run.analysis_json.metrics?.span_m ?? "—"} m\nCenter load: ${run.analysis_json.metrics?.load_kn ?? "—"} kN\nSection: ${run.analysis_json.metrics?.width_mm ?? "—"} × ${run.analysis_json.metrics?.depth_mm ?? "—"} mm\nBending stress estimate: ${run.analysis_json.metrics?.max_bending_stress_mpa ?? "—"} MPa\nCenter deflection: ${run.analysis_json.metrics?.max_deflection_mm ?? "—"} mm`,
      after: `${plan.name}\n${plan.summary}\n\nCompared section: ${scenario.width_mm ?? "—"} × ${scenario.depth_mm ?? "—"} mm\nCompared load: ${scenario.load_kn ?? "—"} kN\n\nNo strength limit, safety factor, or code check is included.`,
      label: "formula-based teaching comparison · not a design approval",
    };
  }
  return { before: String(run.raw_input), after: plan.summary + "\n\n" + plan.reason, label: "heuristic project draft · human review required" };
}

export function PatchDiffModal({ run, plan, onClose }: { run: AnalysisRun; plan: CandidatePlan; onClose: () => void }) {
  const diff = patchForRun(run, plan);
  const metrics = run.analysis_json.metrics ?? {};
  const findings = run.analysis_json.findings ?? [];
  const comparisons: { label: string; before: string; after: string; improvement?: number; note: string }[] = [];
  const addComparison = (label: string, before: unknown, after: unknown, unit: string, note: string) => {
    const beforeValue = typeof before === "number" && Number.isFinite(before) ? before : undefined;
    const afterValue = typeof after === "number" && Number.isFinite(after) ? after : undefined;
    comparisons.push({ label, before: beforeValue !== undefined ? `${beforeValue} ${unit}` : "Unavailable", after: afterValue !== undefined ? `${afterValue} ${unit}` : "Unavailable", improvement: beforeValue !== undefined && afterValue !== undefined && beforeValue > 0 ? (beforeValue - afterValue) / beforeValue * 100 : undefined, note });
  };
  if (run.mode === "cs_repo") addComparison("Matching vulnerabilities", findings.length, plan.id === "plan_b" ? 0 : findings.length, "finding(s)", "Plan B proposes a patched Lodash floor; the expected count follows bundled advisory matching and does not establish whether affected code paths are used.");
  else if (run.mode === "ece_circuit" && metrics.linear_loss_w !== undefined) {
    const proposed = plan.id === "plan_b" ? metrics.switcher_loss_estimate_w : undefined;
    addComparison("Regulator loss estimate", metrics.linear_loss_w, proposed, "W", "Baseline is a linear model. Proposed value uses the stated typical-efficiency assumption; temperature after the change was not calculated.");
    comparisons.push({ label: "Temperature", before: metrics.linear_junction_estimate_c !== undefined ? `${metrics.linear_junction_estimate_c} °C estimate` : "Unavailable", after: "Unavailable", note: "No post-plan thermal resistance, board layout, or temperature measurement is available." });
  } else if (run.mode === "ece_circuit") addComparison("LED current estimate", metrics.current_ma, metrics.current_ma, "mA", "No alternative electrical scenario is calculated by the selected plan.");
  else if (run.mode === "civil_mech") {
    addComparison("Target Euler ratio", metrics.baseline_target_buckling_ratio, plan.scenario?.target_buckling_ratio, "ratio", "Idealized 2D axial-truss re-solve under the same load; connection and code checks are not included.");
    addComparison("Maximum stress", metrics.baseline_max_stress_mpa, plan.scenario?.max_stress_mpa, "MPa", "Idealized 2D axial-truss re-solve under the same load; this is not a strength approval.");
    addComparison("Maximum displacement", metrics.baseline_max_displacement_mm, plan.scenario?.max_displacement_mm, "mm", "Idealized 2D axial-truss re-solve under the same load.");
  } else if (run.mode === "mechanical_beam") {
    addComparison("Bending stress estimate", metrics.max_bending_stress_mpa, plan.scenario?.max_bending_stress_mpa, "MPa", "Closed-form estimate using the selected plan scenario.");
    addComparison("Center deflection estimate", metrics.max_deflection_mm, plan.scenario?.max_deflection_mm, "mm", "Closed-form estimate using the selected plan scenario.");
  } else comparisons.push({ label: "Engineering measurement", before: "Unavailable", after: "Unavailable", note: "This planning mode has no physical analysis measurements." });
  return <ModalFrame title="Review the proposed change" kicker="PATCH NOTES / NOT AUTO-APPLIED" onClose={onClose} size="wide">
    <div className="diff-disclaimer"><FileDiff size={16} /><span>{diff.label}</span></div>
    <div className="diff-columns"><section><div className="diff-header diff-before">CURRENT INPUT <span>BEFORE</span></div><pre>{diff.before}</pre></section><section><div className="diff-header diff-after">PROPOSED PATH <span>AFTER</span></div><pre>{diff.after}</pre></section></div>
    <section className="comparison-panel"><div className="mini-label">COMPARISON · SELECTED PLAN</div><div className="comparison-grid"><strong>Measure</strong><strong>Original</strong><strong>Selected plan</strong><strong>Change</strong>{comparisons.map((item) => <div className="comparison-row" key={item.label}><b>{item.label}</b><span>{item.before}</span><span>{item.after}</span><span>{item.improvement === undefined ? "Not calculated" : item.improvement > 0 ? `${item.improvement.toFixed(1)}% reduction` : item.improvement < 0 ? `${Math.abs(item.improvement).toFixed(1)}% increase` : "No change"}</span><small>{item.note}</small></div>)}</div></section>
    <div className="modal-bottom-note"><CircleHelp size={15} />This is a proposal for learning. It has not changed a repository, board, or structure.</div>
    <button className="button button-outline" onClick={onClose}>Close review</button>
  </ModalFrame>;
}
