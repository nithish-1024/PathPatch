import json
import pytest
from fastapi.testclient import TestClient

from app.auth.security import create_access_token
from app.main import app

client = TestClient(app)


def test_mcp_initialize():
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0"},
        },
    }
    response = client.post("/api/v1/mcp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["jsonrpc"] == "2.0"
    assert data["id"] == 1
    assert data["result"]["protocolVersion"] == "2025-03-26"
    assert "tools" in data["result"]["capabilities"]
    assert "resources" in data["result"]["capabilities"]
    assert "prompts" in data["result"]["capabilities"]


def test_mcp_tools_list():
    payload = {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
    response = client.post("/api/v1/mcp", json=payload)
    assert response.status_code == 200
    data = response.json()
    tools = data["result"]["tools"]
    tool_names = [t["name"] for t in tools]
    assert "verify_physics_solver" in tool_names
    assert "schedule_study_session" in tool_names


def test_mcp_verify_physics_solver_ece_thermal():
    payload = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "verify_physics_solver",
            "arguments": {
                "domain": "ece_circuit",
                "circuit_params": {
                    "vin": 12.0,
                    "vout": 5.0,
                    "load_a": 0.35,
                    "ambient_c": 30.0,
                    "assumed_rth": 36.0,
                },
            },
        },
    }
    response = client.post("/api/v1/mcp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["result"]["isError"] is False
    content = json.loads(data["result"]["content"][0]["text"])
    assert "mathematical_proof" in content
    assert content["p_diss_w"] == 2.45
    assert content["thermal_fail"] is False  # 30 + 2.45*36 = 118.2 < 125


def test_mcp_verify_physics_solver_civil_truss():
    payload = {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "verify_physics_solver",
            "arguments": {
                "domain": "civil_mech",
                "truss_params": {
                    "load_total_kn": 180.0,
                    "span_m": 10.0,
                },
            },
        },
    }
    response = client.post("/api/v1/mcp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["result"]["isError"] is False
    content = json.loads(data["result"]["content"][0]["text"])
    assert "mathematical_proof" in content
    assert "critical_member" in content
    assert "buckling_ratio" in content


def test_mcp_resources_list_and_read():
    # 1. list
    payload = {"jsonrpc": "2.0", "id": 5, "method": "resources/list", "params": {}}
    res = client.post("/api/v1/mcp", json=payload)
    assert res.status_code == 200
    resources = res.json()["result"]["resources"]
    uris = [r["uri"] for r in resources]
    assert "academic://timetable.ics" in uris
    assert "academic://aether_notes.md" in uris

    # 2. read timetable
    read_payload = {
        "jsonrpc": "2.0",
        "id": 6,
        "method": "resources/read",
        "params": {"uri": "academic://timetable.ics"},
    }
    res = client.post("/api/v1/mcp", json=read_payload)
    assert res.status_code == 200
    contents = res.json()["result"]["contents"][0]
    assert "VCALENDAR" in contents["text"]
    assert "VNRVJIET" in contents["text"]

    # 3. read notes
    notes_payload = {
        "jsonrpc": "2.0",
        "id": 7,
        "method": "resources/read",
        "params": {"uri": "academic://aether_notes.md"},
    }
    res = client.post("/api/v1/mcp", json=notes_payload)
    assert res.status_code == 200
    assert "Aether Lab Journal" in res.json()["result"]["contents"][0]["text"]


def test_mcp_prompts_list_and_get():
    # 1. list
    payload = {"jsonrpc": "2.0", "id": 8, "method": "prompts/list", "params": {}}
    res = client.post("/api/v1/mcp", json=payload)
    assert res.status_code == 200
    prompts = res.json()["result"]["prompts"]
    assert any(p["name"] == "socratic_lab_troubleshoot" for p in prompts)

    # 2. get
    get_payload = {
        "jsonrpc": "2.0",
        "id": 9,
        "method": "prompts/get",
        "params": {
            "name": "socratic_lab_troubleshoot",
            "arguments": {
                "domain": "ece_circuit",
                "observed_symptom": "LM7805 overheating and dropping output to 1.8V",
                "student_hypothesis": "Maybe filter capacitor ESR is too high",
            },
        },
    }
    res = client.post("/api/v1/mcp", json=get_payload)
    assert res.status_code == 200
    messages = res.json()["result"]["messages"]
    assert len(messages) == 2
    assert "Socratic Personal Academic Mentor" in messages[0]["content"]["text"]


def test_mcp_schedule_study_session():
    payload = {
        "jsonrpc": "2.0",
        "id": 10,
        "method": "tools/call",
        "params": {
            "name": "schedule_study_session",
            "arguments": {
                "topic": "Thermal Drift and Heat Sinking in Linear Regulators",
                "course_code": "25ES1EC101",
                "duration_minutes": 45,
                "preferred_slot": "Tuesday 16:30",
                "peer_collaborator_roll_nos": ["22071A04J9", "22071A04K2"],
            },
        },
    }
    res = client.post("/api/v1/mcp", json=payload)
    assert res.status_code == 200
    result = res.json()["result"]
    assert result["isError"] is False
    content = json.loads(result["content"][0]["text"])
    assert content["status"] == "CONFIRMED_CALENDAR_SLOT"
    assert content["course_code"] == "25ES1EC101"
    assert "REM-" in content["event_id"]


def test_mcp_exam_mode_locking_interception():
    # Test that Exam Mode locks tool execution with error code -32002
    payload = {
        "jsonrpc": "2.0",
        "id": 11,
        "method": "tools/call",
        "params": {
            "name": "verify_physics_solver",
            "arguments": {"domain": "ece_circuit"},
        },
    }
    # Pass Exam Mode Header
    res = client.post("/api/v1/mcp", json=payload, headers={"X-Exam-Mode": "true"})
    assert res.status_code == 200
    data = response_data = res.json()
    assert "error" in response_data
    assert response_data["error"]["code"] == -32002
    assert "Exam Mode Active. AI Copilot Muted." in response_data["error"]["message"]
    assert response_data["error"]["data"]["lock_status"] == "ACTIVE_MUTED"
    assert response_data["error"]["data"]["telemetry_recorded"] is True
