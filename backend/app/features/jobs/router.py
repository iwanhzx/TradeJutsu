from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from app.config import settings
from app.core.websocket import ws_manager
from app.features.jobs import service
from app.features.jobs.models import JobResponse

router = APIRouter(prefix=f"{settings.api_prefix}/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
async def list_jobs():
    return await service.get_jobs()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    job = await service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job


# WebSocket router — mounted separately
ws_router = APIRouter()


@ws_router.websocket(f"{settings.api_prefix}/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
