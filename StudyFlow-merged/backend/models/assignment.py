from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator

class Subtask(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=240)
    estimatedMinutes: int = Field(gt=0, le=10080)
    done: bool = False

class Assignment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Optional[str] = None
    termId: str = "default"
    courseName: str = Field(default="Unknown course", min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=300)
    instructions: str = ""
    assignmentType: str = "assignment"
    dueDate: Optional[str] = None  # Local academic date in YYYY-MM-DD format; null if unclear.
    weightPercent: Optional[float] = Field(default=None, ge=0, le=100)
    sourceQuote: str = ""
    confidence: float = Field(default=0.5, ge=0, le=1)
    difficulty: Optional[int] = Field(default=None, ge=1, le=5)
    estimatedMinutes: Optional[int] = Field(default=None, gt=0, le=10080)
    subtasks: list[Subtask] = Field(default_factory=list)
    needsReview: bool = True
    status: Literal["not_started", "in_progress", "completed"] = "not_started"

    @field_validator("dueDate")
    @classmethod
    def validate_due_date(cls, value):
        if value is None or value == "":
            return None
        from datetime import date
        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("dueDate must be YYYY-MM-DD or null") from exc
        return value

    @field_validator("courseName", "title")
    @classmethod
    def strip_text(cls, value):
        return value.strip()

class AssignmentImportResult(BaseModel):
    assignments: list[Assignment]
    warnings: list[str] = Field(default_factory=list)
    aiEnabled: bool = False
