from pydantic import BaseModel, field_validator


class CronScheduleResponse(BaseModel):
    action_id: str
    label: str
    enabled: bool
    run_time: str
    last_run_at: str | None = None
    last_job_id: str | None = None
    next_run_at: str | None = None


class CronScheduleUpdate(BaseModel):
    enabled: bool | None = None
    run_time: str | None = None

    @field_validator("run_time")
    @classmethod
    def validate_run_time(cls, v: str | None) -> str | None:
        if v is None:
            return v
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("run_time must be HH:MM")
        h, m = int(parts[0]), int(parts[1])
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise ValueError("run_time must be valid HH:MM (00:00-23:59)")
        return f"{h:02d}:{m:02d}"
