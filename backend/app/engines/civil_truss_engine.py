"""Linear 2D axial-truss solver with explicit, editable teaching assumptions."""

import math

import numpy as np


E_STEEL_PA = 200e9
YIELD_PA = 250e6
DENSITY_KG_M3 = 7850


def _model(section: str) -> tuple[list[dict], list[tuple[int, int, str]], dict[str, tuple[float, float]]]:
    # Six lower and five upper nodes form five panels (11 nodes) and a Warren web (19 members).
    nodes: list[dict] = []
    coords: dict[str, tuple[float, float]] = {}
    for i in range(6):
        name = f"B{i}"
        coords[name] = (2.0 * i, 0.0)
        nodes.append({"id": name, "label": name, "layer": "runtime", "kind": "joint", "status": "stable", "position": [2.0 * i - 5.0, 0, 0]})
    for i in range(5):
        name = f"C{i}"
        coords[name] = (2.0 * i + 1.0, 2.0)
        nodes.append({"id": name, "label": name, "layer": "product", "kind": "joint", "status": "stable", "position": [2.0 * i - 4.0, 0.45, 0]})

    members: list[tuple[int, int, str]] = []
    names = list(coords)
    index = {name: i for i, name in enumerate(names)}
    members.extend((index[f"B{i}"], index[f"B{i+1}"], f"B{i}-B{i+1}") for i in range(5))
    members.extend((index[f"C{i}"], index[f"C{i+1}"], f"C{i}-C{i+1}") for i in range(4))
    for i in range(5):
        members.append((index[f"B{i}"], index[f"C{i}"], f"B{i}-C{i}"))
        members.append((index[f"C{i}"], index[f"B{i+1}"], f"C{i}-B{i+1}"))
    return nodes, members, coords


def _section_properties(section: str) -> tuple[float, float]:
    # Square hollow sections are represented by exact outer/inner square geometry.
    if section == "hss100x100x6":
        outer, thickness = 0.100, 0.006
    elif section == "solid100":
        outer, thickness = 0.100, 0.100
    else:  # deliberately slender initial member
        outer, thickness = 0.040, 0.002
    inner = max(0.0, outer - 2 * thickness)
    area = outer * outer - inner * inner
    inertia = (outer**4 - inner**4) / 12
    return area, inertia


def _solve(target_section: str | None = None, all_section: str | None = None, load_total_kn: float = 180.0) -> dict:
    nodes, members, coords = _model("baseline")
    names = list(coords)
    position = {name: i for i, name in enumerate(names)}
    n = len(names)
    stiffness = np.zeros((2 * n, 2 * n), dtype=float)
    areas: list[float] = []
    inertias: list[float] = []
    lengths: list[float] = []

    target = "B4-C4"
    target_index = next(i for i, member in enumerate(members) if member[2] == target)
    for member_i, (a, b, label) in enumerate(members):
        chosen = all_section or (target_section if member_i == target_index else "slender")
        area, inertia = _section_properties(chosen)
        xa, ya = coords[names[a]]
        xb, yb = coords[names[b]]
        dx, dy = xb - xa, yb - ya
        length = math.hypot(dx, dy)
        c, s = dx / length, dy / length
        local = E_STEEL_PA * area / length * np.array([
            [c*c, c*s, -c*c, -c*s],
            [c*s, s*s, -c*s, -s*s],
            [-c*c, -c*s, c*c, c*s],
            [-c*s, -s*s, c*s, s*s],
        ])
        dof = [2*a, 2*a+1, 2*b, 2*b+1]
        stiffness[np.ix_(dof, dof)] += local
        areas.append(area)
        inertias.append(inertia)
        lengths.append(length)

    force = np.zeros(2 * n, dtype=float)
    # Total applied deck load = 180 kN, shared over the five upper nodes.
    for i in range(5):
        force[2 * position[f"C{i}"] + 1] = -(load_total_kn * 1000.0 / 5.0)
    # Model a pin at B0 and a roller at B5.
    restrained = [2 * position["B0"], 2 * position["B0"] + 1, 2 * position["B5"] + 1]
    free = np.array([dof for dof in range(2 * n) if dof not in restrained], dtype=int)
    displacement = np.zeros(2 * n, dtype=float)
    displacement[free] = np.linalg.solve(stiffness[np.ix_(free, free)], force[free])

    member_results = []
    max_ratio = 0.0
    for i, (a, b, label) in enumerate(members):
        xa, ya = coords[names[a]]
        xb, yb = coords[names[b]]
        dx, dy = xb - xa, yb - ya
        c, s = dx / lengths[i], dy / lengths[i]
        axial_extension = np.dot(np.array([-c, -s, c, s]), displacement[[2*a, 2*a+1, 2*b, 2*b+1]])
        axial_force = E_STEEL_PA * areas[i] / lengths[i] * axial_extension
        stress_pa = axial_force / areas[i]
        pcr = math.pi**2 * E_STEEL_PA * inertias[i] / lengths[i]**2
        ratio = abs(min(0.0, axial_force)) / pcr
        max_ratio = max(max_ratio, ratio)
        is_target = label == target
        member_results.append({
            "label": label, "force_kn": round(axial_force / 1000, 2),
            "stress_mpa": round(stress_pa / 1e6, 2),
            "buckling_ratio": round(ratio, 3),
            "area_mm2": round(areas[i] * 1e6, 1),
            "length_m": round(lengths[i], 2), "is_target": is_target,
        })

    target_result = next(item for item in member_results if item["is_target"])
    max_stress = max(abs(item["stress_mpa"]) for item in member_results)
    return {
        "nodes": nodes, "members": members, "member_results": member_results,
        "target": target_result, "max_buckling_ratio": round(max_ratio, 3),
        "max_stress_mpa": round(max_stress, 2),
        "max_displacement_mm": round(float(np.max(np.abs(displacement))) * 1000, 3),
        "stable_by_linear_checks": max_ratio < 1.0 and max_stress < YIELD_PA / 1e6,
    }


def analyze_truss(load_total_kn: float = 180.0) -> dict:
    baseline = _solve(load_total_kn=load_total_kn)
    plan_a = _solve(target_section="solid100", load_total_kn=load_total_kn)
    plan_b = _solve(target_section="hss100x100x6", load_total_kn=load_total_kn)
    plan_c = _solve(all_section="hss100x100x6", load_total_kn=load_total_kn)
    nodes = baseline["nodes"]
    target_label = baseline["target"]["label"]
    for member_node in nodes:
        if member_node["id"] in target_label.split("-"):
            member_node["status"] = "fault"

    plans = [
        {
            "id": "plan_a", "label": "A", "name": "Replace one member with a solid section", "recommended": False,
            "summary": "The solver recomputes global forces and member checks for this section change.",
            "reason": "A heavier member can change force distribution; this ideal truss does not model the connection itself.",
            "evidence": [f"Target buckling ratio after change: {plan_a['target']['buckling_ratio']} (Euler model)."],
            "risks": ["Connection shear, fatigue, lateral restraint, and constructability are outside this solver."],
            "evidence_status": "calculated in the stated 2D ideal-truss model", "estimated_scope": "one member; connection not checked",
        },
        {
            "id": "plan_b", "label": "B", "name": "Retrofit target with HSS 100 × 100 × 6", "recommended": True,
            "summary": f"Re-solving gives target buckling ratio {plan_b['target']['buckling_ratio']} and max member stress {plan_b['max_stress_mpa']} MPa.",
            "reason": "This option changes one member section in the teaching model and exposes the new force distribution.",
            "evidence": [
                f"Baseline target ratio: {baseline['target']['buckling_ratio']}.",
                f"Plan B target ratio: {plan_b['target']['buckling_ratio']}.",
                f"Plan B maximum displacement: {plan_b['max_displacement_mm']} mm.",
            ],
            "risks": ["The model omits gusset plates, bolt group checks, code factors, buckling imperfections, and 3D out-of-plane stability."],
            "evidence_status": "calculated in the stated 2D ideal-truss model; not a design approval", "estimated_scope": "one member section; connections require separate design",
        },
        {
            "id": "plan_c", "label": "C", "name": "Replace all members with the same HSS", "recommended": False,
            "summary": f"The idealized model reports maximum buckling ratio {plan_c['max_buckling_ratio']}.",
            "reason": "A larger member set changes the complete structure and is shown for comparison, not as a recommendation.",
            "evidence": [f"Maximum member stress: {plan_c['max_stress_mpa']} MPa."],
            "risks": ["Weight, connections, fabrication, fatigue, and boundary conditions need independent checks."],
            "evidence_status": "calculated in the stated 2D ideal-truss model", "estimated_scope": "full truss member replacement",
        },
    ]
    edges = [{"source": a, "target": b, "label": "axial member", "status": "fault" if label == target_label else "stable"} for a, b, label in baseline["members"]]
    return {
        "mode": "civil_mech",
        "metrics": {
            "load_total_kn": load_total_kn, "bay_count": 5, "node_count": len(nodes), "member_count": len(baseline["members"]),
            "target_member": target_label,
            "baseline_target_buckling_ratio": baseline["target"]["buckling_ratio"],
            "baseline_max_stress_mpa": baseline["max_stress_mpa"],
            "baseline_max_displacement_mm": baseline["max_displacement_mm"],
            "safety_factor_euler": round(1 / max(baseline["target"]["buckling_ratio"], 1e-9), 3),
            "assumption_note": f"2D, pin-jointed, linear elastic axial-member model; E=200 GPa, ideal supports, {load_total_kn:g} kN total split evenly over five upper joints, K=1 for Euler buckling. Geometry is the fixed five-panel teaching truss.",
        },
        "findings": ["member_euler_buckling_check", "member_axial_stress_check"],
        "member_results": baseline["member_results"],
        "system_graph": {"nodes": nodes, "edges": edges, "faults": [target_label], "patches": ["replace target member section and re-solve"], "evidence_note": "Numerical result for this idealized 2D fixture; no connection or code checks."},
        "candidate_plans": plans,
    }

