import os
from fastapi.testclient import TestClient
import db
os.environ["DATABASE_PATH"] = ":memory:"
# db.DATABASE_PATH was imported at module load, so use a temporary file for isolated tests.
from main import app

def test_availability_validation_and_crud(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DATABASE_PATH", str(tmp_path / "test.db"))
    db.init_db()
    client = TestClient(app)
    bad = {"termId":"test", "name":"Class", "weekdays":[], "startTime":"10:00", "endTime":"11:00", "type":"class"}
    assert client.post("/availability", json=bad).status_code == 422
    good = {"termId":"test", "name":"Class", "weekdays":[0,2], "startTime":"10:00", "endTime":"11:00", "type":"class"}
    response = client.post("/availability", json=good)
    assert response.status_code == 200
    block_id = response.json()["id"]
    assert len(client.get("/availability?termId=test").json()["availabilityBlocks"]) == 1
    assert client.delete(f"/availability/{block_id}").status_code == 200
