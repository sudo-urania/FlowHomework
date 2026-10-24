import json, uuid
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from db import connect
from models.assignment import Assignment

router = APIRouter(prefix="/assignments", tags=["assignments"])
class BulkSave(BaseModel):
    assignments: list[Assignment] = Field(min_length=1, max_length=200)
    termId: str = "default"

@router.get("")
def list_assignments(termId: str = Query(default="default")):
    with connect() as db:
        rows = db.execute("SELECT data_json FROM assignments WHERE term_id=? ORDER BY created_at", (termId,)).fetchall()
    return {"assignments": [json.loads(row["data_json"]) for row in rows]}

@router.post("/bulk")
def save_confirmed(payload: BulkSave):
    saved = []
    with connect() as db:
        for model in payload.assignments:
            item = model.model_copy(deep=True)
            item.id = item.id or str(uuid.uuid4())
            item.termId = payload.termId
            data = item.model_dump(mode="json")
            db.execute("INSERT INTO assignments(id, term_id, data_json) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP",
                       (item.id, payload.termId, json.dumps(data)))
            saved.append(data)
    return {"saved": len(saved), "assignments": saved}

@router.put("/{assignment_id}")
def update_assignment(assignment_id: str, item: Assignment):
    data = item.model_copy(update={"id": assignment_id}).model_dump(mode="json")
    with connect() as db:
        cursor = db.execute("UPDATE assignments SET data_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (json.dumps(data), assignment_id))
        if cursor.rowcount == 0: raise HTTPException(status_code=404, detail="Assignment not found")
    return data

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: str):
    with connect() as db:
        cursor = db.execute("DELETE FROM assignments WHERE id=?", (assignment_id,))
        if cursor.rowcount == 0: raise HTTPException(status_code=404, detail="Assignment not found")
    return {"deleted": True, "id": assignment_id}
