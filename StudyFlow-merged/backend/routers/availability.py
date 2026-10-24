import json, uuid
from fastapi import APIRouter, HTTPException, Query
from db import connect
from models.availability import AvailabilityBlock

router = APIRouter(prefix="/availability", tags=["availability"])

def as_dict(row):
    return {"id":row["id"], "termId":row["term_id"], "name":row["name"], "weekdays":json.loads(row["weekdays"]), "startTime":row["start_time"], "endTime":row["end_time"], "type":row["type"]}

@router.get("")
def list_availability(termId: str = Query(default="default")):
    with connect() as db:
        rows = db.execute("SELECT * FROM availability_blocks WHERE term_id=? ORDER BY start_time", (termId,)).fetchall()
    return {"availabilityBlocks":[as_dict(r) for r in rows]}

@router.post("")
def create_availability(item: AvailabilityBlock):
    item_id = item.id or str(uuid.uuid4())
    with connect() as db:
        db.execute("INSERT INTO availability_blocks(id,term_id,name,weekdays,start_time,end_time,type) VALUES(?,?,?,?,?,?,?)",
            (item_id,item.termId,item.name,json.dumps(item.weekdays),item.startTime,item.endTime,item.type))
    return item.model_copy(update={"id":item_id}).model_dump()

@router.put("/{block_id}")
def update_availability(block_id: str, item: AvailabilityBlock):
    with connect() as db:
        cursor=db.execute("UPDATE availability_blocks SET name=?,weekdays=?,start_time=?,end_time=?,type=?,term_id=? WHERE id=?",
            (item.name,json.dumps(item.weekdays),item.startTime,item.endTime,item.type,item.termId,block_id))
        if not cursor.rowcount: raise HTTPException(status_code=404,detail="Availability block not found")
    return item.model_copy(update={"id":block_id}).model_dump()

@router.delete("/{block_id}")
def delete_availability(block_id: str):
    with connect() as db:
        cursor=db.execute("DELETE FROM availability_blocks WHERE id=?",(block_id,))
        if not cursor.rowcount: raise HTTPException(status_code=404,detail="Availability block not found")
    return {"deleted":True,"id":block_id}
