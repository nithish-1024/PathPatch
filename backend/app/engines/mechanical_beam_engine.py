"""Closed-form teaching model for a simply supported beam with a center load.
Computes moment, second moment of area (I = bh^3 / 12), bending stress, and center deflection (delta = PL^3 / 48EI).
"""

from __future__ import annotations

import re
from typing import Any

DEFAULTS = {
    "span_m": 2.0,
    "load_kn": 1.0,
    "width_mm": 50.0,
    "depth_mm": 100.0,
    "youngs_modulus_gpa": 200.0,
}


def _quantity(raw: str, labels: str, units: str) -> tuple[float, str] | None:
    pattern = rf"(?:{labels})\s*(?:=|:|of)?\s*(\d+(?:\.\d+)?)\s*({units})\b"
    match = re.search(pattern, raw, re.IGNORECASE)
    return (float(match.group(1)), match.group(2).lower()) if match else None


def _read_inputs(raw: str, beam_params: dict[str, Any] | None = None) -> tuple[dict[str, float], list[str]]:
    values = dict(DEFAULTS)
    assumptions: list[str] = []

    # If explicit beam_params passed, override directly
    if beam_params:
        if "span_m" in beam_params:
            values["span_m"] = float(beam_params["span_m"])
        if "load_kn" in beam_params:
            values["load_kn"] = float(beam_params["load_kn"])
        if "width_mm" in beam_params:
            values["width_mm"] = float(beam_params["width_mm"])
        if "depth_mm" in beam_params:
            values["depth_mm"] = float(beam_params["depth_mm"])
        if "modulus_gpa" in beam_params:
            values["youngs_modulus_gpa"] = float(beam_params["modulus_gpa"])
        elif "youngs_modulus_gpa" in beam_params:
            values["youngs_modulus_gpa"] = float(beam_params["youngs_modulus_gpa"])
        return values, assumptions

    lower = raw.casefold()
    if not re.search(r"\bbeam\b", lower):
        raise ValueError("Describe a beam, for example: simply supported beam, span 2 m, center load 1 kN, width 50 mm, depth 100 mm, E 200 GPa.")
    if any(term in lower for term in ("cantilever", "uniform load", "distributed load", "udl", "off-center", "eccentric load")):
        raise ValueError("This teaching model only accepts a simply supported beam with one point load at the center. Cantilevers, distributed loads, and off-center loads are not modeled.")
    if re.search(r"\b(?:load|force)\b[^.;]{0,48}\b(?:at|position)\s+\d", lower):
        raise ValueError("Load position is not parsed. This model places one point load at midspan; remove the explicit position or describe a future supported load case.")

    quantities = {
        "span_m": (r"\b(?:span|length)\b", r"mm|cm|m"),
        "load_kn": (r"\b(?:center(?:ed)?\s+)?(?:point\s+)?(?:load|force)\b", r"kn|n"),
        "width_mm": (r"\bwidth\b", r"mm|cm|m"),
        "depth_mm": (r"\b(?:depth|height)\b", r"mm|cm|m"),
        "youngs_modulus_gpa": (r"\b(?:young(?:'s)?(?:\s+modulus)?|elastic\s+modulus|modulus|e)\b", r"gpa|mpa|pa"),
    }

    for key, (labels, units) in quantities.items():
        found = _quantity(raw, labels, units)
        if not found:
            assumptions.append(f"{key.replace('_', ' ')} defaulted to {DEFAULTS[key]:g} {('m' if key == 'span_m' else 'kN' if key == 'load_kn' else 'mm' if key.endswith('_mm') else 'GPa')}.")
            continue
        value, unit = found
        if key == "span_m":
            value *= {"mm": 0.001, "cm": 0.01, "m": 1.0}[unit]
        elif key == "load_kn":
            value *= {"n": 0.001, "kn": 1.0}[unit]
        elif key.endswith("_mm"):
            value *= {"mm": 1.0, "cm": 10.0, "m": 1000.0}[unit]
        else:
            value *= {"pa": 1e-9, "mpa": 1e-3, "gpa": 1.0}[unit]
        values[key] = value

    ranges = {
        "span_m": (0.2, 10.0, "span", "m"),
        "load_kn": (0.01, 100.0, "load", "kN"),
        "width_mm": (5.0, 500.0, "width", "mm"),
        "depth_mm": (5.0, 500.0, "depth", "mm"),
        "youngs_modulus_gpa": (1.0, 300.0, "Young's modulus", "GPa"),
    }
    for key, (minimum, maximum, label, unit) in ranges.items():
        if not minimum <= values[key] <= maximum:
            raise ValueError(f"{label} must be between {minimum:g} and {maximum:g} {unit} for this teaching model.")
    return values, assumptions


def _calculate(inputs: dict[str, float]) -> dict[str, float]:
    span = inputs["span_m"]
    load = inputs["load_kn"] * 1000.0
    width = inputs["width_mm"] / 1000.0
    depth = inputs["depth_mm"] / 1000.0
    modulus = inputs["youngs_modulus_gpa"] * 1e9
    inertia = width * depth**3 / 12.0
    moment = load * span / 4.0
    stress = moment * (depth / 2.0) / inertia
    deflection = load * span**3 / (48.0 * modulus * inertia)
    return {
        **inputs,
        "max_moment_knm": round(moment / 1000.0, 4),
        "inertia_mm4": round(inertia * 1e12, 2),
        "max_bending_stress_mpa": round(stress / 1e6, 4),
        "max_deflection_mm": round(deflection * 1000.0, 5),
    }


def analyze_beam(title: str, raw: str, beam_params: dict[str, Any] | None = None) -> dict:
    values, assumptions = _read_inputs(raw, beam_params=beam_params)
    base = _calculate(values)
    scenarios = {
        "plan_a": _calculate({**values, "width_mm": values["width_mm"] * 1.25}),
        "plan_b": _calculate({**values, "depth_mm": values["depth_mm"] * 1.25}),
        "plan_c": _calculate({**values, "load_kn": values["load_kn"] * 0.8}),
    }
    assumptions.extend([
        "Simply supported at both ends; one static point load at midspan; small-deflection linear elastic Euler–Bernoulli beam theory.",
        "Homogeneous, prismatic rectangular section; bending about the strong axis; self-weight, shear deformation, local buckling, fatigue, joints, and material limits are omitted.",
        "No allowable stress or safety factor is defined. Results are estimates for learning, not a design approval.",
    ])

    span_half = base["span_m"] / 2.0
    nodes = [
        {"id": "support_a", "label": "Pin Support", "layer": "structure", "kind": "support", "status": "stable", "position": [-round(span_half, 2), -0.65, 0]},
        {"id": "beam", "label": f"Beam ({base['width_mm']:g}x{base['depth_mm']:g}mm)", "layer": "structure", "kind": "beam", "status": "stable", "position": [0, 0.1, 0]},
        {"id": "center_load", "label": f"{base['load_kn']:g} kN Load", "layer": "runtime", "kind": "load", "status": "fault", "position": [0, 1.2, 0]},
        {"id": "support_b", "label": "Roller Support", "layer": "structure", "kind": "support", "status": "stable", "position": [round(span_half, 2), -0.65, 0]},
    ]

    what_is_happening = (
        f"A simply supported beam spanning {base['span_m']:g} meters with a cross-section of {base['width_mm']:g} mm width by "
        f"{base['depth_mm']:g} mm depth is subjected to a center point load of {base['load_kn']:g} kN (E = {base['youngs_modulus_gpa']:g} GPa)."
    )
    why_it_fails = (
        f"The center load creates a maximum bending moment of {base['max_moment_knm']:.2f} kN·m at midspan, producing a peak bending stress "
        f"of {base['max_bending_stress_mpa']:.1f} MPa on the outer fibers and causing the beam to sag by {base['max_deflection_mm']:.2f} mm."
    )
    how_to_fix_it = (
        f"Choose Plan B (Increase Depth by 25%). Because beam stiffness scales with the cube of depth (I = b · h³ / 12), increasing "
        f"depth from {base['depth_mm']:g} mm to {scenarios['plan_b']['depth_mm']:g} mm slashes deflection from {base['max_deflection_mm']:.2f} mm "
        f"down to {scenarios['plan_b']['max_deflection_mm']:.2f} mm (a 49% reduction!). In comparison, Plan A (widening by 25%) only reduces sag by 20%."
    )
    layman_analogy = (
        "Think of a wooden 2x4 plank across two chairs: if you lay it flat and step on it, it sags significantly. "
        "If you turn it on its edge so its depth is vertical, it barely bends at all! Height/depth is cubic (4x more powerful) "
        "compared to width."
    )

    plain_english_summary = {
        "what_is_happening": what_is_happening,
        "why_it_fails": why_it_fails,
        "how_to_fix_it": how_to_fix_it,
        "layman_analogy": layman_analogy,
    }

    return {
        "mode": "mechanical_beam",
        "title": title or "Center-Loaded Beam · Flexural Mechanics Studio",
        "metrics": {
            **base,
            "assumption_note": "Formula estimates for a simply supported, center-loaded rectangular beam; Euler-Bernoulli linear beam theory.",
            "assumptions": assumptions,
        },
        "findings": [],
        "plain_english_summary": plain_english_summary,
        "interactive_controls": {
            "load_kn": base["load_kn"],
            "span_m": base["span_m"],
            "width_mm": base["width_mm"],
            "depth_mm": base["depth_mm"],
            "modulus_gpa": base["youngs_modulus_gpa"],
            "selected_plan": "plan_b",
        },
        "system_graph": {
            "nodes": nodes,
            "edges": [
                {"source": "center_load", "target": "beam", "label": "applied point load", "status": "fault"},
                {"source": "beam", "target": "support_a", "label": "reaction path", "status": "stable"},
                {"source": "beam", "target": "support_b", "label": "reaction path", "status": "stable"},
            ],
            "faults": ["center_load"],
            "patches": ["increase beam depth (h) for cubic stiffness gain"],
            "evidence_note": "Closed-form Euler–Bernoulli beam mechanics (delta = PL^3 / 48EI, sigma = My/I).",
        },
        "candidate_plans": [
            {
                "id": "plan_a",
                "label": "A",
                "name": "Plan A: Increase Section Width by 25%",
                "recommended": False,
                "summary": f"Bending stress becomes {scenarios['plan_a']['max_bending_stress_mpa']} MPa and center deflection {scenarios['plan_a']['max_deflection_mm']} mm.",
                "reason": "A wider rectangular section increases stiffness only linearly in direct proportion to width (b).",
                "evidence": [
                    f"Baseline: {base['max_bending_stress_mpa']} MPa; {base['max_deflection_mm']} mm deflection.",
                    f"Compared case: {scenarios['plan_a']['max_bending_stress_mpa']} MPa; {scenarios['plan_a']['max_deflection_mm']} mm deflection.",
                ],
                "risks": ["Material mass increases proportionally without cubic stiffness benefit."],
                "evidence_status": "formula estimate under stated assumptions",
                "estimated_scope": "section width only",
                "scenario": scenarios["plan_a"],
            },
            {
                "id": "plan_b",
                "label": "B",
                "name": "Plan B: Increase Section Depth by 25% (Recommended)",
                "recommended": True,
                "summary": f"Bending stress drops to {scenarios['plan_b']['max_bending_stress_mpa']} MPa and deflection drops to {scenarios['plan_b']['max_deflection_mm']} mm.",
                "reason": "Second moment of area changes with depth cubed (h^3), delivering a 49% reduction in sag with only 25% more material.",
                "evidence": [
                    f"Baseline: {base['max_bending_stress_mpa']} MPa; {base['max_deflection_mm']} mm deflection.",
                    f"Compared case: {scenarios['plan_b']['max_bending_stress_mpa']} MPa; {scenarios['plan_b']['max_deflection_mm']} mm deflection.",
                    "Saves material compared to widening or solid reinforcement.",
                ],
                "risks": ["Check lateral-torsional buckling if depth-to-width ratio exceeds 4:1."],
                "evidence_status": "cubic stiffness equation proof",
                "estimated_scope": "section depth only",
                "scenario": scenarios["plan_b"],
            },
            {
                "id": "plan_c",
                "label": "C",
                "name": "Plan C: Reduce Operating Load by 20%",
                "recommended": False,
                "summary": f"Bending stress becomes {scenarios['plan_c']['max_bending_stress_mpa']} MPa and center deflection {scenarios['plan_c']['max_deflection_mm']} mm.",
                "reason": "Scales bending moment and deflection linearly, but may not be feasible if external service load is mandatory.",
                "evidence": [f"Baseline load: {base['load_kn']} kN.", f"Compared load: {scenarios['plan_c']['load_kn']} kN."],
                "risks": ["Restricts machine or structural operational capacity."],
                "evidence_status": "formula estimate under stated assumptions",
                "estimated_scope": "center load only",
                "scenario": scenarios["plan_c"],
            },
        ],
    }
