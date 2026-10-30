import json

from app.engines.cs_repo_engine import analyze_manifest, fetch_github_package_json
from app.engines.civil_truss_engine import analyze_truss
from app.engines.ece_circuit_engine import analyze_circuit
from app.engines.health_score import health_score
from app.engines.upskiller_engine import analyze_idea


def test_lodash_advisory_boundaries_are_exact_and_ranges_stay_uncertain():
    def findings(version: str) -> set[str]:
        raw = json.dumps({"dependencies": {"lodash": version}})
        return {item["id"] for item in analyze_manifest(raw)["findings"]}

    assert findings("4.17.20") == {"CVE-2021-23337", "CVE-2025-13465", "CVE-2026-4800"}
    assert findings("4.17.22") == {"CVE-2025-13465", "CVE-2026-4800"}
    assert findings("4.17.23") == {"CVE-2026-4800"}
    assert findings("4.17.24") == set()
    assert findings("4.18.0") == set()
    result = analyze_manifest('{"dependencies":{"lodash":"^4.17.20"}}')
    assert result["findings"] == []
    assert result["uncertainty"]


def test_prerelease_versions_are_explicitly_uncertain():
    result = analyze_manifest('{"dependencies":{"lodash":"4.18.0-rc.1"}}')
    assert result["uncertainty"]
    assert "Pre-release" in result["uncertainty"][0]["message"]


def test_github_manifest_fetch_rejects_non_github_and_redirect_inputs():
    for url in (
        "http://github.com/owner/repo",
        "https://github.com.evil.example/owner/repo",
        "https://github.com/owner/repo/tree/main",
        "https://github.com/owner/repo?redirect=https://example.com",
    ):
        try:
            fetch_github_package_json(url)
        except ValueError:
            continue
        raise AssertionError(f"Expected the URL to be rejected: {url}")


def test_domain_engines_return_labeled_teaching_results():
    circuit = analyze_circuit()
    assert circuit["metrics"]["linear_loss_w"] == 2.45
    assert "not suitable" in circuit["metrics"]["mcp1702_check"]

    truss = analyze_truss()
    assert truss["metrics"]["member_count"] == len(truss["member_results"])
    assert "no connection" in truss["system_graph"]["evidence_note"].lower()
    plan_b = next(plan for plan in truss["candidate_plans"] if plan["id"] == "plan_b")
    assert plan_b["scenario"]["max_stress_mpa"] >= 0
    assert plan_b["scenario"]["target_buckling_ratio"] >= 0

    idea = analyze_idea("Bridge monitor", "A bridge sensor with battery telemetry")
    assert idea["template_only"] is True
    assert len(idea["lexicon_4_layer_spec"]) == 4


def test_health_scores_are_domain_specific_deterministic_and_bounded():
    software = health_score("cs_repo", {"findings": [{"id": "ADV-1"}], "repository_scan": {"resolved_package_count": 0}})
    assert software["score"] == 60
    assert len(software["factors"]) == 2
    assert "not a safety" in software["method"]

    electronics = health_score("ece_circuit", {"metrics": {"current_ma": 24}})
    assert electronics["score"] == 70
    truss = health_score("civil_mech", {"metrics": {"baseline_target_buckling_ratio": 1.5, "baseline_max_stress_mpa": 260}})
    assert truss["score"] == 45
    beam = health_score("mechanical_beam", {"metrics": {"max_bending_stress_mpa": 800, "max_deflection_mm": 500}})
    assert beam["score"] == 20
    assert health_score("custom_upskiller", {})["score"] == 80
