from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_session
from ..schemas import RewardRead, TaskLogCreate, TaskLogRead
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
        task_log, unlocked_rewards = create_task_log(session, payload)
        session.refresh(task_log)
        task_log_model = TaskLogRead.model_validate(task_log, from_attributes=True)
        task_log_model.unlocked_rewards = [
            RewardRead.model_validate(reward, from_attributes=True)
            for reward in unlocked_rewards
        ]
        return task_log_model
    except TaskLogNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TaskLogError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
