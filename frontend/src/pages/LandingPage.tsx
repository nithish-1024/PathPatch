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
      title: "Circuits & Systems Studio",
      subtitle: "Interactive EDA Workbench (Tinkercad + Multisim + KiCad)",
      badge: "Electronics & Hardware Workbench",
      badgeColor: "amber",
      highlight: true,
      description:
        "An interactive EDA simulation workbench inspired by Tinkercad Circuits, OurCircuits, and NI Multisim. Flip power switches, adjust load potentiometers, take digital multimeter probe measurements, and diagnose thermal runaway live.",
      features: [
        "Real-time [▶ Start Simulation] engine with live SPICE electrical physics",
        "Functional in-canvas parts: Clickable rocker switches, rotary pots, glowing LEDs, DMM",
        "Single Recommended Solution: TSR-1 Buck Module cooling (118.2°C -> 32.8°C)",
        "Solderless Breadboard, Schematic Netlist, and Soldered FR-4 PCB view modes",
      ],
      cta: "Launch Circuit Studio",
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
      title: "System Architecture Studio",
      subtitle: "5-Stage Subsystem Pipeline & Bottleneck Isolation",
      badge: "System Engineering Studio",
      badgeColor: "teal",
      description:
        "Deconstruct any hardware, software, or IoT concept into a clean 5-stage architecture pipeline. Pinpoints the single critical failure bottleneck and provides a single recommended production blueprint.",
      features: [
        "Stage-by-stage pipeline: Input, Power, Logic, Actuation, Telemetry",
        "Single failure bottleneck isolation with quantitative physics equations",
        "Single Recommended Production Blueprint (zero 3-plan clutter)",
        "Zero 3D clutter, zero academic jargon — pure engineering clarity",
      ],
      cta: "Launch Architecture Studio",
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
