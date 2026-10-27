"""Template-driven project brief helper. No language model or universal diagnosis is claimed."""

import re


KEYWORD_LENSES = {
    "ece": ("electronics", ("circuit", "sensor", "pcb", "voltage", "battery", "iot", "embedded")),
    "civil": ("civil / structural", ("bridge", "truss", "building", "structure", "concrete", "load")),
    "mechanical": ("mechanical / robotics", ("robot", "drone", "motor", "mechanical", "actuator")),
    "cse": ("computer science / software", ("api", "app", "website", "software", "database", "ai", "model", "code")),
}


def classify(raw_input: str, requested_lens: str) -> tuple[str, str]:
    if requested_lens != "auto":
        names = {"cse": "computer science / software", "ece": "electronics / IoT", "civil": "civil / structural", "mechanical": "mechanical / robotics", "all_department_dt": "cross-department design technology"}
        return requested_lens, names.get(requested_lens, "cross-department design technology")
    text = raw_input.casefold()
    counts = {key: sum(text.count(word) for word in words) for key, (_, words) in KEYWORD_LENSES.items()}
    selected = max(counts, key=counts.get) if max(counts.values(), default=0) else "cse"
    return selected, KEYWORD_LENSES[selected][0]


def analyze_idea(title: str, raw_input: str, department_lens: str = "auto") -> dict:
    lens_key, lens_name = classify(raw_input, department_lens)
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9_-]*", raw_input)
    compact = " ".join(words[:18]) or "your project"
    core_label = (title.strip() or "Project")[:52]
    layers = ["experience", "product services", "intelligence / deterministic workflow", "runtime / operations"]
    descriptions = [
        "Who uses the project, what they submit, and how they know the result is useful.",
        "The API, validation, ownership, persistence, and stable errors needed for the user flow.",
        "Keep hard rules deterministic; label model suggestions and validate them before saving.",
        "Set resource limits, secrets, observability, recovery, and a deployment target only when known.",
    ]
    nodes = []
    for index, (layer, description) in enumerate(zip(layers, descriptions)):
        nodes.append({
            "id": f"layer-{index}", "label": layer.title(), "layer": layer.split(" ")[0],
            "kind": "module", "status": "proposed", "position": [math_x(index), 2.1 - index * 1.35, 0],
            "facts": {"description": description},
        })
    edges = [{"source": f"layer-{i}", "target": f"layer-{i+1}", "label": "contract"} for i in range(3)]
    candidate_plans = [
        {"id": "plan_a", "label": "A", "name": "Start with the obvious", "recommended": False,
         "summary": "Build a narrow first version and explicitly list what it cannot yet prove.",
         "reason": "This is quick to demonstrate, but can miss evidence or user-specific constraints.",
         "evidence": ["Template suggestion based on the supplied words."], "risks": ["May overfit to a generic app pattern."], "evidence_status": "heuristic draft", "estimated_scope": "small"},
        {"id": "plan_b", "label": "B", "name": "Verify the highest-risk assumption", "recommended": True,
         "summary": "Choose one measurable failure mode and validate it with a deterministic check or domain expert.",
         "reason": "A small proof tied to real inputs is more useful than a broad architecture with no evidence.",
         "evidence": [f"Input terms considered: {compact}.", f"Detected lens: {lens_name} (keyword heuristic)."], "risks": ["Confirm this lens; keyword classification can be wrong."], "evidence_status": "heuristic draft; human review needed", "estimated_scope": "one vertical slice"},
        {"id": "plan_c", "label": "C", "name": "Expand into a full system", "recommended": False,
         "summary": "Add integrations and cross-domain modules after the first risk is measured.",
         "reason": "Broader scope adds maintenance, security, and evidence requirements.",
         "evidence": ["No user research, integration inventory, or scale targets were supplied."], "risks": ["Large build before validating the core use case."], "evidence_status": "not evaluated", "estimated_scope": "broad"},
    ]
    return {
        "mode": "custom_upskiller", "title": core_label, "template_only": True,
        "input_summary": compact,
        "original_weaknesses": ["The prompt does not yet specify a primary actor, measurable success condition, or operational boundary."],
        "lexicon_4_layer_spec": [{"layer": layer, "description": description} for layer, description in zip(layers, descriptions)],
        "three_winning_angles": [
            "Make the first input frictionless and preserve the source that supports each result.",
            "Expose the most consequential dependency, constraint, or failure path with evidence.",
            "Let the user compare a minimal verified change with a broader option before committing.",
        ],
        "cross_department_dt_matrix": [
            {"department": "CSE / IT", "bridge": "Data model, APIs, deterministic rules, and observability."},
            {"department": "ECE / EEE", "bridge": "Sensors, signals, power, and embedded constraints when relevant."},
            {"department": "Civil", "bridge": "Loads, geometry, safety factors, and construction assumptions when relevant."},
            {"department": "Mechanical", "bridge": "Materials, motion, thermal limits, and maintainability when relevant."},
        ],
        "system_graph": {"nodes": nodes, "edges": edges, "faults": [], "patches": ["confirm actor, goal, and evidence"], "evidence_note": "Graph nodes are a template scaffold, not discovered modules."},
        "candidate_plans": candidate_plans,
        "assumptions": ["No model is connected; recommendations are generated from a deterministic template.", "The selected lens is a keyword heuristic and must be confirmed."],
    }


def math_x(index: int) -> float:
    return [-2.2, -0.75, 0.75, 2.2][index]

