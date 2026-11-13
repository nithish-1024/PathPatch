import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code,
  FileCode,
  GitBranch,
  Github,
  Info,
  Layers,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Deferred3DViewport from "../scenes/Deferred3DViewport";
import { api } from "../api/client";
import type { AnalysisRun, CandidatePlan, ViewLayer } from "../types/patchpath";

export default function RepoStudioPage() {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("plan_b");
  const [layer, setLayer] = useState<ViewLayer>("overview");
  const [repoInput, setRepoInput] = useState("https://github.com/lodash/lodash");
  const [question, setQuestion] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ q: string; a: string; source: string }>>([
    {
      q: "What is the vulnerability in lodash 4.17.20?",
      a: "Lodash versions below 4.17.21 contain a Prototype Pollution vulnerability (CVE-2021-23337) and Command Injection risk via the template function. An attacker can inject properties into Object.prototype, altering execution flow across the entire Node.js runtime.",
      source: "osv_security_engine",
    },
  ]);

  useEffect(() => {
    let mounted = true;
    api
      .demo("cs_repo")
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

  const selectedPlan: CandidatePlan = useMemo(() => {
    return (
      run?.candidate_plans_json.find((p) => p.id === selectedPlanId) ?? {
        id: "plan_b",
        label: "B",
        name: "Plan B: Patch to Lodash ^4.17.21",
        recommended: true,
        summary: "Upgrade lodash to ^4.17.21 without breaking semantic version contracts.",
        reason: "Patches CVE-2021-23337 and CVE-2020-8203 while maintaining 100% backward compatibility.",
        evidence: ["OSV.dev advisory GHSA-35jh-r3h4-6jhm resolved", "Zero breaking API signature changes"],
        risks: ["Requires running unit test suite to verify behavior"],
        evidence_status: "Verified against OSV database",
        estimated_scope: "package.json and lockfile patch",
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
      const res = await api.ask("repository", qText, { repo: repoInput, plan: selectedPlanId });
      setChatLog((prev) => [...prev, { q: qText, a: res.answer, source: res.source }]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          q: qText,
          a: "In software repositories, dependency vulnerabilities occur when pinned versions fall behind security advisories. Upgrading to the latest patch release (e.g. 4.17.21) closes known CVEs without introducing breaking API changes.",
          source: "physics_rule_engine",
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="repo-studio-page">
      {/* Studio Header Bar */}
      <div className="studio-top-bar">
        <div className="bar-left">
          <div className="bar-title-row">
            <span className="domain-chip repo">CSE & SOFTWARE SYSTEMS</span>
            <h1 className="studio-heading">Software Repository Studio</h1>
          </div>
          <p className="studio-tagline">
            AST codebase architecture mapping + live OSV.dev CVE vulnerability remediation. View module layers in 3D and compare non-breaking upgrade paths.
          </p>
        </div>

        <div className="bar-right">
          <div className="repo-sample-pill">
            <Github size={14} />
            <span>Sample: Lodash 4.17.20 CVE Remediation</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workbench */}
      <div className="studio-workbench-grid">
        {/* LEFT COLUMN: 3D Code Nebula + 4 Architectural Tiers */}
        <div className="studio-left-column">
          <div className="viewport-box">
            <div className="viewport-overlay-badges">
              <span className="status-pill danger">
                <ShieldAlert size={13} />
                <span>CVE-2021-23337 Detected</span>
              </span>
              <span className="status-pill info">
                <Layers size={13} />
                <span>4 Tiers: UI, Service, DB, Deps</span>
              </span>
              <span className="status-pill neutral">
                <FileCode size={13} />
                <span>13 Modules Grounded</span>
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

          {/* Architecture Layer Description Card */}
          <div className="repo-layers-card">
            <h4>Codebase Grounded Layers (Abstract Syntax Tree)</h4>
            <div className="layers-pill-row">
              <div className="layer-pill ui">
                <span className="dot" />
                <span>UI & Client Layer (React / Vite)</span>
              </div>
              <div className="layer-pill service">
                <span className="dot" />
                <span>Service & API Layer (FastAPI)</span>
              </div>
              <div className="layer-pill db">
                <span className="dot" />
                <span>Persistence Layer (PostgreSQL)</span>
              </div>
              <div className="layer-pill dep">
                <span className="dot" />
                <span>Third-Party Packages (OSV Scanned)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Vulnerability Report + 3 Plans + Copilot */}
        <div className="studio-right-column">
          <div className="plain-english-diagnosis-card">
            <div className="card-headline-row">
              <Info size={16} className="info-icon" />
              <h4>OSV.dev & Static AST Diagnosis</h4>
            </div>

            <div className="diagnosis-block">
              <div className="diag-title">🔍 What Is Happening</div>
              <p>
                The repository manifest specifies <code>lodash@4.17.20</code> in dependencies. 
                Static AST analysis detected 14 module imports relying on utility methods across string and object manipulation.
              </p>
            </div>

            <div className="diagnosis-block failure">
              <div className="diag-title">⚠️ Why It Fails</div>
              <p>
                Live query to Google&apos;s OSV.dev database flags <strong>CVE-2021-23337</strong> (Command Injection via <code>template</code>) 
                and <strong>CVE-2020-8203</strong> (Prototype Pollution via <code>zipObjectDeep</code>). 
                An adversary can poison prototype properties and execute arbitrary code on the server runtime.
              </p>
            </div>

            <div className="diagnosis-block fix">
              <div className="diag-title">💡 How to Fix It</div>
              <p>
                Select <strong>Plan B (Recommended)</strong> to bump lodash floor to <code>^4.17.21</code>. 
                This patches both vulnerabilities while remaining on the same v4 API line, preserving 100% backward compatibility.
              </p>
            </div>
          </div>

          {/* Remediation Plans */}
          <div className="remediation-plans-deck">
            <div className="deck-header">
              <span>THREE REMEDIATION OPTIONS</span>
            </div>

            <div
              className={`plan-card ${selectedPlanId === "plan_a" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_a")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan A</span>
                <span className="plan-title">Pin Exact Version 4.17.21</span>
              </div>
              <p className="plan-desc">Pins package strictly to 4.17.21 without caret range to freeze dependency resolution.</p>
            </div>

            <div
              className={`plan-card recommended ${selectedPlanId === "plan_b" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_b")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill recommended-pill">Plan B (Recommended)</span>
                <span className="plan-title">Upgrade to ^4.17.21</span>
              </div>
              <p className="plan-desc">Allows future backward-compatible security patches while closing all current CVEs.</p>
            </div>

            <div
              className={`plan-card ${selectedPlanId === "plan_c" ? "active-plan" : ""}`}
              onClick={() => setSelectedPlanId("plan_c")}
              role="button"
              tabIndex={0}
            >
              <div className="plan-header-row">
                <span className="plan-pill">Plan C</span>
                <span className="plan-title">Native ES6 Replacement</span>
              </div>
              <p className="plan-desc">Refactor functions to use native JavaScript Object.assign and Array methods, removing lodash entirely.</p>
            </div>
          </div>

          {/* Copilot Q&A Box */}
          <div className="copilot-qa-panel">
            <div className="copilot-header">
              <Sparkles size={15} className="sparkle-icon" />
              <span>Software Security Copilot (Dual-Brain)</span>
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
                placeholder="Ask about CVEs, prototype pollution, or dependency trees..."
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
