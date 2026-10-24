"""Brightspace calendar-feed import (phase 1; no OAuth/API integration yet)."""
from datetime import date
from models.assignment import Assignment

def parse_icalendar_feed(feed_text: str) -> list[Assignment]:
    try:
        from icalendar import Calendar
        calendar = Calendar.from_ical(feed_text)
    except Exception as exc:
        raise ValueError(f"Could not parse iCalendar feed: {exc}") from exc
    result = []
    for event in calendar.walk("VEVENT"):
        summary = str(event.get("summary", "Untitled Brightspace event"))
        description = str(event.get("description", ""))
        due = event.get("dtstart") or event.get("dtend")
        if not due: continue
        dt = due.dt
        due_date = dt.date().isoformat() if hasattr(dt, "date") else dt.isoformat()
        result.append(Assignment(courseName="Brightspace import", title=summary, instructions=description,
            assignmentType="calendar_event", dueDate=due_date, sourceQuote=summary, confidence=.75,
            needsReview=True))
    return result
