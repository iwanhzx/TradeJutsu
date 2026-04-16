from pydantic import BaseModel


class JobResponse(BaseModel):
    job_id: str
    job_type: str
    symbol: str | None = None
    status: str
    progress: int = 0
    total_items: int = 0
    completed_items: int = 0
    error: str | None = None
    created_at: str
    updated_at: str
    completed_at: str | None = None


class JobCreated(BaseModel):
    job_id: str
    status: str = "pending"
