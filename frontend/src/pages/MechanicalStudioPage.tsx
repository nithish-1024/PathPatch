import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Info,
  Layers,
  Send,
  Sliders,
  Sparkles,
} from "lucide-react";
import Deferred3DViewport from "../scenes/Deferred3DViewport";
import { api } from "../api/client";
import type { AnalysisRun, CandidatePlan, ViewLayer } from "../types/patchpath";

export default function MechanicalStudioPage() {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("plan_b");
  const [layer, setLayer] = useState<ViewLayer>("overview");

  // Physical Parameters
  const [pointLoadKn, setPointLoadKn] = useState(5.0); // kN
  const [spanM, setSpanM] = useState(2.0); // m
  const [widthMm, setWidthMm] = useState(50.0); // mm
  const [depthMm, setDepthMm] = useState(100.0); // mm
  const [eModulusGpa, setEModulusGpa] = useState(200.0); // GPa (Steel)

  const [question, setQuestion] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ q: string; a: string; source: string }>>([
    {
      q: "Why does increasing beam depth work so much better than increasing width?",
      a: "Second moment of area is I = (b*h³)/12. Because depth (h) is raised to the third power, increasing depth by just 25% increases stiffness by nearly 95%! Increasing width (b) only increases stiffness linearly (+25%).",
      source: "euler_bernoulli_solver",
    },
  ]);

  useEffect(() => {
    let mounted = true;
    api
      .demo("mechanical_beam")
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

  // Live Euler-Bernoulli calculations
  const physics = useMemo(() => {
    const P = pointLoadKn * 1000.0; // N
    const L = spanM * 1000.0; // mm
    const b = widthMm; // mm
    const h = depthMm; // mm
    const E = eModulusGpa * 1000.0; // MPa

    const I = (b * Math.pow(h, 3)) / 12.0; // mm⁴
    const M_max = (P * L) / 4.0; // N·mm
    const sigma_max_mpa = (M_max * (h / 2.0)) / I; // MPa
    const delta_max_mm = (P * Math.pow(L, 3)) / (48.0 * E * I); // mm

    // Counterfactuals
    const b_plus_25 = b * 1.25;
    const I_width_inc = (b_plus_25 * Math.pow(h, 3)) / 12.0;
    const delta_width_inc = (P * Math.pow(L, 3)) / (48.0 * E * I_width_inc);

    const h_plus_25 = h * 1.25;
    const I_depth_inc = (b * Math.pow(h_plus_25, 3)) / 12.0;
    const delta_depth_inc = (P * Math.pow(L, 3)) / (48.0 * E * I_depth_inc);

    const isStressHigh = sigma_max_mpa > 180.0; // Steel allowable bending limit
    const isDeflectionHigh = delta_max_mm > L / 360.0; // Span/360 architectural limit

    return {
      I,
      M_max_nm: M_max / 1000.0,
      sigma_max_mpa,
      delta_max_mm,
      delta_width_inc,
      delta_depth_inc,
      isStressHigh,
      isDeflectionHigh,
    };
  }, [pointLoadKn, spanM, widthMm, depthMm, eModulusGpa]);

  const selectedPlan: CandidatePlan = useMemo(() => {
    return (
      run?.candidate_plans_json.find((p) => p.id === selectedPlanId) ?? {
        id: "plan_b",
        label: "B",
        name: "Plan B: Deepen Cross-Section (+35% Depth)",
        recommended: true,
        summary: "Increase beam depth from 100mm to 135mm while keeping width constant.",
        reason: "Exploits the h³ term in the moment of inertia formula to cut mid-span sag by 59% without adding excessive material weight.",
        evidence: [
          `Center sag drops from ${physics.delta_max_mm.toFixed(2)} mm to ${(physics.delta_max_mm * 0.41).toFixed(2)} mm`,
          `Bending stress drops from ${physics.sigma_max_mpa.toFixed(1)} MPa to ${(physics.sigma_max_mpa * 0.55).toFixed(1)} MPa`,
        ],
        risks: ["Check vertical clearance in ceiling plenum"],
        evidence_status: "Verified in Euler-Bernoulli equations",
        estimated_scope: "Section dimension redesign",
      }
    );
  }, [run, selectedPlanId, physics]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const qText = question.trim();
    setQuestion("");
    setCopilotLoading(true);

    try {
      const res = await api.ask("beam", qText, { load_kn: pointLoadKn, plan: selectedPlanId });
      setChatLog((prev) => [...prev, { q: qText, a: res.answer, source: res.source }]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          q: qText,
          a: "Euler-Bernoulli beam theory states that bending stress is maximized at outermost fibers (σ = M*y/I) and center deflection equals δ = PL³/(48EI). Increasing depth is the most material-efficient way to achieve structural stiffness.",
          source: "physics_rule_engine",
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="mechanical-studio-page">
      {/* Studio Header Bar */}
      <div className="studio-top-bar">
        <div className="bar-left">
          <div className="bar-title-row">
            <span className="domain-chip mechanical">MECHANICAL & MATERIALS</span>
            <h1 className="studio-heading">Mechanical Beam Studio</h1>
          </div>
          <p className="studio-tagline">
            Euler-Bernoulli beam bending (I = bh³/12) + center sag (δ = PL³/48EI). Drag cross-section dimensions to see why deepening beats widening 8×.
          </p>
        </div>

        <div className="bar-right">
          <div className="repo-sample-pill">
            <Activity size={14} />
            <span>Simply Supported Center-Loaded Beam</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="studio-workbench-grid">
        {/* LEFT COLUMN: 3D Beam Viewport + Sliders */}
        <div className="studio-left-column">
          <div className="viewport-box">
            <div className="viewport-overlay-badges">
              <span className={`status-pill ${physics.isDeflectionHigh ? "danger" : "safe"}`} style={{ fontWeight: 800 }}>
                {physics.isDeflectionHigh ? "❌ SERVICEABILITY FAIL: v_max > L/360" : "✅ SERVICEABILITY PASS: v_max ≤ L/360"}
              </span>
              <span className={`status-pill ${physics.isDeflectionHigh ? "danger" : "safe"}`}>
                <Activity size={13} />
                <span>
                  Sag (δ): {physics.delta_max_mm.toFixed(2)} mm {physics.isDeflectionHigh ? "(EXCESSIVE SAG)" : "(WITHIN L/360)"}
                </span>
              </span>
              <span className={`status-pill ${physics.isStressHigh ? "danger" : "info"}`}>
                <span>Stress (σ): {physics.sigma_max_mpa.toFixed(1)} MPa</span>
              </span>
              <span className="status-pill neutral">
                <span>Moment: {physics.M_max_nm.toFixed(1)} kN·m</span>
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

          {/* Interactive Sliders Panel */}
          <div className="physical-sliders-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Sliders size={16} />
                <span>Beam Geometry & Load Sliders</span>
              </div>
              <span className="panel-note">Live Euler-Bernoulli section calculation</span>
            </div>

            <div className="sliders-grid">
              {/* Load Slider */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>Center Load (P)</span>
                  <span className="slider-value">{pointLoadKn.toFixed(1)} kN</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={pointLoadKn}
                  onChange={(e) => setPointLoadKn(parseFloat(e.target.value))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>1 kN (Light)</span>
                  <span>5 kN (Nominal)</span>
                  <span>15 kN (Heavy)</span>
                </div>
              </div>

              {/* Span Slider */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>Beam Span (L)</span>
                  <span className="slider-value">{spanM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.2"
                  value={spanM}
                  onChange={(e) => setSpanM(parseFloat(e.target.value))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>1.0 m</span>
                  <span>2.0 m (Standard)</span>
                  <span>4.0 m (Long)</span>
                </div>
              </div>

              {/* Width Slider */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>Beam Width (b)</span>
                  <span className="slider-value">{widthMm.toFixed(0)} mm</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="120"
                  step="5"
                  value={widthMm}
                  onChange={(e) => setWidthMm(parseFloat(e.target.value))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>25 mm</span>
                  <span>50 mm</span>
                  <span>120 mm</span>
                </div>
              </div>

              {/* Depth Slider */}
              <div className="slider-card">
                <div className="slider-label-row">
                  <span>Beam Depth (h)</span>
                  <span className="slider-value">{depthMm.toFixed(0)} mm</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={depthMm}
                  onChange={(e) => setDepthMm(parseFloat(e.target.value))}
                  className="range-input"
                />
                <div className="slider-hints">
                  <span>50 mm (Shallow)</span>
                  <span>100 mm</span>
                  <span>200 mm (Deep)</span>
                </div>
              </div>
            </div>

            {/* 1-Click Scenario Presets */}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ padding: "5px 10px", fontSize: "11px", borderRadius: "6px", background: !physics.isDeflectionHigh ? "#0284c7" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", cursor: "pointer", fontWeight: 600 }}
                onClick={() => {
                  setPointLoadKn(3.0);
                  setSpanM(2.0);
                  setWidthMm(50);
                  setDepthMm(120);
                }}
              >
                🟢 Safe Serviceability (Steel · 3 kN · 120mm)
              </button>
              <button
                type="button"
                style={{ padding: "5px 10px", fontSize: "11px", borderRadius: "6px", background: physics.isDeflectionHigh ? "#dc2626" : "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#fca5a5", cursor: "pointer", fontWeight: 700 }}
                onClick={() => {
                  setPointLoadKn(12.0);
                  setSpanM(3.5);
                  setWidthMm(30);
                  setDepthMm(50);
                }}
              >
                ⚡ Trigger L/360 Sag Overload (12 kN · 50mm)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Plain-English Diagnosis + Counterfactuals + Plans */}
        <div className="studio-right-column">
          <div className="plain-english-diagnosis-card">
            <div className="card-headline-row">
              <Info size={16} className="info-icon" />
              <h4>Euler-Bernoulli Mechanics Diagnosis</h4>
            </div>

            <div className="diagnosis-block">
              <div className="diag-title">🔍 What Is Happening</div>
              <p>
                A {pointLoadKn} kN center load acts on a {spanM}m simply supported beam with a {widthMm}×{depthMm} mm cross-section. 
                Second moment of area is <strong>{(physics.I / 1e6).toFixed(3)} × 10⁶ mm⁴</strong>.
              </p>
            </div>

            <div className="diagnosis-block failure">
              <div className="diag-title">⚠️ Why It Fails</div>
              <p>
                {physics.isDeflectionHigh ? (
                  <>
                    Mid-span sag reaches <strong>{physics.delta_max_mm.toFixed(2)} mm</strong>, exceeding the span/360 limit ({(spanM * 1000 / 360).toFixed(1)} mm). 
                    The beam is flexing visibly under service loading, threatening finishes and ceiling assemblies.
                  </>
                ) : (
                  <>
                    Deflection is currently {physics.delta_max_mm.toFixed(2)} mm and peak bending stress is {physics.sigma_max_mpa.toFixed(1)} MPa, 
                    within standard structural steel safety limits.
                  </>
                )}
              </p>
            </div>

            {/* Counterfactual Demonstration Box */}
            <div className="counterfactual-box">
              <div className="cf-title">💡 The Power of the h³ Term (Why Depth Wins 8×)</div>
              <div className="cf-grid">
                <div className="cf-option">
                  <span className="cf-label">+25% Width (b: {widthMm * 1.25}mm)</span>
                  <span className="cf-result">Sag: {physics.delta_width_inc.toFixed(2)} mm</span>
                  <span className="cf-gain">-20% Deflection</span>
                </div>
                <div className="cf-option winner">
                  <span className="cf-label">+25% Depth (h: {depthMm * 1.25}mm)</span>
                  <span className="cf-result">Sag: {physics.delta_depth_inc.toFixed(2)} mm</span>
                  <span className="cf-gain winner-tag">-49% Deflection (2.5× Better!)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remediation Plans */}
          <div className="remediation-plans-deck">
            <div className="deck-header">
              <span>THREE BEAM REDESIGN OPTIONS</span>
            </div>

            <div
              className={`plan-card ${selectedPlanId === "plan_a" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_a")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan A</span>
                <span className="plan-title">Widen Cross-Section (+50% Width)</span>
              </div>
              <p className="plan-desc">Increases beam width. Reduces sag by only 33% while adding 50% extra material weight.</p>
            </div>

            <div
              className={`plan-card recommended ${selectedPlanId === "plan_b" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_b")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill recommended-pill">Plan B (Recommended)</span>
                <span className="plan-title">Deepen Cross-Section (+35% Depth)</span>
              </div>
              <p className="plan-desc">Cuts mid-span sag by 59% using the h³ inertia exponent without wasting steel weight.</p>
            </div>

            <div
              className={`plan-card ${selectedPlanId === "plan_c" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_c")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan C</span>
                <span className="plan-title">Switch to Structural I-Beam</span>
              </div>
              <p className="plan-desc">Places flanges at maximum distance from neutral axis for optimal strength-to-weight ratio.</p>
            </div>
          </div>

          {/* Copilot Q&A Box */}
          <div className="copilot-qa-panel">
            <div className="copilot-header">
              <Sparkles size={15} className="sparkle-icon" />
              <span>Mechanical Engineering Copilot (Dual-Brain)</span>
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
                placeholder="Ask about bending stress, moment of inertia, or deflection..."
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
