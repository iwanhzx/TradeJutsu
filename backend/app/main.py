from fastapi import FastAPI
from app.config import settings


app = FastAPI(title=settings.app_name)


@app.get(f"{settings.api_prefix}/health")
async def health():
    return {"status": "ok"}
