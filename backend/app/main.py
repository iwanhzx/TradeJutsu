import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

from app.core import duckdb as duckdb_manager  # noqa: E402
from app.core import sqlite as sqlite_manager  # noqa: E402
from app.core.errors import (  # noqa: E402
    TradeJutsuError,
    SymbolNotFoundError,
    SymbolAlreadyExistsError,
    DataFetchError,
    InsufficientDataError,
)
from app.features.jobs.router import router as jobs_router, ws_router  # noqa: E402
from app.features.symbols.router import router as symbols_router  # noqa: E402
from app.features.prices.router import router as prices_router  # noqa: E402
from app.features.analytics.router import router as analytics_router  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize databases on startup."""
    logger.info("TradeJutsu starting up")
    duckdb_manager.init_schema()
    await sqlite_manager.init_schema()
    logger.info("Database schemas initialized")
    yield
    logger.info("TradeJutsu shutting down")


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
app.include_router(symbols_router)
app.include_router(prices_router)
app.include_router(analytics_router)

# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------

access_logger = logging.getLogger("tradejutsu.access")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.url.path == f"{settings.api_prefix}/health":
        return await call_next(request)
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    access_logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------

_STATUS_MAP: dict[type, int] = {
    SymbolNotFoundError: 404,
    SymbolAlreadyExistsError: 409,
    DataFetchError: 502,
    InsufficientDataError: 422,
}


@app.exception_handler(TradeJutsuError)
async def tradejutsu_error_handler(request: Request, exc: TradeJutsuError):
    status = _STATUS_MAP.get(type(exc), 400)
    logger.warning("Domain error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=status, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}
