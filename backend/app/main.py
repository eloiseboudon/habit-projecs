from __future__ import annotations

from fastapi import FastAPI

from .api.task_logs import router as task_logs_router
from .config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.include_router(task_logs_router)


@app.get("/health", tags=["health"])
def healthcheck():
    return {"status": "ok"}
