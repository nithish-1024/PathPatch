import asyncio
import json
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.security import COOKIE_SECURE, SESSION_COOKIE, TOKEN_MINUTES, create_access_token, get_current_user, hash_password, verify_password
from app.db.database import Base, SessionLocal, engine, get_db
from app.db.models import ProjectAnalysisRun, SandboxExecutionLog, SimulationExecution, User, utc_now
from app.db.seed import DEMO_EMAIL, DEMO_PASSWORD, seed_demo_data
from app.engines.cs_repo_engine import analyze_manifest, analyze_repository_files, fetch_github_package_json
from app.engines.ece_circuit_engine import analyze_circuit, analyze_circuit_idea
from app.engines.civil_truss_engine import analyze_truss
from app.engines.mechanical_beam_engine import analyze_beam
from app.engines.upskiller_engine import analyze_idea
from app.schemas.contracts import AnalyzeRequest, AuthResponse, LoginRequest, RegisterRequest, RunResponse, SimulationRequest, UserResponse


_simulation_tasks: dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db)
        # A process restart must not leave a job looking active when its in-memory worker is gone.
        db.query(SimulationExecution).filter(SimulationExecution.status.in_(["queued", "running"])).update(
            {"status": "interrupted", "error_message": "The local server restarted before this simulation finished."},
            synchronize_session=False,
        )
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="PatchPath Universal API",
    description="Educational engineering analysis. Submitted source code is never executed.",
    version="0.1.0",
    lifespan=lifespan,
)
allowed_origin = os.getenv("PATCHPATH_FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def _user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, full_name=user.full_name, department=user.department)


def _auth_response(user: User, response: Response) -> AuthResponse:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=create_access_token(user.id),
        max_age=TOKEN_MINUTES * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/api/v1",
    )
    return AuthResponse(user=_user_response(user))


def _run_response(run: ProjectAnalysisRun) -> RunResponse:
    return RunResponse(
        id=run.id, mode=run.mode, title=run.title, raw_input=run.raw_input,
        selected_plan_id=run.selected_plan_id, system_graph_json=run.system_graph_json,
        candidate_plans_json=run.candidate_plans_json, upskilled_blueprint_json=run.upskilled_blueprint_json,
        analysis_json=run.analysis_json or {}, created_at=run.created_at.isoformat(),
    )


def _get_run_for_user(db: Session, run_id: str, user_id: int) -> ProjectAnalysisRun:
    run = db.get(ProjectAnalysisRun, run_id)
    if run is None or run.user_id != user_id:
        raise HTTPException(status_code=404, detail="Analysis run not found.")
    return run


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "patchpath-api"}


@app.post("/api/v1/auth/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = User(email=email, full_name=payload.full_name.strip(), department=payload.department.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return _auth_response(user, response)


@app.post("/api/v1/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return _auth_response(user, response)


@app.post("/api/v1/auth/demo-login", response_model=AuthResponse)
def demo_login(response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user is None:
        user = User(email=DEMO_EMAIL, full_name="DT Judge Evaluator", password_hash=hash_password(DEMO_PASSWORD))
        db.add(user)
        db.commit()
        db.refresh(user)
    return _auth_response(user, response)


@app.post("/api/v1/auth/logout")
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(key=SESSION_COOKIE, path="/api/v1", httponly=True, secure=COOKIE_SECURE, samesite="lax")
    return {"status": "signed_out"}


@app.get("/api/v1/auth/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return _user_response(user)


@app.get("/api/v1/demos/{mode}", response_model=RunResponse)
def get_demo(mode: str, db: Session = Depends(get_db)) -> RunResponse:
    if mode not in {"cs_repo", "ece_circuit", "civil_mech", "mechanical_beam", "custom_upskiller"}:
        raise HTTPException(status_code=404, detail="Unknown demo mode.")
    run = db.query(ProjectAnalysisRun).filter(ProjectAnalysisRun.mode == mode).order_by(ProjectAnalysisRun.created_at.asc()).first()
    if run is None:
        raise HTTPException(status_code=503, detail="Demo data is not available yet.")
    return _run_response(run)


@app.get("/api/v1/runs", response_model=list[RunResponse])
def list_runs(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[RunResponse]:
    rows = db.query(ProjectAnalysisRun).filter(ProjectAnalysisRun.user_id == user.id).order_by(ProjectAnalysisRun.created_at.desc()).limit(100).all()
    return [_run_response(row) for row in rows]


@app.post("/api/v1/upskiller/analyze", response_model=RunResponse, status_code=201)
def create_analysis(payload: AnalyzeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> RunResponse:
    source_url = None
    raw = payload.raw_input.strip()
    if payload.analysis_type == "repository":
        if payload.repository_files is not None:
            try:
                raw, result = analyze_repository_files(payload.repository_files, payload.title)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
        else:
            if raw.casefold().startswith("https://github.com/"):
                try:
                    raw, source_url = fetch_github_package_json(raw)
                except ValueError as exc:
                    raise HTTPException(status_code=422, detail=str(exc)) from exc
            try:
                result = analyze_manifest(raw, payload.title, source_url)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail="Enter package.json JSON or a public GitHub repository URL.") from exc
        blueprint = None
        mode = "cs_repo"
    elif payload.analysis_type == "circuit":
        try:
            result = analyze_circuit_idea(payload.title, raw)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        blueprint = None
        mode = "ece_circuit"
    elif payload.analysis_type == "truss":
        load_match = re.search(r"(?<![\w.])(\d+(?:\.\d+)?)\s*k\s*n\b", raw.casefold())
        if "truss" not in raw.casefold() or not load_match:
            raise HTTPException(status_code=422, detail="The current structures solver accepts a truss description with a total load in kN, for example: 'Warren truss, total load 180 kN'.")
        load_total_kn = float(load_match.group(1))
        if not 1 <= load_total_kn <= 10000:
            raise HTTPException(status_code=422, detail="The teaching truss load must be between 1 and 10,000 kN.")
        result = analyze_truss(load_total_kn)
        blueprint = None
        mode = "civil_mech"
    elif payload.analysis_type == "beam":
        try:
            result = analyze_beam(payload.title, raw)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        blueprint = None
        mode = "mechanical_beam"
    else:
        if raw.casefold().startswith("https://github.com/"):
            try:
                raw, source_url = fetch_github_package_json(raw)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
        if raw.lstrip().startswith("{"):
            try:
                result = analyze_manifest(raw, payload.title, source_url)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            blueprint = None
            mode = "cs_repo"
        else:
            result = analyze_idea(payload.title, raw, payload.department_lens)
            blueprint = result
            mode = "custom_upskiller"

    row = ProjectAnalysisRun(
        user_id=user.id, mode=mode, title=payload.title.strip(), raw_input=raw,
        selected_plan_id="plan_b", system_graph_json=result["system_graph"],
        candidate_plans_json=result["candidate_plans"], upskilled_blueprint_json=blueprint, analysis_json=result,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _run_response(row)


def _simulation_steps(run: ProjectAnalysisRun, plan_id: str) -> list[tuple[str, str]]:
    plan = next((p for p in run.candidate_plans_json if p.get("id") == plan_id), None)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found for this run.")
    analysis = run.analysis_json or {}
    if run.mode == "cs_repo":
        outcome = "Manifest and advisory rules were evaluated. No source code or tests were executed."
        if plan_id == "plan_b":
            outcome += " The proposed version floor is advisory-backed; compatibility still needs project tests."
    elif run.mode == "ece_circuit":
        outcome = "Power and rating rules were evaluated from the fixture assumptions. No board or circuit simulator was run."
    elif run.mode == "civil_mech":
        target = (analysis.get("member_results") or [])
        target = next((m for m in target if m.get("is_target")), {})
        outcome = f"The linear 2D truss solver produced a baseline member check ({target.get('buckling_ratio', 'n/a')} buckling ratio). No connection/code checks were run."
    elif run.mode == "mechanical_beam":
        metrics = analysis.get("metrics", {})
        outcome = f"Closed-form center-load beam estimates: {metrics.get('max_bending_stress_mpa', 'n/a')} MPa bending stress and {metrics.get('max_deflection_mm', 'n/a')} mm center deflection under the saved assumptions. No strength or code check was performed."
    else:
        outcome = "The project brief was processed by a deterministic template; no AI model or external tool was run."
    return [
        ("SCAN", "Read the saved input and record its evidence boundary."),
        ("GENERATE", f"Selected {plan.get('name')}: {plan.get('summary')}"),
        ("TEST_ISOLATED", outcome),
        ("CLASSIFY_FAILURE", "Classified the result as a rules-based teaching simulation, not a verified fix."),
        ("RECOMMEND", f"{plan.get('evidence_status', 'Review the stated assumptions before acting.')}") ,
    ]


async def _run_simulation(execution_id: str) -> None:
    db = SessionLocal()
    try:
        execution = db.get(SimulationExecution, execution_id)
        if execution is None:
            return
        execution.status = "running"
        db.commit()
        run = db.get(ProjectAnalysisRun, execution.run_id)
        if run is None:
            execution.status = "failed"
            execution.error_message = "Analysis run no longer exists."
            execution.completed_at = utc_now()
            db.commit()
            return
        steps = _simulation_steps(run, execution.plan_id)
        for index, (name, output) in enumerate(steps, 1):
            await asyncio.sleep(0.28)
            db.add(SandboxExecutionLog(
                execution_id=execution.id, run_id=run.id, plan_id=execution.plan_id,
                step_number=index, step_name=name, status="completed", log_output=output, duration_ms=280,
            ))
            db.commit()
        run.selected_plan_id = execution.plan_id
        execution.status = "completed"
        execution.result_json = {
            "plan_id": execution.plan_id,
            "plan": next((p for p in run.candidate_plans_json if p.get("id") == execution.plan_id), None),
            "execution_kind": "educational_simulation",
            "code_executed": False,
            "notes": ["No user code was executed.", "Results are limited to the domain rules and assumptions listed on this run."],
        }
        execution.completed_at = utc_now()
        db.commit()
    except Exception as exc:
        db.rollback()
        execution = db.get(SimulationExecution, execution_id)
        if execution is not None:
            execution.status = "failed"
            execution.error_message = "Simulation failed. Review the input and retry."
            execution.completed_at = utc_now()
            db.commit()
    finally:
        db.close()


@app.post("/api/v1/simulate/{run_id}", status_code=202)
async def simulate(run_id: str, payload: SimulationRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    run = _get_run_for_user(db, run_id, user.id)
    if not any(plan.get("id") == payload.plan_id for plan in run.candidate_plans_json):
        raise HTTPException(status_code=404, detail="Plan not found for this run.")
    execution = SimulationExecution(run_id=run.id, user_id=user.id, plan_id=payload.plan_id)
    db.add(execution)
    db.commit()
    db.refresh(execution)
    task = asyncio.create_task(_run_simulation(execution.id))
    _simulation_tasks[execution.id] = task
    task.add_done_callback(lambda _: _simulation_tasks.pop(execution.id, None))
    return {"execution_id": execution.id, "status": execution.status, "stream_url": f"/api/v1/stream/{execution.id}"}


@app.get("/api/v1/stream/{execution_id}")
async def stream_simulation(execution_id: str, user: User = Depends(get_current_user)) -> StreamingResponse:
    check = SessionLocal()
    execution = check.get(SimulationExecution, execution_id)
    if execution is None or execution.user_id != user.id:
        check.close()
        raise HTTPException(status_code=404, detail="Simulation not found.")
    check.close()

    async def event_stream():
        last_step = 0
        idle_cycles = 0
        while idle_cycles < 30:
            db = SessionLocal()
            try:
                current = db.get(SimulationExecution, execution_id)
                if current is None or current.user_id != user.id:
                    return
                logs = db.query(SandboxExecutionLog).filter(
                    SandboxExecutionLog.execution_id == execution_id,
                    SandboxExecutionLog.step_number > last_step,
                ).order_by(SandboxExecutionLog.step_number.asc()).all()
                for log in logs:
                    payload = {
                        "execution_id": execution_id, "sequence": log.step_number,
                        "step_name": log.step_name, "status": log.status,
                        "message": log.log_output, "duration_ms": log.duration_ms,
                    }
                    yield f"id: {log.step_number}\nevent: progress\ndata: {json.dumps(payload)}\n\n"
                    last_step = log.step_number
                    idle_cycles = 0
                if current.status in {"completed", "failed", "interrupted"} and last_step >= 5:
                    result = {"status": current.status, "result": current.result_json, "error": current.error_message}
                    yield f"event: complete\ndata: {json.dumps(result)}\n\n"
                    return
                if current.status in {"failed", "interrupted"}:
                    result = {"status": current.status, "error": current.error_message}
                    yield f"event: complete\ndata: {json.dumps(result)}\n\n"
                    return
            finally:
                db.close()
            idle_cycles += 1
            if idle_cycles % 10 == 0:
                yield ": keep-alive\n\n"
            await asyncio.sleep(0.2)
        yield f"event: complete\ndata: {json.dumps({'status': 'timeout', 'error': 'No new progress arrived.'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/v1/simulations/{execution_id}")
def simulation_status(execution_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    execution = db.get(SimulationExecution, execution_id)
    if execution is None or execution.user_id != user.id:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    return {
        "execution_id": execution.id, "run_id": execution.run_id, "plan_id": execution.plan_id,
        "status": execution.status, "result": execution.result_json, "error": execution.error_message,
        "logs": [{"sequence": log.step_number, "step_name": log.step_name, "status": log.status, "message": log.log_output} for log in execution.logs],
    }


@app.get("/api/v1/demo-credentials", include_in_schema=False)
def demo_credentials() -> dict[str, str]:
    # The page uses the demo-login action; credentials remain documented in the local README.
    return {"status": "Use the one-click demo login."}

