import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { AnalysisRun, CandidatePlan, ViewLayer } from "../types/patchpath";

const Center3DViewport = lazy(() => import("./Center3DViewport"));

type Props = { run: AnalysisRun; plan: CandidatePlan; layer: ViewLayer; dark: boolean };

function ViewportPlaceholder() {
  return <section className="viewport-panel" aria-label="Interactive system specimen">
    <header className="viewport-head"><span><i className="live-point" /> DIGITAL TWIN / SYSTEM VIEW</span><span>WEBGL SPECIMEN</span></header>
    <div className="canvas-wrap">
      <div className="scene-fallback" role="status" aria-live="polite">
        <div className="fallback-glyph"><span className="button-spinner" /></div>
        <strong>Preparing the specimen</strong>
        <p>The interactive 3D view loads as it enters the screen. The analysis and evidence remain available in the adjacent panels.</p>
      </div>
    </div>
    <footer className="viewport-foot"><span>WEBGL VIEW / LOADING ON APPROACH</span><span>INPUT AND RESULTS ARE TEXT-ACCESSIBLE</span></footer>
  </section>;
}

export default function Deferred3DViewport(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad || !host.current) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return <div ref={host}>
    {shouldLoad
      ? <Suspense fallback={<ViewportPlaceholder />}><Center3DViewport {...props} /></Suspense>
      : <ViewportPlaceholder />}
  </div>;
}
