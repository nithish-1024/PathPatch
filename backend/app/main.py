import asyncio
import json
import os
import re
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.security import (
    SESSION_COOKIE,
    TOKEN_MINUTES,
    check_rate_limit,
    create_access_token,
    get_client_ip,
    get_current_user,
    hash_password,
    is_cookie_secure,
    is_demo_login_allowed,
    verify_csrf,
    verify_password,
)
from app.db.database import SessionLocal, get_db, is_production
from app.db.models import ProjectAnalysisRun, SandboxExecutionLog, SimulationExecution, User, utc_now
from app.db.seed import DEMO_EMAIL, DEMO_PASSWORD
from app.engines.civil_truss_engine import analyze_truss
from app.engines.cs_repo_engine import analyze_manifest, analyze_repository_files, fetch_github_package_json
from app.engines.ece_circuit_engine import analyze_circuit_idea
from app.engines.mechanical_beam_engine import analyze_beam
from app.engines.upskiller_engine import analyze_idea
from app.schemas.contracts import AnalyzeRequest, AuthResponse, LoginRequest, RegisterRequest, RunResponse, SimulationRequest, UserResponse


@asynccontextmanager
async def lifespan(_: FastAPI):
    # DDL schema migrations and fixture seeding are managed via versioned migrations
    # and explicit seed commands rather than on serverless cold starts.
    yield


app = FastAPI(
    title="PatchPath Universal API",
    description="Educational engineering analysis. Submitted source code is never executed.",
    version="0.1.0",
    lifespan=lifespan,
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
frontend_origin = os.getenv("PATCHPATH_FRONTEND_ORIGIN")
if frontend_origin:
    allowed_origins.append(frontend_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
        secure=is_cookie_secure(),
        samesite="lax",
        path="/api/v1",
    )
    return AuthResponse(user=_user_response(user))


def _run_response(run: ProjectAnalysisRun) -> RunResponse:
    return RunResponse(
        id=run.id,
        mode=run.mode,
        title=run.title,
        raw_input=run.raw_input,
        selected_plan_id=run.selected_plan_id,
        system_graph_json=run.system_graph_json,
        candidate_plans_json=run.candidate_plans_json,
        upskilled_blueprint_json=run.upskilled_blueprint_json,
        analysis_json=run.analysis_json or {},
        created_at=run.created_at.isoformat(),
    )


def _get_run_for_user(db: Session, run_id: str, user_id: int) -> ProjectAnalysisRun:
    run = db.get(ProjectAnalysisRun, run_id)
    if run is None or run.user_id != user_id:
        raise HTTPException(status_code=404, detail="Analysis run not found.")
    return run


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "patchpath-api"}


@app.get("/api/v1/auth/config")
def auth_config() -> dict[str, Any]:
    return {
        "demo_login_enabled": is_demo_login_allowed(),
        "environment": "production" if is_production() else "development",
        "cookie_secure": is_cookie_secure(),
    }


@app.post("/api/v1/auth/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    verify_csrf(request)
    client_ip = get_client_ip(request)
    check_rate_limit(db, f"register:{client_ip}", max_requests=5, window_seconds=600)

    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        department=payload.department.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _auth_response(user, response)


@app.post("/api/v1/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    verify_csrf(request)
    client_ip = get_client_ip(request)
    check_rate_limit(db, f"login:{client_ip}", max_requests=10, window_seconds=300)

    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return _auth_response(user, response)


@app.post("/api/v1/auth/demo-login", response_model=AuthResponse)
def demo_login(request: Request, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    verify_csrf(request)
    if not is_demo_login_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="One-click demo login is disabled in production. Please register your own account to save runs.",
        )
    client_ip = get_client_ip(request)
    check_rate_limit(db, f"demo-login:{client_ip}", max_requests=10, window_seconds=300)

    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user is None:
        user = User(email=DEMO_EMAIL, full_name="DT Judge Evaluator", password_hash=hash_password(DEMO_PASSWORD))
        db.add(user)
        db.commit()
        db.refresh(user)
    return _auth_response(user, response)


@app.post("/api/v1/auth/logout")
def logout(request: Request, response: Response) -> dict[str, str]:
    verify_csrf(request)
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/api/v1",
        httponly=True,
        secure=is_cookie_secure(),
        samesite="lax",
    )
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
        raise HTTPException(status_code=503, detail="Demo data is not available yet. Please run database migrations and seeding.")
    return _run_response(run)


@app.get("/api/v1/runs", response_model=list[RunResponse])
def list_runs(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[RunResponse]:
    rows = db.query(ProjectAnalysisRun).filter(ProjectAnalysisRun.user_id == user.id).order_by(ProjectAnalysisRun.created_at.desc()).limit(100).all()
    return [_run_response(row) for row in rows]


@app.post("/api/v1/upskiller/analyze", response_model=RunResponse, status_code=201)
def create_analysis(payload: AnalyzeRequest, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> RunResponse:
    verify_csrf(request)
    client_ip = get_client_ip(request)
    check_rate_limit(db, f"analyze:{user.id}:{client_ip}", max_requests=20, window_seconds=300)

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
        user_id=user.id,
        mode=mode,
        title=payload.title.strip(),
        raw_input=raw,
        selected_plan_id="plan_b",
        system_graph_json=result["system_graph"],
        candidate_plans_json=result["candidate_plans"],
        upskilled_blueprint_json=blueprint,
        analysis_json=result,
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
        target = analysis.get("member_results") or []
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
        ("RECOMMEND", f"{plan.get('evidence_status', 'Review the stated assumptions before acting.')}"),
    ]


@app.post("/api/v1/simulate/{run_id}")
async def simulate(
    run_id: str,
    payload: SimulationRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    verify_csrf(request)
    client_ip = get_client_ip(request)
    check_rate_limit(db, f"simulate:{user.id}:{client_ip}", max_requests=15, window_seconds=300)

    run = _get_run_for_user(db, run_id, user.id)
    if not any(plan.get("id") == payload.plan_id for plan in run.candidate_plans_json):
        raise HTTPException(status_code=404, detail="Plan not found for this run.")

    # Create initial execution record with running status
    execution = SimulationExecution(
        run_id=run.id,
        user_id=user.id,
        plan_id=payload.plan_id,
        status="running",
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)
    execution_id = execution.id

    async def event_generator():
        stream_db = SessionLocal()
        try:
            current_run = stream_db.get(ProjectAnalysisRun, run_id)
            if current_run is None:
                yield f"event: complete\ndata: {json.dumps({'status': 'failed', 'error': 'Run not found.'})}\n\n"
                return

            steps = _simulation_steps(current_run, payload.plan_id)
            for index, (step_name, step_output) in enumerate(steps, 1):
                await asyncio.sleep(0.25)
                log = SandboxExecutionLog(
                    execution_id=execution_id,
                    run_id=run_id,
                    plan_id=payload.plan_id,
                    step_number=index,
                    step_name=step_name,
                    status="completed",
                    log_output=step_output,
                    duration_ms=250,
                )
                stream_db.add(log)
                stream_db.commit()

                event_data = {
                    "execution_id": execution_id,
                    "sequence": index,
                    "step_name": step_name,
                    "status": "completed",
                    "message": step_output,
                    "duration_ms": 250,
                }
                yield f"id: {index}\nevent: progress\ndata: {json.dumps(event_data)}\n\n"

            # Persist completed state
            current_run.selected_plan_id = payload.plan_id
            current_exec = stream_db.get(SimulationExecution, execution_id)
            if current_exec:
                current_exec.status = "completed"
                current_exec.result_json = {
                    "plan_id": payload.plan_id,
                    "plan": next((p for p in current_run.candidate_plans_json if p.get("id") == payload.plan_id), None),
                    "execution_kind": "educational_simulation",
                    "code_executed": False,
                    "notes": [
                        "No user code was executed.",
                        "Results are limited to the domain rules and assumptions listed on this run.",
                    ],
                }
                current_exec.completed_at = utc_now()
                stream_db.commit()

                complete_data = {
                    "status": "completed",
                    "execution_id": execution_id,
                    "result": current_exec.result_json,
                    "error": None,
                }
                yield f"event: complete\ndata: {json.dumps(complete_data)}\n\n"

        except (asyncio.CancelledError, GeneratorExit, Exception) as exc:
            try:
                current_exec = stream_db.get(SimulationExecution, execution_id)
                if current_exec and current_exec.status != "completed":
                    current_exec.status = "interrupted"
                    current_exec.error_message = "Simulation stream disconnected before completion."
                    current_exec.completed_at = utc_now()
                    stream_db.commit()
            except Exception:
                pass
            if not isinstance(exc, (asyncio.CancelledError, GeneratorExit)):
                yield f"event: complete\ndata: {json.dumps({'status': 'failed', 'execution_id': execution_id, 'error': 'Simulation failed.'})}\n\n"
            raise
        finally:
            stream_db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/v1/simulations/{execution_id}")
def simulation_status(execution_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    execution = db.get(SimulationExecution, execution_id)
    if execution is None or execution.user_id != user.id:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    return {
        "execution_id": execution.id,
        "run_id": execution.run_id,
        "plan_id": execution.plan_id,
        "status": execution.status,
        "result": execution.result_json,
        "error": execution.error_message,
        "logs": [
            {
                "execution_id": execution.id,
                "sequence": log.step_number,
                "step_name": log.step_name,
                "status": log.status,
                "message": log.log_output,
                "duration_ms": log.duration_ms,
            }
            for log in execution.logs
        ],
    }


@app.get("/api/v1/runs/{run_id}/latest-simulation")
def latest_simulation(run_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    run = _get_run_for_user(db, run_id, user.id)
    exec_record = (
        db.query(SimulationExecution)
        .filter(SimulationExecution.run_id == run.id, SimulationExecution.user_id == user.id)
        .order_by(SimulationExecution.created_at.desc())
        .first()
    )
    if exec_record is None:
        return {"status": "none", "logs": []}
    return {
        "execution_id": exec_record.id,
        "run_id": exec_record.run_id,
        "plan_id": exec_record.plan_id,
        "status": exec_record.status,
        "result": exec_record.result_json,
        "error": exec_record.error_message,
        "logs": [
            {
                "execution_id": exec_record.id,
                "sequence": log.step_number,
                "step_name": log.step_name,
                "status": log.status,
                "message": log.log_output,
                "duration_ms": log.duration_ms,
            }
            for log in exec_record.logs
        ],
    }


@app.get("/api/v1/demo-credentials", include_in_schema=False)
def demo_credentials() -> dict[str, str]:
    if is_demo_login_allowed():
        return {"status": "Local demo mode active. Use one-click demo login."}
    return {"status": "Demo login is disabled in production."}
