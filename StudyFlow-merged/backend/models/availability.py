from pydantic import BaseModel, Field, field_validator, model_validator

class AvailabilityBlock(BaseModel):
    id: str | None = None
    termId: str = "default"
    name: str = Field(min_length=1, max_length=160)
    weekdays: list[int] = Field(min_length=1, max_length=7)  # Monday=0 ... Sunday=6
    startTime: str
    endTime: str
    type: str = "busy"

    @field_validator("weekdays")
    @classmethod
    def validate_weekdays(cls, value):
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("weekdays must contain values 0 (Mon) through 6 (Sun)")
        if len(set(value)) != len(value):
            raise ValueError("weekdays cannot contain duplicates")
        return value

    @model_validator(mode="after")
    def validate_times(self):
        import re
        pattern = r"^(?:[01]\d|2[0-3]):[0-5]\d$"
        if not re.match(pattern, self.startTime) or not re.match(pattern, self.endTime):
            raise ValueError("Times must use 24-hour HH:MM format")
        if self.endTime <= self.startTime:
            raise ValueError("endTime must be later than startTime")
        return self
