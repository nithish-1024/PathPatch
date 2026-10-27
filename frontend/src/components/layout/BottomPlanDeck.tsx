import { Check, CircleAlert, CircleHelp, Sparkles } from "lucide-react";
import type { CandidatePlan } from "../../types/patchpath";

export default function BottomPlanDeck({ plans, selected, onSelect }: { plans: CandidatePlan[]; selected: string; onSelect: (id: string) => void }) {
  const symbols = [CircleAlert, Sparkles, CircleHelp];
  return <section className="plan-deck" aria-labelledby="plan-title">
    <div className="plan-deck-heading"><div><div className="mini-label">COMPARE YOUR OPTIONS</div><h2 id="plan-title">Three paths. Different trade-offs.</h2></div><span className="plan-hint"><Check size={14} /> Nothing here is auto-applied</span></div>
    <div className="plan-grid">
      {plans.map((plan, index) => {
        const Icon = symbols[index] ?? CircleHelp;
        const active = selected === plan.id;
        return <button className={`plan-card ${active ? "is-selected" : ""} ${plan.recommended ? "is-recommended" : ""}`} key={plan.id} onClick={() => onSelect(plan.id)} aria-pressed={active}>
          <div className="plan-card-top"><span className="plan-letter">{plan.label}</span>{plan.recommended && <span className="recommended-label">LOWEST-RISK START</span>}{active && <Check className="plan-check" size={15} />}</div>
          <div className="plan-card-title"><Icon size={16} /><h3>{plan.name}</h3></div>
          <p>{plan.summary}</p>
          <div className="plan-card-foot"><span>{plan.evidence_status}</span><span>{plan.estimated_scope}</span></div>
        </button>;
      })}
    </div>
  </section>;
}

