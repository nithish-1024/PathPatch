from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterRequest(StrictModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    department: str = Field(default="CSE / Interdisciplinary DT", max_length=100)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name", "department", mode="before")
    @classmethod
    def normalize_profile_text(cls, value: str) -> str:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("This field cannot be blank.")
        return value


class LoginRequest(StrictModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(StrictModel):
    id: int
    email: str
    full_name: str
    department: str


class AuthResponse(StrictModel):
    user: UserResponse


class AnalyzeRequest(StrictModel):
    title: str = Field(min_length=1, max_length=255)
    raw_input: str = Field(min_length=1, max_length=100_000)
    analysis_type: Literal["repository", "circuit", "truss", "beam", "idea"] = "idea"
    department_lens: Literal["auto", "cse", "ece", "civil", "mechanical", "all_department_dt"] = "auto"
    repository_files: dict[str, str] | None = None

    @field_validator("title", "raw_input", mode="before")
    @classmethod
    def normalize_analyze_text(cls, value: str) -> str:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("This field cannot be blank.")
        return value

    @field_validator("repository_files")
    @classmethod
    def limit_repository_metadata(cls, value: dict[str, str] | None) -> dict[str, str] | None:
        if value is None:
            return value
        if len(value) > 40:
            raise ValueError("Select no more than 40 package metadata files.")
        total_bytes = 0
        accepted = {"package.json", "package-lock.json"}
        for path, content in value.items():
            normalized = path.replace("\\", "/")
            parts = normalized.split("/")
            if not path or len(path) > 512 or normalized.startswith("/") or ":" in parts[0] or ".." in parts:
                raise ValueError("Repository file paths must be relative and must not contain parent traversal.")
            if parts[-1] not in accepted:
                raise ValueError("Only package.json and package-lock.json files are accepted from a repository folder.")
            if len(content.encode("utf-8")) > 100_000:
                raise ValueError(f"{parts[-1]} is larger than 100 KB.")
            total_bytes += len(content.encode("utf-8"))
        if total_bytes > 500_000:
            raise ValueError("Selected package metadata is larger than 500 KB total.")
        return value


class SimulationRequest(StrictModel):
    plan_id: Literal["plan_a", "plan_b", "plan_c"] = "plan_b"


class GraphNode(StrictModel):
    id: str
    label: str
    layer: str
    kind: str = "component"
    status: str = "stable"
    position: list[float] = Field(min_length=3, max_length=3)
    facts: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(StrictModel):
    source: str
    target: str
    label: str = ""
    status: str = "stable"


class SystemGraph(StrictModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    faults: list[str] = Field(default_factory=list)
    patches: list[str] = Field(default_factory=list)
    evidence_note: str = ""


class RunResponse(StrictModel):
    id: str
    mode: str
    title: str
    raw_input: str
    selected_plan_id: str
    system_graph_json: dict[str, Any]
    candidate_plans_json: list[dict[str, Any]]
    upskilled_blueprint_json: dict[str, Any] | None
    analysis_json: dict[str, Any]
    created_at: str

