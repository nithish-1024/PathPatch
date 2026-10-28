from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), default="CSE / Interdisciplinary DT", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    runs: Mapped[list["ProjectAnalysisRun"]] = relationship(back_populates="user")


class ProjectAnalysisRun(Base):
    __tablename__ = "project_analysis_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    raw_input: Mapped[str] = mapped_column(Text, nullable=False)
    selected_plan_id: Mapped[str] = mapped_column(String(32), default="plan_b", nullable=False)
    system_graph_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    candidate_plans_json: Mapped[list] = mapped_column(JSON, nullable=False)
    upskilled_blueprint_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    analysis_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped[User | None] = relationship(back_populates="runs")
    executions: Mapped[list["SimulationExecution"]] = relationship(back_populates="run")


class SimulationExecution(Base):
    __tablename__ = "simulation_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("project_analysis_runs.id"), index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    plan_id: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False)
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    run: Mapped[ProjectAnalysisRun] = relationship(back_populates="executions")
    logs: Mapped[list["SandboxExecutionLog"]] = relationship(back_populates="execution", order_by="SandboxExecutionLog.step_number")


class SandboxExecutionLog(Base):
    __tablename__ = "sandbox_execution_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    execution_id: Mapped[str] = mapped_column(ForeignKey("simulation_executions.id"), index=True, nullable=False)
    run_id: Mapped[str] = mapped_column(ForeignKey("project_analysis_runs.id"), index=True, nullable=False)
    plan_id: Mapped[str] = mapped_column(String(32), nullable=False)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    log_output: Mapped[str] = mapped_column(Text, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    execution: Mapped[SimulationExecution] = relationship(back_populates="logs")



class RateLimitRecord(Base):
    __tablename__ = "rate_limit_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True, nullable=False)
