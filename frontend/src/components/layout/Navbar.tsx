import { Activity, Cpu, HardHat, Home, Key, Layers, Moon, Sun, User as UserIcon } from "lucide-react";
import { useState } from "react";
import type { User } from "../../types/patchpath";
import { CampusControlModal } from "../modals/CampusControlModal";

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
  user: User | null;
  onOpenKeyModal: () => void;
  onOpenAuthModal: () => void;
  hasGeminiKey: boolean;
}

export default function Navbar({
  currentPath,
  navigate,
  dark,
  setDark,
  user,
  onOpenKeyModal,
  onOpenAuthModal,
  hasGeminiKey,
}: NavbarProps) {
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/repo", label: "1. Repo", icon: Layers, tag: "AST & OSV" },
    { path: "/ece", label: "2. Circuits", icon: Cpu, tag: "Tinkercad & SPICE" },
    { path: "/civil", label: "3. Civil", icon: HardHat, tag: "Truss [K]{u}" },
    { path: "/mechanical", label: "4. Mechanical", icon: Activity, tag: "Euler-Bernoulli" },
    { path: "/idea", label: "5. Architecture", icon: Cpu, tag: "5-Stage Pipeline" },
  ];

  return (
    <header className="site-nav-container">
      <div className="site-nav-inner">
        {/* Brand Logo */}
        <div className="site-nav-brand" onClick={() => navigate("/")} role="button" tabIndex={0}>
          <div className="brand-symbol">
            <span className="brand-bar red" />
            <span className="brand-bar amber" />
            <span className="brand-bar green" />
          </div>
          <div className="brand-text">
            <span className="brand-title">PATCHPATH</span>
            <span className="brand-subtitle">UNIVERSAL DT LAB</span>
          </div>
        </div>

        {/* 5-Domain Navigation Links */}
        <nav className="site-nav-links" aria-label="Engineering Domains">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`nav-tab-btn ${active ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={15} className="tab-icon" />
                <span className="tab-label">{item.label}</span>
                {item.tag && <span className="tab-tag">{item.tag}</span>}
              </button>
            );
          })}
        </nav>

        {/* Right Utilities */}
        <div className="site-nav-actions">
          {/* Institutional SaaS & NBA Control Button */}
          <button
            type="button"
            className="campus-saas-btn"
            onClick={() => setIsCampusModalOpen(true)}
            title="Open Campus Institutional SaaS & NBA Lab Control"
          >
            <span className="live-dot" />
            <span>🏛️ Campus SaaS & NBA (142 Online)</span>
          </button>

          {/* AI Key Status Button */}
          <button
            type="button"
            className={`key-badge-btn ${hasGeminiKey ? "has-key" : ""}`}
            onClick={onOpenKeyModal}
            title={hasGeminiKey ? "Gemini 2.0 Flash REST Enhancer Active" : "Built-in Physics Engine Active (Click to add Gemini Key)"}
          >
            <Key size={13} />
            <span>{hasGeminiKey ? "Hybrid AI" : "Built-In Physics"}</span>
            <span className={`status-dot ${hasGeminiKey ? "green" : "amber"}`} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setDark(!dark)}
            title={dark ? "Switch to Day Editorial Light" : "Switch to Night Lab Dark"}
            aria-label="Toggle color theme"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* User Profile */}
          <button
            type="button"
            className="user-btn"
            onClick={onOpenAuthModal}
            title={user ? `Logged in as ${user.full_name}` : "Sign In / Demo Login"}
          >
            <UserIcon size={14} />
            <span className="user-name">{user ? user.full_name.split(" ")[0] : "Demo Guest"}</span>
          </button>
        </div>
      </div>

      {/* Institutional B2B Campus Control Modal */}
      <CampusControlModal
        isOpen={isCampusModalOpen}
        onClose={() => setIsCampusModalOpen(false)}
      />
    </header>
  );
}
