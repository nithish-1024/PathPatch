import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  FileSpreadsheet,
  Lock,
  Radio,
  Server,
  ShieldAlert,
  Unlock,
  Users,
  X,
  Zap,
} from "lucide-react";

interface CampusControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampusControlModal: React.FC<CampusControlModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"telemetry" | "scheduler" | "nba" | "pricing">("telemetry");
  const [examLockActive, setExamLockActive] = useState<boolean>(false);
  const [hilConnected, setHilConnected] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>("");

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleDownloadNbaCsv = () => {
    const csvContent =
      "Course Code,Department,Lab Module,Registered Students,Active Evaluated,PO2 (Analysis) %,PO3 (Design) %,PO4 (Investigation) %,PO5 (Modern Tools) %,NBA Criterion 3 Status,Criterion 6 Compliance\n" +
      "EC204,Electronics & Comm,LM741 Op-Amp & MNA Simulation,60,60,88.4%,92.1%,86.7%,95.8%,Attained (Level 3),Compliant (WebAssembly/MNA)\n" +
      "CS302,Computer Science,OSV.dev Dependency CVE Audit & Patch,60,59,91.2%,89.5%,94.0%,96.5%,Attained (Level 3),Compliant (OSV AST Graph)\n" +
      "CE205,Civil Engineering,Truss Direct Stiffness & Euler Buckling,60,58,85.0%,87.2%,89.1%,92.0%,Attained (Level 3),Compliant (2D FEA Matrix)\n" +
      "ME208,Mechanical Engineering,Euler-Bernoulli Beam SFD/BMD & Deflection,60,60,87.6%,90.4%,88.2%,94.3%,Attained (Level 3),Compliant (Euler-Bernoulli)\n" +
      "ID401,Multi-Disciplinary,5-Stage Hardware Blueprint & Thermal Contradiction,60,57,93.0%,94.5%,90.8%,97.0%,Attained (Level 3),Compliant (Full Twin System)\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "NBA_SAR_Criterion3_6_Attainment_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded NBA_SAR_Criterion3_6_Attainment_Report.csv");
  };

  return (
    <div className="campus-modal-backdrop" onClick={onClose}>
      <div className="campus-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="campus-modal-header">
          <div className="campus-header-title">
            <span className="campus-badge">INSTITUTIONAL B2B</span>
            <h2>🏛️ Campus SaaS & NBA Lab Control</h2>
            <p className="campus-header-subtitle">
              Multi-Tenant University Twin · GFR Rule 154 Discretionary Tier · Real-Time HIL Telemetry
            </p>
          </div>
          <button className="campus-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="campus-tabs-bar">
          <button
            className={`campus-tab ${activeTab === "telemetry" ? "active" : ""}`}
            onClick={() => setActiveTab("telemetry")}
          >
            <Activity size={15} />
            <span>Telemetry (142 Online)</span>
          </button>
          <button
            className={`campus-tab ${activeTab === "scheduler" ? "active" : ""}`}
            onClick={() => setActiveTab("scheduler")}
          >
            <Clock size={15} />
            <span>Lab Scheduler & Exam Lock</span>
          </button>
          <button
            className={`campus-tab ${activeTab === "nba" ? "active" : ""}`}
            onClick={() => setActiveTab("nba")}
          >
            <FileSpreadsheet size={15} />
            <span>NBA SAR Criterion 3 & 6</span>
          </button>
          <button
            className={`campus-tab ${activeTab === "pricing" ? "active" : ""}`}
            onClick={() => setActiveTab("pricing")}
          >
            <Zap size={15} />
            <span>GFR 154 Pricing Tier</span>
          </button>
        </div>

        {toastMessage && (
          <div className="campus-toast">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="campus-modal-body">
          {/* TAB 1: TELEMETRY */}
          {activeTab === "telemetry" && (
            <div className="campus-tab-content">
              {/* Top Metrics Grid */}
              <div className="campus-metric-grid">
                <div className="campus-metric-card">
                  <div className="metric-icon-wrap cyan">
                    <Users size={18} />
                  </div>
                  <div className="metric-value-wrap">
                    <div className="metric-big-num">142 / 240</div>
                    <div className="metric-label">Active Concurrent Seats</div>
                    <div className="metric-progress-bar">
                      <div className="metric-fill" style={{ width: "59%" }} />
                    </div>
                  </div>
                </div>

                <div className="campus-metric-card">
                  <div className="metric-icon-wrap green">
                    <Zap size={18} />
                  </div>
                  <div className="metric-value-wrap">
                    <div className="metric-big-num">3.8 ms</div>
                    <div className="metric-label">Client Wasm/Worker Latency</div>
                    <div className="metric-subtext">Zero cloud GPU/server cost</div>
                  </div>
                </div>

                <div className="campus-metric-card">
                  <div className="metric-icon-wrap purple">
                    <Server size={18} />
                  </div>
                  <div className="metric-value-wrap">
                    <div className="metric-big-num">99.2%</div>
                    <div className="metric-label">OSV SHA Cache Hit</div>
                    <div className="metric-subtext">Cached vulnerability queries</div>
                  </div>
                </div>

                <div className="campus-metric-card">
                  <div className="metric-icon-wrap amber">
                    <Radio size={18} />
                  </div>
                  <div className="metric-value-wrap">
                    <div className="metric-big-num">±0.012 V</div>
                    <div className="metric-label">HIL Real-to-Sim Residual</div>
                    <div className="metric-subtext">STM32G474 + INA226 ADC</div>
                  </div>
                </div>
              </div>

              {/* Live Studio Distribution */}
              <div className="campus-section-card">
                <h3 className="section-title">
                  <Cpu size={16} /> Active Student Studio Load Distribution
                </h3>
                <div className="studio-load-list">
                  <div className="studio-load-item">
                    <div className="studio-load-header">
                      <span className="studio-name">⚡ 2. ECE Circuits Studio (MNA & Skeuomorphic Breadboard)</span>
                      <span className="studio-count">58 Students (41%)</span>
                    </div>
                    <div className="studio-bar">
                      <div className="studio-bar-fill cyan" style={{ width: "41%" }} />
                    </div>
                  </div>

                  <div className="studio-load-item">
                    <div className="studio-load-header">
                      <span className="studio-name">📦 1. Repo Studio (Code Nebula & OSV AST Graph)</span>
                      <span className="studio-count">41 Students (29%)</span>
                    </div>
                    <div className="studio-bar">
                      <div className="studio-bar-fill purple" style={{ width: "29%" }} />
                    </div>
                  </div>

                  <div className="studio-load-item">
                    <div className="studio-load-header">
                      <span className="studio-name">🏗️ 3. Civil Studio (2D Direct Stiffness & Euler Buckling)</span>
                      <span className="studio-count">24 Students (17%)</span>
                    </div>
                    <div className="studio-bar">
                      <div className="studio-bar-fill green" style={{ width: "17%" }} />
                    </div>
                  </div>

                  <div className="studio-load-item">
                    <div className="studio-load-header">
                      <span className="studio-name">⚙️ 4. Mechanical Studio (Euler-Bernoulli SFD/BMD)</span>
                      <span className="studio-count">19 Students (13%)</span>
                    </div>
                    <div className="studio-bar">
                      <div className="studio-bar-fill amber" style={{ width: "13%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware-in-the-Loop Bridge Status */}
              <div className="campus-section-card hil-bridge-card">
                <div className="hil-bridge-header">
                  <div className="hil-bridge-info">
                    <span className="hil-badge">CYBER-PHYSICAL SYSTEM (CPS)</span>
                    <h4>Hardware-in-the-Loop (HIL) Testbench Bridge</h4>
                    <p>
                      STMicroelectronics STM32G474 + ESP32-S3 streaming high-speed telemetry over WebSerial API
                    </p>
                  </div>
                  <button
                    className={`hil-toggle-btn ${hilConnected ? "connected" : "disconnected"}`}
                    onClick={() => {
                      setHilConnected(!hilConnected);
                      showToast(hilConnected ? "HIL Bridge Disconnected" : "HIL WebSerial Synced @ 1 kHz (115200 Baud)");
                    }}
                  >
                    <span className="hil-dot" />
                    <span>{hilConnected ? "⚡ HIL Synced (1 kHz)" : "Connect WebSerial"}</span>
                  </button>
                </div>
                <div className="hil-specs-row">
                  <div className="hil-spec-tag">Baud: 115200</div>
                  <div className="hil-spec-tag">Channel A: Sim MNA (Green)</div>
                  <div className="hil-spec-tag">Channel B: Physical ADC (Cyan)</div>
                  <div className="hil-spec-tag">Packets Dropped: 0</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEDULER & EXAM LOCK */}
          {activeTab === "scheduler" && (
            <div className="campus-tab-content">
              {/* Exam Lock Banner */}
              <div className={`exam-lock-banner ${examLockActive ? "locked" : "unlocked"}`}>
                <div className="exam-lock-info">
                  {examLockActive ? <Lock size={22} className="lock-icon" /> : <Unlock size={22} className="lock-icon" />}
                  <div>
                    <h4>{examLockActive ? "🔒 Practical Exam Mode: ACTIVE" : "🔓 Open Exploration Mode: ACTIVE"}</h4>
                    <p>
                      {examLockActive
                        ? "AI Copilot explanations are muted, formula sheets restricted to syllabus guidelines, and student runs auto-logged for grading."
                        : "Students have unrestricted access to Dual-Brain AI explanations, component parameter tweaking, and interactive solvers."}
                    </p>
                  </div>
                </div>
                <button
                  className="exam-toggle-btn"
                  onClick={() => {
                    setExamLockActive(!examLockActive);
                    showToast(examLockActive ? "Exam Mode Unlocked" : "Exam Mode Locked: AI Copilot Muted");
                  }}
                >
                  {examLockActive ? "Disable Exam Lock" : "Activate Practical Exam Lock"}
                </button>
              </div>

              {/* Lab Schedule Tokens Table */}
              <div className="campus-section-card">
                <h3 className="section-title">
                  <Clock size={16} /> Departmental Time-Windowed Lab Sessions
                </h3>
                <div className="schedule-table-wrap">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>Session Token</th>
                        <th>Department & Course</th>
                        <th>Time Window</th>
                        <th>Seats</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>ECE-ANALOG-2026</code></td>
                        <td>Electronics · EC204 Linear IC Lab</td>
                        <td>Tue 09:00 - 12:00</td>
                        <td>60 / 60</td>
                        <td><span className="badge-live">IN PROGRESS</span></td>
                        <td>
                          <button
                            className="btn-action-small"
                            onClick={() => showToast("Copied ECE-ANALOG-2026 Student Join Link")}
                          >
                            Copy Link
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td><code>CSE-DEVSEC-2026</code></td>
                        <td>Computer Science · CS302 DevSecOps</td>
                        <td>Wed 14:00 - 17:00</td>
                        <td>60 / 60</td>
                        <td><span className="badge-scheduled">SCHEDULED</span></td>
                        <td>
                          <button
                            className="btn-action-small"
                            onClick={() => showToast("Copied CSE-DEVSEC-2026 Student Join Link")}
                          >
                            Copy Link
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td><code>MECH-SOLID-2026</code></td>
                        <td>Mechanical · ME208 Mechanics of Solids</td>
                        <td>Fri 10:00 - 13:00</td>
                        <td>60 / 60</td>
                        <td><span className="badge-scheduled">SCHEDULED</span></td>
                        <td>
                          <button
                            className="btn-action-small"
                            onClick={() => showToast("Copied MECH-SOLID-2026 Student Join Link")}
                          >
                            Copy Link
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NBA SAR CRITERION 3 & 6 */}
          {activeTab === "nba" && (
            <div className="campus-tab-content">
              <div className="nba-intro-card">
                <div className="nba-intro-text">
                  <span className="campus-badge">NATIONAL BOARD OF ACCREDITATION</span>
                  <h4>Automated Outcome-Based Education (OBE) Attainment</h4>
                  <p>
                    Direct mapping of student simulation benchmarks to NBA Self-Assessment Report (SAR) Criterion 3 (Course & Program Outcomes) and Criterion 6 (Laboratory Infrastructure & Modern Tool Usage).
                  </p>
                </div>
                <button className="nba-export-btn" onClick={handleDownloadNbaCsv}>
                  <Download size={16} />
                  <span>Export NBA Criterion 3 & 6 CSV</span>
                </button>
              </div>

              {/* PO Attainment Matrix */}
              <div className="campus-section-card">
                <h3 className="section-title">
                  <CheckCircle2 size={16} /> Program Outcome (PO) Attainment Matrix (Batch 2024–2026)
                </h3>
                <div className="po-grid">
                  <div className="po-card">
                    <div className="po-code">PO2</div>
                    <div className="po-title">Problem Analysis</div>
                    <div className="po-score green">88.4%</div>
                    <div className="po-desc">Identification of op-amp clipping, structural buckling, and software CVE boundaries.</div>
                  </div>

                  <div className="po-card">
                    <div className="po-code">PO3</div>
                    <div className="po-title">Design & Development</div>
                    <div className="po-score green">92.1%</div>
                    <div className="po-desc">Standardized 3-Path engineering remediation selection (Path A, B, C trade-offs).</div>
                  </div>

                  <div className="po-card">
                    <div className="po-code">PO4</div>
                    <div className="po-title">Investigations</div>
                    <div className="po-score green">86.7%</div>
                    <div className="po-desc">AC Bode sweep analysis, MNA nodal calculations, and SFD/BMD validation.</div>
                  </div>

                  <div className="po-card">
                    <div className="po-code">PO5</div>
                    <div className="po-title">Modern Tool Usage</div>
                    <div className="po-score green">95.8%</div>
                    <div className="po-desc">Universal browser Digital Twin replacing legacy single-seat desktop software.</div>
                  </div>
                </div>
              </div>

              {/* Criterion 6 Laboratory Modernization */}
              <div className="campus-section-card">
                <h3 className="section-title">
                  <ShieldAlert size={16} /> Criterion 6: Facilities & Technical Infrastructure Compliance
                </h3>
                <div className="criterion6-checklist">
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span><b>Zero Licensing Per Seat:</b> Runs 100% in modern browser WebGL/Web Workers without expensive per-seat dongle locks.</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span><b>Remote & Hybrid Lab Access:</b> Accessible 24/7 from student laptops or campus lab thin-clients.</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span><b>Continuous Evidence Logging:</b> Student runs, timestamps, and mathematical proofs exportable for NBA audit visits.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRICING & GFR RULE 154 */}
          {activeTab === "pricing" && (
            <div className="campus-tab-content">
              <div className="pricing-intro-banner">
                <span className="gfr-badge">GFR RULE 154 COMPLIANT</span>
                <h4>Discretionary Direct Purchase Tiers (No Tender Delays)</h4>
                <p>
                  Under Indian General Financial Rules (GFR 2017) Rule 154, Heads of Department (HOD) can directly procure goods and software services up to <b>₹50,000</b> without calling for competitive tenders or central committee approval.
                </p>
              </div>

              <div className="pricing-cards-grid">
                {/* Tier 0 */}
                <div className="pricing-card">
                  <div className="pricing-card-header">
                    <div className="tier-name">Tier 0: Student Sandbox</div>
                    <div className="tier-price">₹0 <span className="tier-period">/ forever</span></div>
                    <div className="tier-target">Individual Self-Learners & Capstones</div>
                  </div>
                  <ul className="tier-features">
                    <li>✓ All 5 Engineering Studios (/repo, /ece, /truss, /beam, /idea)</li>
                    <li>✓ Client-Side MNA & Direct Stiffness Solvers</li>
                    <li>✓ 60 FPS Canvas Oscilloscope & Bode Analyzer</li>
                    <li>✓ Standardized 3-Path Remediation Model</li>
                    <li>✓ Aether Notetaker .md Export</li>
                  </ul>
                  <button className="tier-btn-outline" onClick={onClose}>
                    Current Active Tier
                  </button>
                </div>

                {/* Tier 1 - Highlighted */}
                <div className="pricing-card highlighted">
                  <div className="gfr-pill-banner">⭐ DIRECT BUY UNDER GFR RULE 154</div>
                  <div className="pricing-card-header">
                    <div className="tier-name">Tier 1: Departmental OBE Pass</div>
                    <div className="tier-price">₹48,000 <span className="tier-period">/ semester / dept</span></div>
                    <div className="tier-target">Approved for Immediate HOD Sanction</div>
                  </div>
                  <ul className="tier-features">
                    <li>✓ <b>Up to 240 Concurrent Student Seats</b></li>
                    <li>✓ <b>Time-Windowed Lab Tokens & Exam Mode Lock</b></li>
                    <li>✓ <b>1-Click NBA SAR Criterion 3 & 6 CSV Exporter</b></li>
                    <li>✓ <b>Faculty Rubric & Auto-Grading Console</b></li>
                    <li>✓ <b>Zero Tender Overhead (Instant Work Order)</b></li>
                  </ul>
                  <button
                    className="tier-btn-primary"
                    onClick={() => {
                      showToast("Proforma Invoice generated for Tier 1 Departmental OBE Pass (₹48,000)");
                    }}
                  >
                    Generate GFR 154 Proforma Invoice
                  </button>
                </div>

                {/* Tier 2 */}
                <div className="pricing-card">
                  <div className="pricing-card-header">
                    <div className="tier-name">Tier 2: Universal Campus Twin</div>
                    <div className="tier-price">₹1,80,000 <span className="tier-period">/ academic year</span></div>
                    <div className="tier-target">Institutional Multi-Disciplinary License</div>
                  </div>
                  <ul className="tier-features">
                    <li>✓ <b>Includes 3 Physical HIL Testbench Kits</b> (STM32G474 + ESP32-S3 + INA226 ADC)</li>
                    <li>✓ Campus-Wide Unlimited Student & Faculty Seats</li>
                    <li>✓ Government e-Marketplace (GeM) Contract Processing</li>
                    <li>✓ On-Premise Docker Deployment Option</li>
                    <li>✓ Priority Support & Curriculum Alignment Workshop</li>
                  </ul>
                  <button
                    className="tier-btn-outline"
                    onClick={() => {
                      showToast("Institutional GeM Inquiry forwarded to PathPatch Sales");
                    }}
                  >
                    Request Institutional GeM Quotation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
