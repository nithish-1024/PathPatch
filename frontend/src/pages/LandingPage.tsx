import { Activity, ArrowRight, CheckCircle2, ChevronRight, Cpu, Flame, HardHat, Layers, ShieldCheck, Sparkles, Zap } from "lucide-react";

interface LandingPageProps {
  navigate: (path: string) => void;
}

export default function LandingPage({ navigate }: LandingPageProps) {
  const domains = [
    {
      id: "repo",
      path: "/repo",
      number: "01",
      title: "Software Repository",
      subtitle: "Code AST Mapping & Live CVE Remediation",
      badge: "CSE & Software Systems",
      badgeColor: "blue",
      description:
        "Parses codebases into an Abstract Syntax Tree (AST), maps module architecture across 4 visual tiers, and queries live OSV.dev databases to resolve critical vulnerabilities without breaking project dependencies.",
      features: [
        "Live OSV.dev batch vulnerability scanner (CVEs)",
        "4-tier 3D architecture: UI, Service, DB, Dependency",
        "3 automated remediation plans with Before/After code diffs",
        "Circular dependency & God-module static detection",
      ],
      cta: "Launch Repo Studio",
    },
    {
      id: "ece",
      path: "/ece",
      number: "02",
      title: "ECE Circuit & PCB Studio",
      subtitle: "Interactive Hardware Catalog, Thermal Runaway & Multisim",
      badge: "ECE Core & Hardware (Highest Priority)",
      badgeColor: "amber",
      highlight: true,
      description:
        "A full interactive EDA studio inspired by Tinkercad, KiCad, and NI Multisim. Pick components, wire circuits on a Soldered FR-4 PCB or Breadboard, and watch real-time Modified Nodal Analysis and thermal dissipation unfold.",
      features: [
        "14+ VNRVJIET Syllabus Components (7805, Buck, BJT, 555, Op-Amp, ESP32)",
        "Transformer (350g) vs. Capacitive Dropper (8g) AC-to-DC trade-off analysis",
        "Linear regulator thermal runaway ($T_J > 118°C$) vs. 94% Buck converter",
        "IPC-2221 PCB copper trace heating & width verification",
        "Soldered FR-4 PCB View (gilded traces & silkscreen) vs. Breadboard View",
      ],
      cta: "Open ECE & PCB Studio",
    },
    {
      id: "civil",
      path: "/civil",
      number: "03",
      title: "Civil Bridge Truss",
      subtitle: "2D Direct Stiffness & Euler Critical Buckling",
      badge: "Civil & Structural Engineering",
      badgeColor: "emerald",
      description:
        "Calculates internal axial forces across a 5-panel Warren bridge truss using the Direct Stiffness Method ([K]{u} = {F}). Visualizes tension vs. compression and flags Euler buckling risk on compression diagonals under live deck loads.",
      features: [
        "22×22 NumPy Global Stiffness Matrix solver",
        "Euler critical buckling check ($P_{cr} = \\pi^2EI/L^2$)",
        "Real-time bridge deck load slider (10 kN to 300 kN)",
        "Plan B Hollow Structural Section (HSS 100×100×6) retrofit",
      ],
      cta: "Launch Truss Studio",
    },
    {
      id: "mechanical",
      path: "/mechanical",
      number: "04",
      title: "Mechanical Beam",
      subtitle: "Euler-Bernoulli Bending & Section Optimization",
      badge: "Mechanical & Materials Engineering",
      badgeColor: "purple",
      description:
        "Simulates elastic bending stress and mid-span deflection on simply supported beams. Features interactive cross-section sliders proving why increasing beam depth is 8x more effective at resisting deflection than increasing beam width.",
      features: [
        "Closed-form Euler-Bernoulli equations ($I = bh^3/12$, $\\delta = PL^3/48EI$)",
        "Real-time 3D beam deflection curve with live load arrow",
        "Counterfactual comparison: +25% Width vs. +25% Depth",
        "Steel vs. Aluminum material properties & yield stress limits",
      ],
      cta: "Launch Beam Studio",
    },
    {
      id: "idea",
      path: "/idea",
      number: "05",
      title: "Your Idea",
      subtitle: "Dual-Brain Universal System Upskiller",
      badge: "Interdisciplinary CPDT Studio",
      badgeColor: "teal",
      description:
        "Accepts any raw hardware, software, civil, or scientific project idea. Synthesizes a structured 5-stage architecture graph, detects the primary bottleneck node, and generates three concrete implementation plans.",
      features: [
        "Dual-Brain: 100% built-in deterministic physics + optional Gemini Flash AI",
        "Auto-detection across CSE, ECE, Civil, and Mechanical lenses",
        "Primary failure bottleneck isolation & mitigation strategies",
        "Instant Q&A copilot grounded in first-principles engineering",
      ],
      cta: "Enhance Your Idea",
    },
  ];

  return (
    <div className="landing-page-wrap">
      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-content">
          <div className="hero-pill-badge">
            <Sparkles size={13} className="sparkle-icon" />
            <span>VNRVJIET · Centre for Presencing and Design Thinking (CPDT)</span>
          </div>

          <h1 className="hero-main-title">
            Make the failure visible <br />
            <span className="hero-title-highlight">before the system breaks.</span>
          </h1>

          <p className="hero-description">
            A production-hardened engineering workbench for students, educators, and design juries. 
            Trace electrical thermal runaway, verify bridge buckling, calculate beam moments, 
            patch code vulnerabilities, and upskill raw ideas into verified 3D systems.
          </p>

          <div className="hero-cta-row">
            <button
              type="button"
              className="primary-hero-btn"
              onClick={() => navigate("/ece")}
            >
              <span>Explore ECE Circuit & PCB Studio</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="secondary-hero-btn"
              onClick={() => {
                const el = document.getElementById("domain-showcase");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>View All 5 Engineering Studios</span>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hero-metrics-bar">
            <div className="metric-box">
              <span className="metric-num">5</span>
              <span className="metric-label">Engineering Domains</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <span className="metric-num">100%</span>
              <span className="metric-label">Built-in Deterministic Physics</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <span className="metric-num">&lt; 50ms</span>
              <span className="metric-label">Zero-Crash Hybrid AI Fallback</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <span className="metric-num">60 FPS</span>
              <span className="metric-label">Interactive WebGL 3D</span>
            </div>
          </div>
        </div>
      </section>

      {/* Domain Cards Showcase */}
      <section id="domain-showcase" className="landing-domains-section">
        <div className="section-header">
          <div className="section-pretitle">FIVE SPECIALIZED LABS</div>
          <h2 className="section-title">Select an Engineering Studio</h2>
          <p className="section-subtitle">
            Every studio features interactive 3D WebGL visualization, physical parameter sliders, 
            plain-English diagnostic explanations, and verified remediation plans.
          </p>
        </div>

        <div className="domain-grid">
          {domains.map((d) => (
            <div
              key={d.id}
              className={`domain-card ${d.highlight ? "highlighted-card" : ""}`}
              onClick={() => navigate(d.path)}
              role="button"
              tabIndex={0}
            >
              <div className="card-top-row">
                <span className="domain-number">{d.number}</span>
                <span className={`domain-badge ${d.badgeColor}`}>{d.badge}</span>
              </div>

              <h3 className="card-title">{d.title}</h3>
              <div className="card-subtitle">{d.subtitle}</div>
              <p className="card-description">{d.description}</p>

              <div className="card-features-list">
                {d.features.map((feat, idx) => (
                  <div key={idx} className="feature-item">
                    <CheckCircle2 size={13} className="check-icon" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="card-footer-action">
                <button
                  type="button"
                  className={`card-btn ${d.highlight ? "highlight-btn" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(d.path);
                  }}
                >
                  <span>{d.cta}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dual-Brain Architecture Explanation */}
      <section className="architecture-overview-section">
        <div className="arch-card">
          <div className="arch-header">
            <Zap size={22} className="arch-icon" />
            <div>
              <h3>Dual-Brain Zero-Crash Architecture</h3>
              <p>Ensures 100% availability during live classroom demonstrations and jury evaluations.</p>
            </div>
          </div>
          <div className="arch-grid">
            <div className="arch-brain-box">
              <div className="brain-tag">Brain 1 · Always Active (Offline)</div>
              <h4>Deterministic Python Physics & AST Engine</h4>
              <p>
                Calculates exact Modified Nodal Analysis, IPC-2221 copper trace heating, Capacitive Reactance,
                NumPy 2D Truss Stiffness, Euler-Bernoulli beam deflection, and live OSV.dev CVEs with zero external API keys required.
              </p>
            </div>
            <div className="arch-brain-box">
              <div className="brain-tag">Brain 2 · Optional REST Enhancer</div>
              <h4>Google Gemini 2.0 Flash REST Copilot</h4>
              <p>
                Enriches open-ended student ideas and custom questions with first-principles reasoning. 
                Runs with a strict 3.0s timeout and instant &lt;50ms automatic fallback to Brain 1 if unconfigured or on rate limits.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
