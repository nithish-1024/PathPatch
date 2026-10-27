from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.db.models import ProjectAnalysisRun, User
from app.engines.cs_repo_engine import analyze_manifest, demo_manifest
from app.engines.ece_circuit_engine import analyze_circuit
from app.engines.civil_truss_engine import analyze_truss
from app.engines.mechanical_beam_engine import analyze_beam
from app.engines.upskiller_engine import analyze_idea


DEMO_EMAIL = "demo@patchpath.ai"
DEMO_PASSWORD = "patchpath2026"


def seed_demo_data(db: Session) -> None:
    demo_user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if demo_user is None:
        demo_user = User(email=DEMO_EMAIL, full_name="DT Judge Evaluator", password_hash=hash_password(DEMO_PASSWORD))
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    existing = {row.mode for row in db.query(ProjectAnalysisRun).filter(ProjectAnalysisRun.user_id == demo_user.id).all()}
    cs = analyze_manifest(demo_manifest(), "Lodash dependency demo")
    if "cs_repo" not in existing:
        db.add(ProjectAnalysisRun(
            user_id=demo_user.id, mode="cs_repo", title="Lodash · dependency remediation",
            raw_input=demo_manifest(), selected_plan_id="plan_b", system_graph_json=cs["system_graph"],
            candidate_plans_json=cs["candidate_plans"], upskilled_blueprint_json=None, analysis_json=cs,
        ))
    if "ece_circuit" not in existing:
        ece = analyze_circuit()
        db.add(ProjectAnalysisRun(
            user_id=demo_user.id, mode="ece_circuit", title="IoT power rail · 12 V to 5 V",
            raw_input="Vin=12 V; Vout=5 V; Iload=0.35 A; Tambient=30 °C; assumed RθJA=36 °C/W",
            selected_plan_id="plan_b", system_graph_json=ece["system_graph"], candidate_plans_json=ece["candidate_plans"],
            upskilled_blueprint_json=None, analysis_json=ece,
        ))
    else:
        # Backfill legacy demo rows by user and mode. Matching the display title
        # is brittle across DB encodings and title edits; the demo account has
        # one seeded electronics specimen, and user-created rows are untouched.
        samples = db.query(ProjectAnalysisRun).filter(
            ProjectAnalysisRun.user_id == demo_user.id,
            ProjectAnalysisRun.mode == "ece_circuit",
        ).all()
        breadboard = analyze_circuit()["breadboard"]
        for sample in samples:
            if not (sample.analysis_json or {}).get("breadboard"):
                updated = dict(sample.analysis_json or {})
                updated["breadboard"] = breadboard
                sample.analysis_json = updated
    if "civil_mech" not in existing:
        civil = analyze_truss()
        db.add(ProjectAnalysisRun(
            user_id=demo_user.id, mode="civil_mech", title="Warren truss · five-panel teaching model",
            raw_input="2D pin-jointed truss; 180 kN total load; ideal steel material and supports",
            selected_plan_id="plan_b", system_graph_json=civil["system_graph"], candidate_plans_json=civil["candidate_plans"],
            upskilled_blueprint_json=None, analysis_json=civil,
        ))
    if "mechanical_beam" not in existing:
        beam_input = "Simply supported beam, span 2 m, center load 1 kN, width 50 mm, depth 100 mm, E 200 GPa"
        beam = analyze_beam("Center-loaded beam · section study", beam_input)
        db.add(ProjectAnalysisRun(
            user_id=demo_user.id, mode="mechanical_beam", title="Center-loaded beam · section study",
            raw_input=beam_input, selected_plan_id="plan_b", system_graph_json=beam["system_graph"],
            candidate_plans_json=beam["candidate_plans"], upskilled_blueprint_json=None, analysis_json=beam,
        ))
    if "custom_upskiller" not in existing:
        idea = analyze_idea("Smart solar microgrid controller", "Build a smart solar microgrid controller", "auto")
        db.add(ProjectAnalysisRun(
            user_id=demo_user.id, mode="custom_upskiller", title=idea["title"],
            raw_input="Build a smart solar microgrid controller", selected_plan_id="plan_b",
            system_graph_json=idea["system_graph"], candidate_plans_json=idea["candidate_plans"],
            upskilled_blueprint_json=idea, analysis_json=idea,
        ))
    db.commit()

