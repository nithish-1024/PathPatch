import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, BadgeCheck, CircleAlert, CircleCheck, Info, LockKeyhole, Sparkles, X } from "lucide-react";
import SmoothScrollProvider from "./components/motion/SmoothScrollProvider";
import ScrollyHeroSection from "./components/layout/ScrollyHeroSection";
import TopWorkspaceBar from "./components/layout/TopWorkspaceBar";
import LeftInspectionRail from "./components/layout/LeftInspectionRail";
import RightTelemetryAtlasCard from "./components/layout/RightTelemetryAtlasCard";
import BottomPlanDeck from "./components/layout/BottomPlanDeck";
import SpatialCalloutOverlay from "./components/layout/SpatialCalloutOverlay";
import ModeGuide from "./components/layout/ModeGuide";
import LayerInspector from "./components/layout/LayerInspector";
import Deferred3DViewport from "./scenes/Deferred3DViewport";
import { AuthPage, HistoryDrawer, IdeaAndRepoUpskillerModal, PatchDiffModal } from "./components/modals/Overlays";
import { api, streamExecution } from "./api/client";
import type { AnalysisRun, CandidatePlan, Mode, ProgressEvent, User, ViewLayer } from "./types/patchpath";

const modes: Mode[] = ["cs_repo", "ece_circuit", "civil_mech", "mechanical_beam", "custom_upskiller"];
const fallbackModeNames: Record<Mode, string> = {
  cs_repo: "Software repositories", ece_circuit: "Breadboard circuits", civil_mech: "Civil truss", mechanical_beam: "Mechanical beam", custom_upskiller: "Your idea",
};

export default function App() {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [mode, setMode] = useState<Mode>("cs_repo");
  const [selectedPlanId, setSelectedPlanId] = useState("plan_b");
  const [layer, setLayer] = useState<ViewLayer>("overview");
  const [dark, setDark] = useState(false);
  const [pathname, setPathname] = useState(window.location.pathname);
  const [user, setUser] = useState<User | null>(null);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [ideaBusy, setIdeaBusy] = useState(false);
  const [simulationBusy, setSimulationBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [ideaError, setIdeaError] = useState("");
  const [pageError, setPageError] = useState("");
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [notice, setNotice] = useState("");
  const simulationAbort = useRef<AbortController | null>(null);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const navigate = (path: string) => {
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setPathname(path);
  };

  const selectedPlan = useMemo<CandidatePlan | undefined>(
    () => run?.candidate_plans_json.find((plan) => plan.id === selectedPlanId) ?? run?.candidate_plans_json[1],
    [run, selectedPlanId],
  );

  const loadDemo = useCallback(async (nextMode: Mode) => {
    setPageError("");
    try {
      const nextRun = await api.demo(nextMode);
      setRun(nextRun);
      setMode(nextMode);
      setSelectedPlanId(nextRun.selected_plan_id || "plan_b");
      setLayer("overview");
      setProgress([]);
      setSimulationBusy(false);
      simulationAbort.current?.abort();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not load this specimen.");
    }
  }, []);

  useEffect(() => {
    if (!isAuthPage) loadDemo("cs_repo");
    api.me().then(setUser).catch(() => setUser(null));
  }, [loadDemo, isAuthPage]);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleMode = (nextMode: Mode) => {
    if (!modes.includes(nextMode)) return;
    setMode(nextMode);
    void loadDemo(nextMode);
    if (nextMode === "custom_upskiller") setIdeaOpen(true);
  };

  const afterAuth = async (nextUser: User) => {
    setUser(nextUser);
    navigate("/");
    setAuthError("");
    try { setRuns(await api.runs()); } catch { /* history can load when opened */ }
    setNotice(`Signed in as ${nextUser.full_name}.`);
  };

  const handleDemoLogin = async () => {
    setAuthBusy(true); setAuthError("");
    try { await afterAuth(await api.demoLogin()); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Demo login failed."); }
    finally { setAuthBusy(false); }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthBusy(true); setAuthError("");
    try { await afterAuth(await api.login(email, password)); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Sign in failed."); }
    finally { setAuthBusy(false); }
  };

  const handleRegister = async (email: string, name: string, password: string, department: string) => {
    setAuthBusy(true); setAuthError("");
    try { await afterAuth(await api.register(email, name, password, department)); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Account creation failed."); }
    finally { setAuthBusy(false); }
  };

  const handleAnalyze = async (title: string, input: string, lens: string, repositoryFiles?: Record<string, string>, analysisType: "repository" | "circuit" | "truss" | "beam" | "idea" = "idea") => {
    if (!user) {
      setAuthError("Sign in to save this analysis.");
      navigate("/login");
      return;
    }
    setIdeaBusy(true); setIdeaError("");
    try {
      const nextRun = await api.analyze(title, input, lens, analysisType, repositoryFiles);
      setRun(nextRun); setMode(nextRun.mode); setSelectedPlanId("plan_b"); setLayer("overview");
      setIdeaOpen(false); setProgress([]); setNotice("Analysis saved to your runs.");
      setRuns(await api.runs());
    } catch (error) {
      setIdeaError(error instanceof Error ? error.message : "Analysis could not be created.");
    } finally { setIdeaBusy(false); }
  };

  const handleHistoryOpen = async () => {
    setHistoryOpen(true);
    if (!user) return;
    try { setRuns(await api.runs()); } catch (error) { setPageError(error instanceof Error ? error.message : "History is unavailable."); }
  };

  const handleLogout = async () => {
    try { await api.logout(); }
    catch (error) { setPageError(error instanceof Error ? error.message : "Could not end the session."); }
    setUser(null);
    setRuns([]);
    setNotice("You have signed out.");
  };

  const handleSelectRun = (selected: AnalysisRun) => {
    setRun(selected); setMode(selected.mode); setSelectedPlanId(selected.selected_plan_id || "plan_b");
    setLayer("overview"); setHistoryOpen(false); setProgress([]);
  };

  const handleSimulation = async () => {
    if (!run || !selectedPlan) return;
    if (!user) { setAuthError("Sign in to save a simulation log."); navigate("/login"); return; }
    setSimulationBusy(true); setProgress([]); setPageError("");
    simulationAbort.current?.abort();
    const controller = new AbortController(); simulationAbort.current = controller;
    try {
      const job = await api.simulate(run.id, selectedPlan.id);
      setLayer("logs");
      await streamExecution(job.execution_id,
        (event) => setProgress((items) => [...items.filter((item) => item.sequence !== event.sequence), event].sort((a, b) => a.sequence - b.sequence)),
        (result) => {
          setSimulationBusy(false);
          setNotice(result.status === "completed" ? "Simulation finished. Review the evidence limits before acting." : "Simulation ended; review the run log.");
        }, controller.signal,
      );
      setSimulationBusy(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setPageError(error instanceof Error ? error.message : "Simulation could not be started.");
        setSimulationBusy(false);
      }
    }
  };

  const jumpToStudio = () => {
    document.getElementById("studio")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  if (isAuthPage) return <AuthPage key={pathname} initialCreating={pathname === "/register"} onReturn={() => navigate("/")} onDemo={handleDemoLogin} onLogin={handleLogin} onRegister={handleRegister} busy={authBusy} error={authError} />;

  if (!run || !selectedPlan) return <main className="boot-screen"><div className="boot-mark">P</div><p>{pageError || "Preparing your first specimen…"}</p>{pageError && <button className="button button-outline" onClick={() => loadDemo(mode)}>Try again</button>}</main>;

  const faultLabel = mode === "cs_repo" ? (run.analysis_json.findings?.[0]?.package ?? run.title) : mode === "ece_circuit" ? (run.analysis_json.breadboard?.components?.[1]?.label ?? "breadboard circuit") : mode === "civil_mech" ? (run.analysis_json.metrics?.target_member ?? "truss member") : mode === "mechanical_beam" ? "Center point load" : run.title;
  const calloutNote = mode === "cs_repo" ? "manifest evidence; call sites not checked" : mode === "ece_circuit" ? (run.analysis_json.breadboard?.template ?? "starter layout") : mode === "civil_mech" ? "fixed 2D teaching geometry" : mode === "mechanical_beam" ? "static beam formula estimate" : "heuristic planning template";
  const modeActions: Record<Mode, string> = { cs_repo: "Review a repository", ece_circuit: "Draft a breadboard circuit", civil_mech: "Change the truss load", mechanical_beam: "Change beam inputs", custom_upskiller: "Upskill an idea" };

  return <SmoothScrollProvider>
    <div className={`app-shell ${dark ? "theme-dark" : "theme-light"}`} id="top">
      <TopWorkspaceBar mode={mode} onMode={handleMode} dark={dark} onTheme={() => setDark((value) => !value)} user={user} onAuth={() => { setAuthError(""); navigate("/login"); }} onLogout={handleLogout} onHistory={handleHistoryOpen} />
      <ScrollyHeroSection onJump={jumpToStudio} />

      <main className="workbench" id="studio">
        <div className="section-heading"><div><div className="eyebrow small-eyebrow"><span className="eyebrow-dot" /> PATCHPATH STUDIO <span> / {fallbackModeNames[mode].toUpperCase()}</span></div><h2>Inspect the system.</h2></div><div className="studio-meta"><span>{run.analysis_json.repository_scan ? "USER REPOSITORY METADATA" : "EXAMPLE / EDUCATIONAL MODEL"}</span><button onClick={() => setIdeaOpen(true)}><Sparkles size={14} /> {modeActions[mode]}</button></div></div>
        <ModeGuide run={run} />
        <div className="workspace-grid">
          <LeftInspectionRail active={layer} onSelect={setLayer} mode={mode} />
          <div className="viewport-column">
            <Deferred3DViewport run={run} plan={selectedPlan} layer={layer} dark={dark} />
            <SpatialCalloutOverlay faultLabel={faultLabel} note={calloutNote} />
            <LayerInspector run={run} plan={selectedPlan} layer={layer} busy={simulationBusy} progress={progress} onRun={handleSimulation} />
          </div>
          <RightTelemetryAtlasCard run={run} plan={selectedPlan} onRun={handleSimulation} busy={simulationBusy} onDiff={() => setDiffOpen(true)} />
        </div>
        <BottomPlanDeck plans={run.candidate_plans_json} selected={selectedPlan.id} onSelect={setSelectedPlanId} />

        {mode === "custom_upskiller" && run.upskilled_blueprint_json && <section className="blueprint-panel">
          <div className="blueprint-header"><div><div className="mini-label">GENERATED PROJECT BLUEPRINT</div><h2>Learn from the proposal</h2></div><span className="draft-badge"><Info size={13} /> HEURISTIC DRAFT</span></div>
          <p>{String(run.upskilled_blueprint_json.input_summary ?? "A deterministic starting point from your input.")}</p>
          <div className="blueprint-layers">{(run.upskilled_blueprint_json.lexicon_4_layer_spec as Array<{ layer: string; description: string }> | undefined)?.map((item) => <article key={item.layer}><span>{item.layer}</span><p>{item.description}</p></article>)}</div>
          <div className="blueprint-angles">{(run.upskilled_blueprint_json.three_winning_angles as string[] | undefined)?.map((angle, i) => <div key={angle}><span>0{i + 1}</span>{angle}</div>)}</div>
        </section>}

        <div className="trust-strip"><span><BadgeCheck size={16} /> EVIDENCE IS LABELED</span><p>These demos teach analysis. They do not run arbitrary code or certify a circuit, building, or structural design.</p><a href="https://github.com/advisories/GHSA-r5fr-rjxr-66jc" target="_blank" rel="noreferrer">Advisory source <ArrowDown size={13} /></a></div>
      </main>

      <footer className="site-footer"><a href="#top" className="brand-lockup"><span className="brand-mark"><span /><span /><span /></span><span>PATCHPATH<small>UNIVERSAL</small></span></a><span>LEARN THE SYSTEM. QUESTION THE OUTPUT.</span><span>LOCAL BUILD · V0.1</span></footer>

      {pageError && <div className="toast toast-error" role="alert"><CircleAlert size={16} />{pageError}<button onClick={() => setPageError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
      {notice && <div className="toast toast-success" role="status"><CircleCheck size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15} /></button></div>}
      {!user && <button className="login-nudge" onClick={() => navigate("/login")}><LockKeyhole size={14} /> Sign in to save runs</button>}
      {ideaOpen && <IdeaAndRepoUpskillerModal mode={mode} onClose={() => setIdeaOpen(false)} onSubmit={handleAnalyze} busy={ideaBusy} error={ideaError} />}
      {historyOpen && <HistoryDrawer onClose={() => setHistoryOpen(false)} runs={runs} user={user} onSelect={handleSelectRun} />}
      {diffOpen && <PatchDiffModal run={run} plan={selectedPlan} onClose={() => setDiffOpen(false)} />}
    </div>
  </SmoothScrollProvider>;
}

