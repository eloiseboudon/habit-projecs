from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .models import ChallengeStatus, SnapshotPeriod, SourceType


class DomainBase(BaseModel):
    id: int
    key: str
    name: str
    icon: Optional[str]
    order_index: int

    class Config:
        model_config = ConfigDict(from_attributes=True)


class TaskLogCreate(BaseModel):
    user_id: UUID
    user_task_id: Optional[UUID] = None
    domain_id: Optional[int] = None
    occurred_at: Optional[datetime] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    source: str = Field(default="manual")


class TaskLogRead(BaseModel):
    id: UUID
    user_id: UUID
    user_task_id: Optional[UUID]
    domain_id: int
    occurred_at: datetime
    quantity: Optional[Decimal]
    unit: Optional[str]
    notes: Optional[str]
    xp_awarded: int
    points_awarded: int
    source: str

    class Config:
        model_config = ConfigDict(from_attributes=True)


class XPEventRead(BaseModel):
    id: UUID
    user_id: UUID
    domain_id: Optional[int]
    source_type: SourceType
    source_id: Optional[UUID]
    delta_xp: int
    occurred_at: datetime

    class Config:
        model_config = ConfigDict(from_attributes=True)


class UserLevelRead(BaseModel):
    user_id: UUID
    current_level: int
    current_xp: int
    xp_to_next: int
    last_update_at: datetime

    class Config:
        model_config = ConfigDict(from_attributes=True)


class ProgressSnapshotRead(BaseModel):
    id: UUID
    user_id: UUID
    domain_id: int
    period: SnapshotPeriod
    period_start_date: date
    points_total: int
    xp_total: int
    computed_at: datetime

    class Config:
        model_config = ConfigDict(from_attributes=True)


class StreakRead(BaseModel):
    id: int
    user_id: UUID
    domain_id: int
    current_streak_days: int
    best_streak_days: int
    last_activity_date: Optional[date]

    class Config:
        model_config = ConfigDict(from_attributes=True)


class ChallengeRead(BaseModel):
    id: int
    title: str
    domain_id: int
    start_date: date
    end_date: date
    target_points: int
    xp_reward: int
    is_active: bool

    class Config:
        model_config = ConfigDict(from_attributes=True)


class UserChallengeRead(BaseModel):
    id: int
    user_id: UUID
    challenge_id: int
    progress_points: int
    status: ChallengeStatus

    class Config:
        model_config = ConfigDict(from_attributes=True)
