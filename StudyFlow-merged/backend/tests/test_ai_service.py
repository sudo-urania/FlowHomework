from pathlib import Path
from models.assignment import Assignment
from services.document_parser import extract_text
from services.ai_service import extract_assignments, analyze_assignment

FIXTURES = Path(__file__).parent / "fixtures"

def test_three_syllabi_parse_and_validate(monkeypatch):
    # Exercise the local fallback deterministically; AI calls require a configured key.
    monkeypatch.setattr("services.ai_service.ANTHROPIC_API_KEY", "")
    for name in ("fixture_simple.txt", "fixture_large_project.txt", "fixture_ambiguous.txt"):
        text = extract_text((FIXTURES / name).read_bytes(), name)
        assignments = extract_assignments(text, "2026-08-20")
        assert isinstance(assignments, list)
        assert all(isinstance(item, Assignment) for item in assignments)
        assert all(item.title for item in assignments)

def test_large_project_gets_at_least_three_subtasks(monkeypatch):
    monkeypatch.setattr("services.ai_service.ANTHROPIC_API_KEY", "")
    text = (FIXTURES / "fixture_large_project.txt").read_text(encoding="utf-8")
    item = Assignment(courseName="Software Engineering", title="Major Project: Student Appointment Booking System",
                      dueDate="2026-11-20", sourceQuote="Major Project", confidence=.9)
    result = analyze_assignment(item)
    assert result.difficulty in range(1, 6)
    assert result.estimatedMinutes > 0
    assert len(result.subtasks) >= 3

def test_assignment_model_rejects_invalid_difficulty():
    import pytest
    with pytest.raises(Exception):
        Assignment(title="Bad", difficulty=6)
