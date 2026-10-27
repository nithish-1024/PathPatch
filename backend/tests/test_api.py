from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app import main
from app.db.database import get_db


def test_auth_persistence_ownership_and_simulation_stream(tmp_path, monkeypatch):
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'patchpath-test.db'}",
        connect_args={"check_same_thread": False},
    )
    test_sessions = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    monkeypatch.setattr(main, "engine", test_engine)
    monkeypatch.setattr(main, "SessionLocal", test_sessions)

    def override_db():
        db = test_sessions()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(main.app) as client:
            for mode in ("cs_repo", "ece_circuit", "civil_mech", "custom_upskiller"):
                assert client.get(f"/api/v1/demos/{mode}").status_code == 200

            response = client.post("/api/v1/auth/register", json={
                "email": "learner@example.com",
                "full_name": "Test Learner",
                "password": "learning-pass-123",
            })
            assert response.status_code == 201
            assert "access_token" not in response.json()
            assert "httponly" in response.headers["set-cookie"].lower()
            assert client.get("/api/v1/auth/me").status_code == 200

            created = client.post("/api/v1/upskiller/analyze", json={
                "title": "Dependency lesson",
                "raw_input": '{"dependencies":{"lodash":"4.17.20"}}',
                "department_lens": "auto",
            })
            assert created.status_code == 201
            run = created.json()
            assert run["analysis_json"]["findings"]
            assert [item["id"] for item in client.get("/api/v1/runs").json()] == [run["id"]]

            public_demo = client.get("/api/v1/demos/cs_repo").json()
            forbidden = client.post(f"/api/v1/simulate/{public_demo['id']}", json={"plan_id": "plan_b"})
            assert forbidden.status_code == 404

            started = client.post(f"/api/v1/simulate/{run['id']}", json={"plan_id": "plan_b"})
            assert started.status_code == 202
            execution_id = started.json()["execution_id"]
            stream = client.get(f"/api/v1/stream/{execution_id}")
            assert stream.status_code == 200
            assert stream.text.count("event: progress") == 5
            assert '"status": "completed"' in stream.text
            assert "No source code or tests were executed" in stream.text

            signed_out = client.post("/api/v1/auth/logout")
            assert signed_out.json() == {"status": "signed_out"}
            assert client.get("/api/v1/auth/me").status_code == 401

            logged_in = client.post("/api/v1/auth/login", json={"email": "learner@example.com", "password": "learning-pass-123"})
            assert logged_in.status_code == 200
            assert client.get("/api/v1/auth/me").status_code == 200
    finally:
        main.app.dependency_overrides.clear()
        test_engine.dispose()

