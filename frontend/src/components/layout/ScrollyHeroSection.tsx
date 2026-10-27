import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowDown, ArrowRight, CircleDot } from "lucide-react";

const stories = [
  { id: "01", title: "See the system", body: "Map the parts and the paths between them." },
  { id: "02", title: "Find the weak link", body: "Separate measured evidence from assumptions." },
  { id: "03", title: "Compare a repair", body: "Choose a small change, then see what still needs proving." },
];

export default function ScrollyHeroSection({ onJump }: { onJump: () => void }) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !section.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".hero-copy > *", { y: 18, opacity: 0 }, {
        y: 0, opacity: 1, stagger: 0.09, duration: 0.75, ease: "power2.out",
      });
      gsap.fromTo(".story-card", { y: 22, opacity: 0 }, {
        y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: ".story-row", start: "top 82%" },
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero-section" ref={section} aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><CircleDot size={13} strokeWidth={2.5} /> ENGINEERING FIELD NOTES <span>VOL. 01 / SYSTEMS</span></div>
          <h1 id="hero-title">Make the<br /><em>failure visible.</em></h1>
          <p className="hero-deck">A hands-on workbench for tracing risk, testing a better path, and learning what the evidence can actually say.</p>
          <div className="hero-actions">
            <button className="button button-ink" onClick={onJump}>Enter the workbench <ArrowRight size={16} /></button>
            <a className="text-link" href="#how-it-works">How it works <ArrowDown size={14} /></a>
          </div>
          <div className="hero-caption"><span className="caption-line" /> REAL INPUTS · EXPLICIT ASSUMPTIONS · VISIBLE TRADE-OFFS</div>
        </div>
        <div className="hero-specimen" aria-label="Abstract system diagram showing linked components and a fault point">
          <div className="specimen-top"><span>SPECIMEN 001</span><span>DEPENDENCY / POWER / LOAD</span></div>
          <div className="specimen-graphic">
            <div className="specimen-orbit orbit-one" />
            <div className="specimen-orbit orbit-two" />
            <div className="specimen-node node-core"><span>SYS</span></div>
            <div className="specimen-node node-fault"><span>!</span></div>
            <div className="specimen-node node-a"><span>IN</span></div>
            <div className="specimen-node node-b"><span>OUT</span></div>
            <div className="specimen-line line-a" /><div className="specimen-line line-b" /><div className="specimen-line line-c" />
            <div className="specimen-label label-core">SYSTEM<br /><small>4 LAYERS</small></div>
            <div className="specimen-label label-fault">FAULT PATH<br /><small>TRACEABLE</small></div>
            <div className="specimen-axis">X <span>Y</span> Z</div>
          </div>
          <div className="specimen-bottom"><span>PATCHPATH / UNIVERSAL</span><span>SIMULATION READY</span></div>
        </div>
      </div>
      <div className="story-row" id="how-it-works">
        {stories.map((story) => <article className="story-card" key={story.id}>
          <span className="story-number">{story.id}</span><div><h2>{story.title}</h2><p>{story.body}</p></div>
        </article>)}
      </div>
    </section>
  );
}

