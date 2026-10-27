"""Closed-form teaching model for a simply supported beam with a center load."""

from __future__ import annotations

import re
from dataclasses import dataclass


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


def _read_inputs(raw: str) -> tuple[dict[str, float], list[str]]:
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
    values = dict(DEFAULTS)
    assumptions: list[str] = []
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


def analyze_beam(title: str, raw: str) -> dict:
    values, assumptions = _read_inputs(raw)
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
    nodes = [
        {"id": "support_a", "label": "Pin support", "layer": "structure", "kind": "support", "status": "stable", "position": [-4, -0.65, 0]},
        {"id": "beam", "label": "Rectangular beam", "layer": "structure", "kind": "beam", "status": "stable", "position": [0, 0.1, 0]},
        {"id": "center_load", "label": "Center point load", "layer": "runtime", "kind": "load", "status": "fault", "position": [0, 1.2, 0]},
        {"id": "support_b", "label": "Roller support", "layer": "structure", "kind": "support", "status": "stable", "position": [4, -0.65, 0]},
    ]
    return {
        "mode": "mechanical_beam",
        "metrics": {
            **base,
            "assumption_note": "Inputs and defaults are shown below. Formula estimates for a simply supported, center-loaded rectangular beam; no strength limit or safety factor is assumed.",
            "assumptions": assumptions,
        },
        "findings": [],
        "system_graph": {
            "nodes": nodes,
            "edges": [
                {"source": "center_load", "target": "beam", "label": "applied point load", "status": "fault"},
                {"source": "beam", "target": "support_a", "label": "reaction path", "status": "stable"},
                {"source": "beam", "target": "support_b", "label": "reaction path", "status": "stable"},
            ],
            "faults": ["center_load"], "patches": ["compare changes to section width, depth, or load"],
            "evidence_note": "Closed-form formula estimate for a simply supported beam with a central point load. Supports, section, and material follow the listed assumptions.",
        },
        "candidate_plans": [
            {
                "id": "plan_a", "label": "A", "name": "Increase section width by 25%", "recommended": False,
                "summary": f"Estimated bending stress becomes {scenarios['plan_a']['max_bending_stress_mpa']} MPa and center deflection {scenarios['plan_a']['max_deflection_mm']} mm.",
                "reason": "A wider rectangular section increases bending stiffness in direct proportion to width.",
                "evidence": [f"Baseline: {base['max_bending_stress_mpa']} MPa; {base['max_deflection_mm']} mm deflection.", f"Compared case: {scenarios['plan_a']['max_bending_stress_mpa']} MPa; {scenarios['plan_a']['max_deflection_mm']} mm."],
                "risks": ["Material strength, mass, cost, support bearing, and fabrication were not evaluated."],
                "evidence_status": "formula estimate under stated assumptions", "estimated_scope": "section width only", "scenario": scenarios["plan_a"],
            },
            {
                "id": "plan_b", "label": "B", "name": "Increase section depth by 25%", "recommended": True,
                "summary": f"Estimated bending stress becomes {scenarios['plan_b']['max_bending_stress_mpa']} MPa and center deflection {scenarios['plan_b']['max_deflection_mm']} mm.",
                "reason": "For this rectangular section the second moment of area changes with depth cubed, making depth a clear stiffness teaching comparison.",
                "evidence": [f"Baseline: {base['max_bending_stress_mpa']} MPa; {base['max_deflection_mm']} mm deflection.", f"Compared case: {scenarios['plan_b']['max_bending_stress_mpa']} MPa; {scenarios['plan_b']['max_deflection_mm']} mm."],
                "risks": ["This comparison does not check strength limits, shear, lateral stability, connection details, or design codes."],
                "evidence_status": "formula estimate under stated assumptions; not a design approval", "estimated_scope": "section depth only", "scenario": scenarios["plan_b"],
            },
            {
                "id": "plan_c", "label": "C", "name": "Reduce center load by 20%", "recommended": False,
                "summary": f"Estimated bending stress becomes {scenarios['plan_c']['max_bending_stress_mpa']} MPa and center deflection {scenarios['plan_c']['max_deflection_mm']} mm.",
                "reason": "A load change scales the ideal model's bending moment, stress, and deflection proportionally.",
                "evidence": [f"Baseline load: {base['load_kn']} kN.", f"Compared load: {scenarios['plan_c']['load_kn']} kN."],
                "risks": ["The source and feasibility of a lower operating load are not evaluated."],
                "evidence_status": "formula estimate under stated assumptions", "estimated_scope": "center load only", "scenario": scenarios["plan_c"],
            },
        ],
    }
