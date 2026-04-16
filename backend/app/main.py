from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core import duckdb as duckdb_manager
from app.core import sqlite as sqlite_manager
from app.features.jobs.router import router as jobs_router, ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize databases on startup."""
    duckdb_manager.init_schema()
    await sqlite_manager.init_schema()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router)
app.include_router(ws_router)


@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}
