from pathlib import Path
from fastapi.testclient import TestClient
from main import app

FIXTURE = Path(__file__).parent / "fixtures" / "fixture_large_project.txt"

def test_upload_returns_reviewable_assignments_without_saving(monkeypatch, tmp_path):
    import services.ai_service as ai_service
    import config
    monkeypatch.setattr(ai_service, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "")
    with TestClient(app) as client:
        response = client.post("/syllabus/upload", files={"file": (FIXTURE.name, FIXTURE.read_bytes(), "text/plain")})
        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["assignments"]
        project = next(a for a in payload["assignments"] if "Project" in a["title"])
        assert project["dueDate"] == "2026-11-20"
        assert len(project["subtasks"]) >= 3
        assert payload["aiEnabled"] is False
