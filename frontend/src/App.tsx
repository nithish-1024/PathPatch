import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Key, ShieldCheck, X } from "lucide-react";
import SmoothScrollProvider from "./components/motion/SmoothScrollProvider";
import Navbar from "./components/layout/Navbar";
import LandingPage from "./pages/LandingPage";
import EceStudioPage from "./pages/EceStudioPage";
import RepoStudioPage from "./pages/RepoStudioPage";
import CivilStudioPage from "./pages/CivilStudioPage";
import MechanicalStudioPage from "./pages/MechanicalStudioPage";
import IdeaStudioPage from "./pages/IdeaStudioPage";
import { AuthModal, AuthPage } from "./components/modals/Overlays";
import { api } from "./api/client";
import type { User } from "./types/patchpath";

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");
  const [demoLoginEnabled, setDemoLoginEnabled] = useState(true);

  // Gemini API Key in sessionStorage
  const [geminiKeyInput, setGeminiKeyInput] = useState(
    () => (typeof window !== "undefined" ? sessionStorage.getItem("patchpath_gemini_key") ?? "" : "")
  );
  const [hasGeminiKey, setHasGeminiKey] = useState(
    () => (typeof window !== "undefined" ? !!sessionStorage.getItem("patchpath_gemini_key") : false)
  );

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setPathname(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
    api.authConfig().then((cfg) => setDemoLoginEnabled(cfg.demo_login_enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = geminiKeyInput.trim();
    if (trimmed) {
      sessionStorage.setItem("patchpath_gemini_key", trimmed);
      setHasGeminiKey(true);
      setNotice("Gemini 2.0 Flash REST Enhancer active. Brain 2 will enrich Q&A and ideas.");
    } else {
      sessionStorage.removeItem("patchpath_gemini_key");
      setHasGeminiKey(false);
      setNotice("Using Built-in Physics Engine (Brain 1). Zero external keys required.");
    }
    setKeyModalOpen(false);
  };

  const handleClearGeminiKey = () => {
    sessionStorage.removeItem("patchpath_gemini_key");
    setGeminiKeyInput("");
    setHasGeminiKey(false);
    setNotice("Gemini API Key removed. Engine operating 100% on built-in physics.");
    setKeyModalOpen(false);
  };

  const handleDemoLogin = async () => {
    if (!demoLoginEnabled) {
      setAuthError("One-click demo login is disabled in production. Please register your own account.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const nextUser = await api.demoLogin();
      setUser(nextUser);
      setAuthModalOpen(false);
      if (pathname === "/login" || pathname === "/register") navigate("/");
      setNotice(`Signed in as ${nextUser.full_name}.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Demo login failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const nextUser = await api.login(email, pass);
      setUser(nextUser);
      setAuthModalOpen(false);
      if (pathname === "/login" || pathname === "/register") navigate("/");
      setNotice(`Signed in as ${nextUser.full_name}.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (email: string, name: string, pass: string, dept: string) => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const nextUser = await api.register(email, name, pass, dept);
      setUser(nextUser);
      setAuthModalOpen(false);
      if (pathname === "/login" || pathname === "/register") navigate("/");
      setNotice(`Account created! Welcome, ${nextUser.full_name}.`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Account creation failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setUser(null);
    setNotice("You have signed out.");
  };

  // Render Page Content
  const renderPage = () => {
    if (pathname === "/login" || pathname === "/register") {
      return (
        <AuthPage
          key={pathname}
          initialCreating={pathname === "/register"}
          onReturn={() => navigate("/")}
          onDemo={handleDemoLogin}
          onLogin={handleLogin}
          onRegister={handleRegister}
          busy={authBusy}
          error={authError}
          demoLoginEnabled={demoLoginEnabled}
        />
      );
    }
    if (pathname === "/repo") return <RepoStudioPage />;
    if (pathname === "/ece") return <EceStudioPage />;
    if (pathname === "/civil") return <CivilStudioPage />;
    if (pathname === "/mechanical") return <MechanicalStudioPage />;
    if (pathname === "/idea") return <IdeaStudioPage />;
    return <LandingPage navigate={navigate} />;
  };

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <SmoothScrollProvider>
      <div className={`app-shell ${dark ? "theme-dark" : "theme-light"}`}>
        {!isAuthPage && (
          <Navbar
            currentPath={pathname}
            navigate={navigate}
            dark={dark}
            setDark={setDark}
            user={user}
            onOpenKeyModal={() => setKeyModalOpen(true)}
            onOpenAuthModal={() => {
              if (user) handleLogout();
              else setAuthModalOpen(true);
            }}
            hasGeminiKey={hasGeminiKey}
          />
        )}

        {renderPage()}

        {!isAuthPage && (
          <footer className="site-footer">
            <div className="footer-content">
              <div className="brand-lockup" onClick={() => navigate("/")} role="button" tabIndex={0}>
                <span className="brand-mark">
                  <span />
                  <span />
                  <span />
                </span>
                <span>
                  PATCHPATH<small>UNIVERSAL DT LAB</small>
                </span>
              </div>
              <div className="footer-links">
                <button type="button" onClick={() => navigate("/repo")}>1. Repo AST</button>
                <button type="button" onClick={() => navigate("/ece")}>2. ECE & Multisim</button>
                <button type="button" onClick={() => navigate("/civil")}>3. Civil Truss</button>
                <button type="button" onClick={() => navigate("/mechanical")}>4. Mechanical Beam</button>
                <button type="button" onClick={() => navigate("/idea")}>5. Your Idea</button>
              </div>
              <div className="footer-meta">
                <span>FIRST PRINCIPLES · 100% DETERMINISTIC PHYSICS</span>
                <span>PRODUCTION V1.0 · READY FOR EXTERNAL JURY</span>
              </div>
            </div>
          </footer>
        )}

        {/* Gemini API Key Modal */}
        {keyModalOpen && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setKeyModalOpen(false)}>
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="key-modal-title">
              <header className="modal-header">
                <div>
                  <span className="mini-label">DUAL-BRAIN ENGINE CONFIGURATION</span>
                  <h2 id="key-modal-title">AI Copilot Key</h2>
                </div>
                <button className="icon-button" onClick={() => setKeyModalOpen(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </header>
              <p className="modal-intro">
                PatchPath operates <strong>100% offline and crash-free</strong> using Brain 1 (first-principles Python physics, MNA, and AST solvers).
                <br /><br />
                Adding an optional <strong>Google Gemini API Key</strong> enables Brain 2 (Gemini 2.0 Flash REST) to answer open-ended engineering questions and generate novel project blueprints.
              </p>
              <form className="stacked-form" onSubmit={handleSaveGeminiKey}>
                <label>
                  Gemini API Key
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button type="submit" className="button button-ink full-button">
                    <Key size={14} /> Save & Activate Brain 2
                  </button>
                  {hasGeminiKey && (
                    <button type="button" className="button button-outline" onClick={handleClearGeminiKey}>
                      Clear Key
                    </button>
                  )}
                </div>
              </form>
              <div className="privacy-note" style={{ marginTop: "16px" }}>
                <ShieldCheck size={16} />
                <span>Your API key is kept strictly in browser <code>sessionStorage</code> and is sent directly in request headers. It is never logged or stored to disk.</span>
              </div>
            </section>
          </div>
        )}

        {/* Auth Modal */}
        {authModalOpen && (
          <AuthModal
            onClose={() => setAuthModalOpen(false)}
            onDemo={handleDemoLogin}
            onLogin={handleLogin}
            onRegister={handleRegister}
            busy={authBusy}
            error={authError}
            demoLoginEnabled={demoLoginEnabled}
          />
        )}

        {/* Global Toasts */}
        {pageError && (
          <div className="toast toast-error" role="alert">
            <CircleAlert size={16} />
            {pageError}
            <button onClick={() => setPageError("")} aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        )}
        {notice && (
          <div className="toast toast-success" role="status">
            <CircleCheck size={16} />
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </SmoothScrollProvider>
  );
}
