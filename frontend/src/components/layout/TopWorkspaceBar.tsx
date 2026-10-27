import { History, LogOut, Moon, Sun, UserRound } from "lucide-react";
import type { Mode, User } from "../../types/patchpath";

const modes: { id: Mode; label: string; number: string }[] = [
  { id: "cs_repo", label: "Repositories", number: "01" },
  { id: "ece_circuit", label: "Breadboard", number: "02" },
  { id: "civil_mech", label: "Civil truss", number: "03" },
  { id: "mechanical_beam", label: "Mechanical beam", number: "04" },
  { id: "custom_upskiller", label: "Your idea", number: "05" },
];

export default function TopWorkspaceBar({
  mode, onMode, dark, onTheme, user, onAuth, onLogout, onHistory,
}: {
  mode: Mode; onMode: (mode: Mode) => void; dark: boolean; onTheme: () => void;
  user: User | null; onAuth: () => void; onLogout: () => void; onHistory: () => void;
}) {
  return <header className="workspace-topbar">
    <a href="#top" className="brand-lockup" aria-label="PatchPath home"><span className="brand-mark"><span /><span /><span /></span><span>PATCHPATH<small>UNIVERSAL</small></span></a>
    <nav className="mode-switcher" aria-label="Engineering demos">
      {modes.map((item) => <button key={item.id} className={mode === item.id ? "mode-pill active" : "mode-pill"} onClick={() => onMode(item.id)} aria-pressed={mode === item.id}>
        <span>{item.number}</span>{item.label}
      </button>)}
    </nav>
    <div className="topbar-actions">
      <button className="icon-button" onClick={onTheme} aria-label={dark ? "Switch to parchment theme" : "Switch to obsidian theme"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
      <button className="icon-button history-button" onClick={onHistory} aria-label="Open saved runs"><History size={17} /><span>Runs</span></button>
      <button className={user ? "account-pill signed-in" : "account-pill"} onClick={user ? onLogout : onAuth} aria-label={user ? `Sign out ${user.full_name}` : "Sign in"}>{user ? <LogOut size={16} /> : <UserRound size={16} />}<span>{user ? user.full_name.split(" ")[0] : "Sign in"}</span><i /></button>
    </div>
  </header>;
}

