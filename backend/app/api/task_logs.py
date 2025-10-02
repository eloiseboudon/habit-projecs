from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_session
from ..schemas import TaskLogCreate, TaskLogRead
from ..services.task_logs import TaskLogError, TaskLogNotFound, create_task_log

router = APIRouter(prefix="/task-logs", tags=["task_logs"])


def get_db_session():
    with get_session() as session:
        yield session


@router.post("", response_model=TaskLogRead, status_code=status.HTTP_201_CREATED)
def create_task_log_endpoint(
    payload: TaskLogCreate,
    session: Session = Depends(get_db_session),
):
    try:
        task_log = create_task_log(session, payload)
        session.refresh(task_log)
        return task_log
    except TaskLogNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TaskLogError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
