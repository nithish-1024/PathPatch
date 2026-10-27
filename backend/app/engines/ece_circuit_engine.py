"""Small educational power-regulator model. It is not a board sign-off tool."""

import math
import re


TRACO_SOURCE = "https://www.tracopower.com/sites/default/files/products/datasheets/tsr1_datasheet.pdf"
MICROCHIP_SOURCE = "https://ww1.microchip.com/downloads/aemDocuments/documents/APID/ProductDocuments/DataSheets/MCP1702-Data-Sheet-DS20002008.pdf"


def analyze_circuit() -> dict:
    vin, vout, load, ambient, assumed_rth = 12.0, 5.0, 0.35, 30.0, 36.0
    linear_loss = (vin - vout) * load
    linear_tj = ambient + linear_loss * assumed_rth
    switcher_efficiency = 0.94  # Datasheet typical at minimum input; not a 12 V measured point.
    output_power = vout * load
    switcher_loss_estimate = output_power * (1 / switcher_efficiency - 1)

    nodes = [
        {"id": "vin", "label": "12 V input", "layer": "runtime", "kind": "connector", "status": "stable", "position": [-2.2, 0, 0]},
        {"id": "u1", "label": "U1 · LM7805", "layer": "deterministic", "kind": "regulator", "status": "fault", "position": [-1.2, 0.4, 0]},
        {"id": "cout", "label": "Cout", "layer": "product", "kind": "capacitor", "status": "stable", "position": [0, 0.3, 0]},
        {"id": "mcu", "label": "Sensor MCU", "layer": "experience", "kind": "load", "status": "stable", "position": [1.4, 0.2, 0]},
    ]
    edges = [
        {"source": "vin", "target": "u1", "label": "12 V", "status": "fault"},
        {"source": "u1", "target": "cout", "label": "5 V rail", "status": "fault"},
        {"source": "cout", "target": "mcu", "label": "load", "status": "stable"},
    ]
    plans = [
        {
            "id": "plan_a", "label": "A", "name": "Swap to another linear regulator", "recommended": False,
            "summary": f"A linear regulator still dissipates about {linear_loss:.2f} W at these input/output values.",
            "reason": "Changing LDO part numbers does not remove the (Vin − Vout) × I loss.",
            "evidence": [f"P = (12 − 5) × 0.35 = {linear_loss:.2f} W"],
            "risks": ["A separate thermal design is still required.", "Output-capacitor stability depends on the exact regulator datasheet and capacitor."],
            "evidence_status": "equation-backed; junction temperature is assumption-based",
            "estimated_scope": "component change; thermal performance unverified",
        },
        {
            "id": "plan_b", "label": "B", "name": "Use a 1 A step-down module", "recommended": True,
            "summary": f"The selected TSR 1-2450 is rated for 5 V, 1 A, and a 6.5–36 V input; the example load is 0.35 A.",
            "reason": "This is a switching converter, so it avoids dissipating the full 7 V drop as heat in a linear pass element.",
            "evidence": [
                "Input/output/current ratings are from the vendor datasheet.",
                f"At 94% efficiency, illustrative module loss is {switcher_loss_estimate:.2f} W; the quoted efficiency is a typical minimum-input point, not a 12 V measurement.",
            ],
            "risks": ["Verify layout, transient response, ripple, EMI, temperature, and actual load profile on the target PCB."],
            "evidence_status": "datasheet-backed rating; loss estimate uses a stated efficiency assumption",
            "estimated_scope": "regulator footprint and power-stage validation",
            "source": TRACO_SOURCE,
        },
        {
            "id": "plan_c", "label": "C", "name": "Design a discrete buck stage", "recommended": False,
            "summary": "A discrete converter may reduce size or cost at volume, but no controller or layout data was supplied.",
            "reason": "The inductor, switching frequency, loop compensation, and PCB layout determine the result.",
            "evidence": ["No discrete power-stage simulation was run."],
            "risks": ["Requires component selection, stability analysis, and bench validation."],
            "evidence_status": "not evaluated", "estimated_scope": "broad redesign",
        },
    ]
    return {
        "mode": "ece_circuit",
        "metrics": {
            "vin_v": vin, "vout_v": vout, "load_a": load, "ambient_c": ambient,
            "linear_loss_w": round(linear_loss, 3),
            "linear_junction_estimate_c": round(linear_tj, 1),
            "assumed_rtheta_ja_c_per_w": assumed_rth,
            "assumption_note": "RθJA = 36 °C/W is an illustrative input from the learning brief; package, copper, airflow, and heatsink details change it.",
            "switcher_efficiency_assumption": switcher_efficiency,
            "switcher_loss_estimate_w": round(switcher_loss_estimate, 3),
            "mcp1702_max_continuous_a": 0.25,
            "mcp1702_check": "The MCP1702 is not suitable for this 0.35 A continuous example load; its rated maximum is 0.25 A.",
        },
        "findings": ["linear_regulator_thermal_loss", "load_vs_mcp1702_rating"],
        "system_graph": {"nodes": nodes, "edges": edges, "faults": ["u1"], "patches": ["replace linear regulator with rated buck module"], "evidence_note": "A schematic-level illustration; it does not model the original PCB or certify thermal behavior."},
        "breadboard": _regulator_breadboard(),
        "candidate_plans": plans,
    }


def _regulator_breadboard() -> dict:
    """An explicitly illustrative breadboard layout for the seeded regulator example."""
    return {
        "template": "regulator-demo",
        "evidence_note": "Layout positions are an explanatory breadboard view. The example load and regulator were not bench-tested; breadboard current ratings are not checked.",
        "components": [
            {"id": "vin", "label": "12 V input", "kind": "supply", "value": "external source", "position": [-1.05, -1.25], "pins": [{"label": "+", "position": [-1.42, -1.236]}, {"label": "−", "position": [-1.32, -1.236]}]},
            {"id": "u1", "label": "U1 · LM7805", "kind": "regulator", "value": "12 V → 5 V", "position": [0, 0.006], "pins": [{"label": "IN", "position": [-0.19, -0.048]}, {"label": "GND", "position": [0.19, -0.048]}, {"label": "OUT", "position": [0.19, 0.06]}]},
            {"id": "cout", "label": "Cout", "kind": "capacitor", "value": "value unspecified", "position": [0.75, 0.492], "pins": [{"label": "+", "position": [0.91, 0.492]}, {"label": "−", "position": [0.91, 0.6]}]},
            {"id": "mcu", "label": "Sensor MCU", "kind": "microcontroller", "value": "0.35 A load model", "position": [1.02, -1.128], "pins": [{"label": "VCC", "position": [0.91, -1.128]}, {"label": "GND", "position": [0.91, -1.02]}]},
        ],
        "wires": [
            {"id": "vin-u1", "label": "VIN", "color": "#e2534b", "points": [[-1.42, -1.236], [-1.42, -0.72], [-0.19, -0.72], [-0.19, -0.048]]},
            {"id": "ground", "label": "GND", "color": "#5b83ce", "points": [[-1.32, -1.236], [-1.32, 1.7], [1.32, 1.7], [1.32, -1.02], [0.91, -1.02], [0.91, 0.6], [0.19, 0.6], [0.19, -0.048]]},
            {"id": "u1-cout", "label": "5 V", "color": "#62bd8e", "points": [[0.19, 0.06], [0.91, 0.06], [0.91, 0.492]]},
            {"id": "cout-mcu", "label": "5 V rail", "color": "#62bd8e", "points": [[0.91, 0.492], [1.18, 0.492], [1.18, -1.128], [0.91, -1.128]]},
        ],
    }


def analyze_circuit_idea(title: str, raw_input: str) -> dict:
    """Build a small, deterministic breadboard draft for supported starter circuits."""
    text = raw_input.casefold()
    if ("esp32" in text or "arduino" in text) and ("dht22" in text or "temperature sensor" in text or "temp sensor" in text):
        board = {
            "template": "esp32-dht22",
            "evidence_note": "Supported starter template: ESP32 + DHT22. GPIO4 and 3.3 V are defaults because the prompt did not specify pins or supply details. Verify the exact breakout board and pull-up requirements.",
            "components": [
                {"id": "u1", "label": "ESP32 DevKit", "kind": "microcontroller", "value": "3.3 V logic", "position": [0, -0.82], "pins": [{"label": "3V3", "position": [-0.55, -0.372]}, {"label": "GPIO4", "position": [-0.19, -0.264]}, {"label": "GND", "position": [0.19, -0.372]}]},
                {"id": "b1", "label": "DHT22", "kind": "sensor", "value": "temperature / humidity", "position": [0.73, -0.372], "pins": [{"label": "VCC", "position": [0.37, -0.48]}, {"label": "DATA", "position": [0.55, -0.372]}, {"label": "GND", "position": [0.73, -0.264]}]},
                {"id": "r1", "label": "R1 · 10 kΩ", "kind": "resistor", "value": "data pull-up", "position": [0, -0.372], "pins": [{"label": "3V3", "position": [-0.19, -0.372]}, {"label": "DATA", "position": [0.19, -0.372]}]},
                {"id": "p1", "label": "3.3 V", "kind": "supply", "value": "ESP32 rail", "position": [-1.15, -1.128], "pins": [{"label": "+", "position": [-1.42, -1.128]}, {"label": "−", "position": [-1.32, -1.128]}]},
            ],
            "wires": [
                {"id": "vcc", "label": "3V3", "color": "#e2534b", "points": [[-1.42, -1.128], [-1.42, -0.372], [-0.55, -0.372]]},
                {"id": "gnd", "label": "GND", "color": "#5b83ce", "points": [[-1.32, -1.128], [-1.32, 1.7], [1.32, 1.7], [1.32, -0.264], [0.73, -0.264]]},
                {"id": "data", "label": "GPIO4 / DATA", "color": "#e2b451", "points": [[-0.19, -0.264], [-0.19, -0.05], [0.55, -0.05], [0.55, -0.372]]},
                {"id": "sensor-vcc", "label": "sensor VCC", "color": "#e2534b", "points": [[-0.55, -0.372], [-0.55, -0.48], [0.37, -0.48]]},
            ],
        }
        nodes = [
            {"id": "u1", "label": "ESP32 DevKit", "layer": "product", "kind": "microcontroller", "status": "stable", "position": [-1, 0.1, 0]},
            {"id": "b1", "label": "DHT22", "layer": "experience", "kind": "sensor", "status": "stable", "position": [1, 0.1, 0]},
            {"id": "r1", "label": "10 kΩ pull-up", "layer": "deterministic", "kind": "resistor", "status": "assumption", "position": [0, 0.5, 0.5]},
        ]
        edges = [
            {"source": "u1", "target": "b1", "label": "GPIO4 / DATA", "status": "stable"},
            {"source": "u1", "target": "b1", "label": "3V3 + GND", "status": "stable"},
            {"source": "r1", "target": "b1", "label": "data pull-up", "status": "assumption"},
        ]
        metrics = {"supply_v": 3.3, "data_pin": "GPIO4", "pullup_ohm": 10000, "assumption_note": board["evidence_note"]}
        plans = _idea_plans("Use 3.3 V, GND, GPIO4 data, and a 10 kΩ pull-up as a starter layout.", ["Exact DHT22 breakout and onboard pull-up were not identified.", "Confirm ESP32 pin mapping and board power before wiring."], "Supported ESP32 + DHT22 template; not electrically simulated.")
        return _idea_result(title, raw_input, nodes, edges, board, metrics, plans, ["ESP32", "DHT22", "10 kΩ pull-up"])

    if "led" in text:
        voltage_match = re.search(r"(?<![\w.])(\d+(?:\.\d+)?)\s*v(?:olt)?s?\b", text)
        supply_v = float(voltage_match.group(1)) if voltage_match else 5.0
        resistor_match = re.search(r"(\d+(?:\.\d+)?)\s*(k)?\s*(?:ohms?|Ω)(?!\w)", text)
        resistor_ohm = float(resistor_match.group(1)) * (1000 if resistor_match and resistor_match.group(2) else 1) if resistor_match else max(220.0, math.ceil((supply_v - 2.0) / 0.015 / 10) * 10)
        led_v = 2.0
        led_current = max(0.0, (supply_v - led_v) / resistor_ohm)
        resistor_power = led_current * led_current * resistor_ohm
        note = f"Starter assumptions: {supply_v:g} V source, red LED Vf = 2.0 V, {resistor_ohm:g} Ω series resistor. Current is calculated with Ohm's law; LED forward voltage is an assumption."
        board = {
            "template": "led-series",
            "evidence_note": note + " Check the actual LED datasheet and supply before connecting.",
            "components": [
                {"id": "p1", "label": f"{supply_v:g} V supply", "kind": "supply", "value": "assumed source", "position": [-1.18, -1.128], "pins": [{"label": "+", "position": [-1.42, -1.128]}, {"label": "−", "position": [-1.32, -1.128]}]},
                {"id": "r1", "label": f"R1 · {resistor_ohm:g} Ω", "kind": "resistor", "value": "series current limit", "position": [0, 0.06], "pins": [{"label": "from +V", "position": [-0.19, 0.06]}, {"label": "to LED", "position": [0.19, 0.06]}]},
                {"id": "d1", "label": "D1 · red LED", "kind": "led", "value": "Vf assumed 2.0 V", "position": [0.73, 0.006], "pins": [{"label": "anode", "position": [0.55, 0.06]}, {"label": "cathode", "position": [0.55, 0.168]}]},
            ],
            "wires": [
                {"id": "positive", "label": "+V", "color": "#e2534b", "points": [[-1.42, -1.128], [-1.42, -0.48], [-0.55, -0.48], [-0.55, 0.06], [-0.19, 0.06]]},
                {"id": "return", "label": "GND / 0 V", "color": "#5b83ce", "points": [[0.55, 0.168], [1.32, 0.168], [1.32, 1.7], [-1.32, 1.7], [-1.32, -1.128]]},
            ],
        }
        nodes = [
            {"id": "p1", "label": f"{supply_v:g} V supply", "layer": "runtime", "kind": "supply", "status": "assumption", "position": [-1, 0.1, 0]},
            {"id": "r1", "label": f"{resistor_ohm:g} Ω resistor", "layer": "deterministic", "kind": "resistor", "status": "stable", "position": [0, 0.1, 0]},
            {"id": "d1", "label": "Red LED", "layer": "experience", "kind": "led", "status": "stable", "position": [1, 0.1, 0]},
        ]
        edges = [
            {"source": "p1", "target": "r1", "label": "+V through resistor", "status": "stable"},
            {"source": "r1", "target": "d1", "label": "series current", "status": "stable"},
            {"source": "d1", "target": "p1", "label": "return to GND", "status": "stable"},
        ]
        metrics = {"supply_v": supply_v, "led_forward_voltage_assumption_v": led_v, "resistor_ohm": resistor_ohm, "current_ma": round(led_current * 1000, 2), "resistor_power_w": round(resistor_power, 4), "assumption_note": note}
        risks = ["Confirm the LED polarity and actual forward-voltage/current limits.", "Supply current and breadboard contact ratings were not checked."]
        if led_current > 0.020:
            risks.insert(0, "Calculated LED current exceeds 20 mA; increase the resistor or confirm the part rating.")
        plans = _idea_plans("Put a current-limiting resistor in series with the LED and verify the part ratings.", risks, "Ohm's-law estimate with stated assumptions; no circuit simulator or bench measurement was run.")
        return _idea_result(title, raw_input, nodes, edges, board, metrics, plans, [f"{supply_v:g} V supply", f"{resistor_ohm:g} Ω resistor", "red LED"])

    raise ValueError("This breadboard builder currently supports an LED + series resistor, or an ESP32 + DHT22 temperature sensor. Describe those parts and the supply voltage, or use the regulator sample.")


def _idea_plans(summary: str, risks: list[str], evidence_status: str) -> list[dict]:
    return [
        {"id": "plan_a", "label": "A", "name": "Use the prompt as-is", "recommended": False, "summary": "Keep only the connections explicitly requested.", "reason": "Missing part values and pin details stay unresolved.", "evidence": ["No hidden component values are inferred as verified facts."], "risks": risks, "evidence_status": "draft; incomplete inputs remain", "estimated_scope": "review every connection"},
        {"id": "plan_b", "label": "B", "name": "Add the smallest safety check", "recommended": True, "summary": summary, "reason": "The layout exposes the assumptions next to the component and connection view.", "evidence": [evidence_status], "risks": risks, "evidence_status": evidence_status, "estimated_scope": "starter circuit only"},
        {"id": "plan_c", "label": "C", "name": "Expand after validating the prototype", "recommended": False, "summary": "Add protection, enclosure, and load details after testing the starter circuit.", "reason": "Those additions depend on operating conditions that were not supplied.", "evidence": ["No measured load profile, enclosure, or environment was supplied."], "risks": risks, "evidence_status": "not evaluated", "estimated_scope": "broader redesign"},
    ]


def _idea_result(title: str, raw_input: str, nodes: list[dict], edges: list[dict], board: dict, metrics: dict, plans: list[dict], parts: list[str]) -> dict:
    return {
        "mode": "ece_circuit", "title": title[:52], "metrics": metrics,
        "findings": ["assumption_based_breadboard_draft"],
        "assumptions": [board["evidence_note"]],
        "breadboard": board,
        "system_graph": {"nodes": nodes, "edges": edges, "faults": [], "patches": [plans[1]["summary"]], "evidence_note": board["evidence_note"]},
        "candidate_plans": plans,
        "evidence_note": f"Generated from the supported part template ({', '.join(parts)}). {board['evidence_note']}",
    }

