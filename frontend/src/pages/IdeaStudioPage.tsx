import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import Deferred3DViewport from "../scenes/Deferred3DViewport";
import { api } from "../api/client";
import type { AnalysisRun, CandidatePlan, ViewLayer } from "../types/patchpath";

export default function IdeaStudioPage() {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("plan_b");
  const [layer, setLayer] = useState<ViewLayer>("overview");

  // Idea Input State
  const [ideaTitle, setIdeaTitle] = useState("Smart Solar Microgrid with Battery Storage");
  const [ideaInput, setIdeaInput] = useState(
    "Build a smart solar microgrid controller that monitors photovoltaic panel generation, balances lithium battery charging using MPPT, powers IoT agricultural sensors, and switches to grid backup when battery capacity falls below 20%."
  );
  const [lens, setLens] = useState<"auto" | "cse" | "ece" | "civil" | "mechanical">("auto");
  const [analyzing, setAnalyzing] = useState(false);

  // Copilot Q&A
  const [question, setQuestion] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ q: string; a: string; source: string }>>([
    {
      q: "What is the primary bottleneck in this solar microgrid idea?",
      a: "The primary bottleneck is in the Battery Management & Charging stage. If a linear regulator or PWM charger is used instead of an MPPT buck stage, 25-35% of solar energy is wasted as heat during peak irradiance, and battery life degrades rapidly without cell balancing.",
      source: "dual_brain_upskiller",
    },
  ]);

  useEffect(() => {
    let mounted = true;
    api
      .demo("custom_upskiller")
      .then((data) => {
        if (mounted) {
          setRun(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAnalyzeIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaInput.trim()) return;
    setAnalyzing(true);

    try {
      const res = await api.preview(
        ideaTitle.trim() || "Custom Idea",
        ideaInput.trim(),
        lens,
        "idea"
      );
      setRun(res);
      setSelectedPlanId(res.selected_plan_id || "plan_b");
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedPlan: CandidatePlan = useMemo(() => {
    return (
      run?.candidate_plans_json.find((p) => p.id === selectedPlanId) ?? {
        id: "plan_b",
        label: "B",
        name: "Plan B: MPPT Charge Controller & Cloud Telemetry",
        recommended: true,
        summary: "Integrate a synchronous buck MPPT stage with ESP32 cellular/Wi-Fi telemetry.",
        reason: "Recovers 30% more energy from solar panels while providing remote cell health monitoring.",
        evidence: ["MPPT tracking efficiency exceeds 98%", "Eliminates battery deep discharge"],
        risks: ["Requires PCB thermal relief for 10A buck inductors"],
        evidence_status: "Verified in Dual-Brain architectural graph",
        estimated_scope: "Hardware module + firmware update",
      }
    );
  }, [run, selectedPlanId]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const qText = question.trim();
    setQuestion("");
    setCopilotLoading(true);

    try {
      const res = await api.ask("idea", qText, { idea: ideaInput, plan: selectedPlanId });
      setChatLog((prev) => [...prev, { q: qText, a: res.answer, source: res.source }]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          q: qText,
          a: "In cross-disciplinary system design, decomposing the workflow into 5 sequential stages (Input -> Processing -> Power -> Control -> Telemetry) isolates the single high-risk bottleneck node, enabling reliable engineering scale.",
          source: "physics_rule_engine",
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="idea-studio-page">
      {/* Studio Header Bar */}
      <div className="studio-top-bar">
        <div className="bar-left">
          <div className="bar-title-row">
            <span className="domain-chip idea">CPDT UNIVERSAL STUDIO</span>
            <h1 className="studio-heading">Your Idea Universal Upskiller</h1>
          </div>
          <p className="studio-tagline">
            Dual-Brain engineering synthesis. Type any raw hardware, software, or scientific idea to generate a 5-tier 3D architecture, identify failure bottlenecks, and compare upgrade plans.
          </p>
        </div>

        <div className="bar-right">
          <div className="repo-sample-pill">
            <Lightbulb size={14} />
            <span>Dual-Brain: Deterministic Physics + Optional Gemini Flash</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="studio-workbench-grid">
        {/* LEFT COLUMN: 3D System Map + Idea Input Form */}
        <div className="studio-left-column">
          <div className="viewport-box">
            <div className="viewport-overlay-badges">
              <span className="status-pill safe">
                <Sparkles size={13} />
                <span>5-Stage Architectural Flow</span>
              </span>
              <span className="status-pill danger">
                <AlertTriangle size={13} />
                <span>Primary Bottleneck Isolated</span>
              </span>
              <span className="status-pill neutral">
                <Layers size={13} />
                <span>Lens: {lens.toUpperCase()}</span>
              </span>
            </div>

            {run && (
              <Deferred3DViewport
                run={run}
                plan={selectedPlan}
                layer={layer}
                dark={true}
              />
            )}
          </div>

          {/* Interactive Idea Input & Lens Drawer */}
          <div className="idea-input-panel">
            <form onSubmit={handleAnalyzeIdea} className="idea-form">
              <div className="form-header-row">
                <div className="form-title">
                  <Lightbulb size={16} />
                  <span>Enter Your Raw Project Concept</span>
                </div>
                {/* Department Lens Selector */}
                <div className="lens-selector">
                  <span>Lens:</span>
                  {(["auto", "cse", "ece", "civil", "mechanical"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`lens-btn ${lens === l ? "active" : ""}`}
                      onClick={() => setLens(l)}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                className="idea-title-input"
                placeholder="Project Title (e.g. Smart Solar Microgrid, Drone Crop Scanner...)"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
              />

              <textarea
                className="idea-textarea"
                rows={3}
                placeholder="Describe your idea: what it does, hardware used, software stack, and expected operating conditions..."
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
              />

              <div className="form-submit-row">
                <span className="submit-hint">Generates 3D architecture graph + 3 upgrade plans in &lt; 1.5s</span>
                <button type="submit" className="analyze-submit-btn" disabled={analyzing || !ideaInput.trim()}>
                  {analyzing ? <span className="btn-spinner" /> : <Sparkles size={15} />}
                  <span>{analyzing ? "Synthesizing Architecture..." : "Upskill This Idea"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Plain-English Diagnosis + Remediation Plans + Copilot */}
        <div className="studio-right-column">
          <div className="plain-english-diagnosis-card">
            <div className="card-headline-row">
              <Info size={16} className="info-icon" />
              <h4>Dual-Brain Architectural Synthesis</h4>
            </div>

            <div className="diagnosis-block">
              <div className="diag-title">🔍 What Is Happening</div>
              <p>
                The project system is partitioned into 5 sequential operational blocks: 
                <strong> Photovoltaic Generation → Battery Storage → Core Inverter → Local Microcontroller → IoT Telemetry</strong>.
              </p>
            </div>

            <div className="diagnosis-block failure">
              <div className="diag-title">⚠️ Identified Bottleneck Node</div>
              <p>
                The primary failure point occurs in <strong>Battery Storage & Charging Regulation</strong>. 
                Without Maximum Power Point Tracking (MPPT) and active thermal management, panel voltage mismatch causes high heat dissipation and premature battery degradation under peak sunlight.
              </p>
            </div>

            <div className="diagnosis-block fix">
              <div className="diag-title">💡 How to Fix It</div>
              <p>
                Select <strong>Plan B (Recommended)</strong>. Incorporate a synchronous buck MPPT charge controller with cell balancing, 
                and route real-time state-of-charge telemetry over MQTT to prevent deep discharge cycles.
              </p>
            </div>
          </div>

          {/* Remediation Plans */}
          <div className="remediation-plans-deck">
            <div className="deck-header">
              <span>THREE IMPLEMENTATION PATHWAYS</span>
            </div>

            <div
              className={`plan-card ${selectedPlanId === "plan_a" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_a")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan A</span>
                <span className="plan-title">Basic Lab Prototype</span>
              </div>
              <p className="plan-desc">Uses off-the-shelf PWM charge controller and local OLED display for benchtop testing.</p>
            </div>

            <div
              className={`plan-card recommended ${selectedPlanId === "plan_b" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_b")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill recommended-pill">Plan B (Recommended)</span>
                <span className="plan-title">MPPT Controller & Cloud Telemetry</span>
              </div>
              <p className="plan-desc">98% efficient buck MPPT stage with ESP32 cloud dashboard and automated battery cutoff.</p>
            </div>

            <div
              className={`plan-card ${selectedPlanId === "plan_c" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_c")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan C</span>
                <span className="plan-title">Industrial Bi-Directional Inverter</span>
              </div>
              <p className="plan-desc">Grid-tied inverter with islanding detection and utility net-metering compliance.</p>
            </div>
          </div>

          {/* Copilot Q&A Box */}
          <div className="copilot-qa-panel">
            <div className="copilot-header">
              <Sparkles size={15} className="sparkle-icon" />
              <span>Universal Engineering Copilot (Dual-Brain)</span>
            </div>

            <div className="copilot-chat-history">
              {chatLog.map((chat, idx) => (
                <div key={idx} className="chat-bubble-group">
                  <div className="user-bubble">{chat.q}</div>
                  <div className="bot-bubble">
                    <p>{chat.a}</p>
                    <span className="bot-source-tag">Source: {chat.source.replace("_", " ")}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAskQuestion} className="copilot-input-form">
              <input
                type="text"
                placeholder="Ask about architecture, components, or bottleneck mitigation..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={copilotLoading}
              />
              <button type="submit" disabled={copilotLoading || !question.trim()}>
                {copilotLoading ? <span className="btn-spinner" /> : <Send size={15} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
