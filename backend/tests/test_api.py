import json
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import main
from app.auth import security
from app.db import database
from app.db.database import Base, get_db
from app.db.seed import seed_demo_data


@pytest.fixture
def test_db_setup(tmp_path, monkeypatch):
    test_db_file = tmp_path / "patchpath-test.db"
    test_engine = create_engine(
        f"sqlite:///{test_db_file}",
        connect_args={"check_same_thread": False},
    )
    test_sessions = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    Base.metadata.create_all(bind=test_engine)
    seed_session = test_sessions()
    try:
        seed_demo_data(seed_session)
    finally:
        seed_session.close()

    monkeypatch.setattr(main, "SessionLocal", test_sessions)
    monkeypatch.setattr(database, "engine", test_engine)
    monkeypatch.setattr(database, "SessionLocal", test_sessions)

    def override_db():
        db = test_sessions()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_db
    yield test_sessions
    main.app.dependency_overrides.clear()
    test_engine.dispose()


def test_public_demos_and_health(test_db_setup):
    with TestClient(main.app) as client:
        health_resp = client.get("/api/v1/health")
        assert health_resp.status_code == 200
        assert health_resp.json() == {"status": "ok", "service": "patchpath-api"}

        config_resp = client.get("/api/v1/auth/config")
        assert config_resp.status_code == 200
        assert "demo_login_enabled" in config_resp.json()

        for mode in ("cs_repo", "ece_circuit", "civil_mech", "mechanical_beam", "custom_upskiller"):
            demo_resp = client.get(f"/api/v1/demos/{mode}")
            assert demo_resp.status_code == 200
            run = demo_resp.json()
            assert run["mode"] == mode
            assert run["system_graph_json"]["nodes"]


def test_auth_persistence_ownership_and_simulation_stream(test_db_setup):
    with TestClient(main.app) as client1:
        # Register user 1
        reg_resp = client1.post("/api/v1/auth/register", json={
            "email": "user1@example.com",
            "full_name": "User One",
            "password": "secure-password-123",
            "department": "Software Engineering",
        })
        assert reg_resp.status_code == 201
        assert "access_token" not in reg_resp.json()
        assert "httponly" in reg_resp.headers["set-cookie"].lower()
        assert client1.get("/api/v1/auth/me").status_code == 200

        # Create analysis for user 1
        created = client1.post("/api/v1/upskiller/analyze", json={
            "title": "Lodash analysis",
            "raw_input": '{"dependencies":{"lodash":"4.17.20"}}',
            "department_lens": "auto",
        })
        assert created.status_code == 201
        run1 = created.json()
        assert run1["analysis_json"]["findings"]
        user1_runs = client1.get("/api/v1/runs").json()
        assert len(user1_runs) == 1
        assert user1_runs[0]["id"] == run1["id"]

        # User 1 runs streamed POST simulation
        sim_resp = client1.post(f"/api/v1/simulate/{run1['id']}", json={"plan_id": "plan_b"})
        assert sim_resp.status_code == 200
        assert "text/event-stream" in sim_resp.headers["content-type"]
        assert sim_resp.text.count("event: progress") == 5
        assert '"status": "completed"' in sim_resp.text
        assert "No source code or tests were executed" in sim_resp.text

        # Verify state recovery after simulation via status endpoint
        recovered = client1.get(f"/api/v1/runs/{run1['id']}/latest-simulation")
        assert recovered.status_code == 200
        rec_data = recovered.json()
        assert rec_data["status"] == "completed"
        assert len(rec_data["logs"]) == 5

        # Check simulation status by execution_id
        exec_id = rec_data["execution_id"]
        exec_status = client1.get(f"/api/v1/simulations/{exec_id}")
        assert exec_status.status_code == 200
        assert exec_status.json()["status"] == "completed"

    # User 2: verify ownership isolation
    with TestClient(main.app) as client2:
        reg_resp2 = client2.post("/api/v1/auth/register", json={
            "email": "user2@example.com",
            "full_name": "User Two",
            "password": "secure-password-456",
            "department": "Civil Engineering",
        })
        assert reg_resp2.status_code == 201

        # User 2 cannot see User 1's runs
        user2_runs = client2.get("/api/v1/runs").json()
        assert len(user2_runs) == 0

        # User 2 cannot simulate User 1's run
        forbidden_sim = client2.post(f"/api/v1/simulate/{run1['id']}", json={"plan_id": "plan_b"})
        assert forbidden_sim.status_code == 404

        # User 2 cannot view User 1's simulation execution
        forbidden_exec = client2.get(f"/api/v1/simulations/{exec_id}")
        assert forbidden_exec.status_code == 404

        # User 2 cannot simulate public demo directly
        public_demo = client2.get("/api/v1/demos/cs_repo").json()
        demo_sim = client2.post(f"/api/v1/simulate/{public_demo['id']}", json={"plan_id": "plan_b"})
        assert demo_sim.status_code == 404


def test_csrf_origin_protection(test_db_setup):
    with TestClient(main.app) as client:
        # Register user
        client.post("/api/v1/auth/register", json={
            "email": "csrf_test@example.com",
            "full_name": "CSRF Tester",
            "password": "secure-password-123",
        })

        # Malicious cross-origin mutation must be rejected
        cross_origin_headers = {"Origin": "https://malicious-site.example.com"}
        rejected = client.post(
            "/api/v1/upskiller/analyze",
            json={"title": "Attack", "raw_input": "test", "department_lens": "auto"},
            headers=cross_origin_headers,
        )
        assert rejected.status_code == 403
        assert "Cross-origin mutation rejected" in rejected.json()["detail"]


def test_demo_login_disabled_in_production(test_db_setup, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("PATCHPATH_SECRET_KEY", "prod-secret-must-be-very-long-and-random-32chars")
    monkeypatch.setenv("PATCHPATH_DATABASE_URL", "postgresql+psycopg://user:pass@ep-fake.neon.tech/neondb")
    monkeypatch.delenv("PATCHPATH_ALLOW_DEMO_LOGIN", raising=False)

    with TestClient(main.app) as client:
        cfg = client.get("/api/v1/auth/config").json()
        assert cfg["demo_login_enabled"] is False

        demo_attempt = client.post("/api/v1/auth/demo-login")
        assert demo_attempt.status_code == 403
        assert "One-click demo login is disabled in production" in demo_attempt.json()["detail"]


def test_production_missing_secret_key_fails(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("PATCHPATH_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="PATCHPATH_SECRET_KEY must be set in production"):
        security.get_secret_key()


def test_production_missing_db_url_fails(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("PATCHPATH_DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="Production database URL is missing"):
        database.resolve_database_url()
