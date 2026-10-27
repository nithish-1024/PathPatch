export default function SpatialCalloutOverlay({ faultLabel, note }: { faultLabel: string; note: string }) {
  return <div className="spatial-callout" aria-live="polite">
    <span className="callout-line" /><div><span className="callout-label">INSPECTED PATH</span><strong>{faultLabel}</strong><small>{note}</small></div>
  </div>;
}

