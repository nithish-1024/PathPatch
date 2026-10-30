"""Transparent educational health scores; these are not safety ratings.

Rules are intentionally coarse, domain-specific teaching scales:
* software: 30 points per bundled advisory match (maximum 60), plus 10 when
  resolved lockfile evidence is absent;
* LED circuits: 30 points for calculated current above the 20 mA reference, or
  25 for zero current; sensor drafts lose 15 for assumed wiring; regulator
  examples lose 35 above 1 W estimated loss (15 otherwise), plus 15 for a
  recorded load/rating mismatch;
* trusses: 30 points per target Euler ratio (maximum 60), plus 10 above 250 MPa;
* beams: 1 point per MPa stress (maximum 60) and 1 per 5 mm deflection
  (maximum 20);
* planning templates: 20 points because there is no engineering solver.

The score is max(0, 100 minus deductions), clamped to 0–100. Thresholds are
educational prompts, not engineering acceptance limits or certification.
"""

from typing import Any


def health_score(mode: str, analysis: dict[str, Any]) -> dict[str, Any]:
    """Return deterministic domain-specific points based only on saved analysis."""
    metrics = analysis.get("metrics") or {}
    findings = analysis.get("findings") or []
    if mode == "cs_repo":
        advisory_count = len(findings)
        lock_resolved = int((analysis.get("repository_scan") or {}).get("resolved_package_count", 0))
        deductions = min(60, advisory_count * 30) + (0 if lock_resolved else 10)
        factors = [f"−{min(60, advisory_count * 30)} for {advisory_count} matching bundled advisory finding(s)", f"−{0 if lock_resolved else 10} for {'lockfile versions available' if lock_resolved else 'unresolved installed versions / manifest-only evidence'}"]
    elif mode == "ece_circuit":
        if "current_ma" in metrics:
            current = float(metrics["current_ma"])
            deductions = (25 if current <= 0 else 0) + (30 if current > 20 else 0)
            factors = ["LED series path and resistor are present" if current > 0 else "−25 for no calculated LED current", "−30 for calculated current above the 20 mA teaching reference" if current > 20 else "Calculated LED current is at or below the 20 mA teaching reference"]
        elif metrics.get("data_pin"):
            deductions = 15
            factors = ["−15 because sensor pin and pull-up choices are assumed and not electrically simulated"]
        else:
            loss = float(metrics.get("linear_loss_w", 0))
            deductions = (35 if loss > 1 else 15) + (15 if "mcp1702_check" in metrics else 0)
            factors = [f"−{35 if loss > 1 else 15} for estimated linear-regulator dissipation of {loss:g} W", "−15 because the example includes a load/rating mismatch" if "mcp1702_check" in metrics else "No additional rating mismatch recorded"]
    elif mode == "civil_mech":
        ratio = float(metrics.get("baseline_target_buckling_ratio", 0))
        stress = float(metrics.get("baseline_max_stress_mpa", 0))
        deductions = min(60, max(0, round(ratio * 30))) + (10 if stress > 250 else 0)
        factors = [f"−{min(60, max(0, round(ratio * 30)))} from target-member Euler ratio {ratio:g} (teaching scale)", f"−{10 if stress > 250 else 0} based on model maximum stress {stress:g} MPa"]
    elif mode == "mechanical_beam":
        stress = float(metrics.get("max_bending_stress_mpa", 0))
        deflection = float(metrics.get("max_deflection_mm", 0))
        deductions = min(60, max(0, round(stress / 10))) + min(20, max(0, round(deflection / 5)))
        factors = [f"−{min(60, max(0, round(stress / 10)))} from estimated bending stress {stress:g} MPa (teaching scale)", f"−{min(20, max(0, round(deflection / 5)))} from estimated center deflection {deflection:g} mm (teaching scale)"]
    else:
        deductions = 20
        factors = ["−20 because this mode is a heuristic planning template without an engineering solver"]
    return {"score": max(0, min(100, 100 - deductions)), "label": "Educational health score", "factors": factors, "method": "Starts at 100; applies the listed deterministic domain-specific deductions to saved analysis values. It is a learning aid, not a safety, quality, or certification rating."}
