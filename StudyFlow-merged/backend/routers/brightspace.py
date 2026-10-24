from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.brightspace import parse_icalendar_feed
from services.ai_service import analyze_assignment
from models.assignment import AssignmentImportResult

router = APIRouter(prefix="/brightspace", tags=["Brightspace"])

class ICalImportRequest(BaseModel):
    feedText: str = Field(min_length=10, max_length=2_000_000)

@router.post("/ical/import", response_model=AssignmentImportResult)
def import_ical_feed(payload: ICalImportRequest):
    """Parse a user-provided Brightspace iCalendar feed. Nothing is saved until confirmed."""
    try:
        items = parse_icalendar_feed(payload.feedText)
        analyzed = [analyze_assignment(item) for item in items]
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not import this calendar feed: {exc}") from exc
    return AssignmentImportResult(assignments=analyzed, warnings=["Review calendar events before saving; calendar feeds may contain non-assignment events."], aiEnabled=__import__("config").ANTHROPIC_API_KEY != "")
