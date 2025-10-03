from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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


class UserSummary(BaseModel):
    id: UUID
    display_name: str

    class Config:
        model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=1)


class AuthResponse(BaseModel):
    user: UserSummary

    class Config:
        model_config = ConfigDict(from_attributes=True)


class DashboardDomainStat(BaseModel):
    domain_id: int
    domain_key: str
    domain_name: str
    icon: Optional[str]
    weekly_points: int
    weekly_target: int
    weekly_xp: int
    progress_ratio: float


class DashboardResponse(BaseModel):
    user_id: UUID
    display_name: str
    initials: str
    level: int
    current_xp: int
    xp_to_next: int
    domain_stats: list[DashboardDomainStat]


class TaskListItem(BaseModel):
    id: UUID
    title: str
    domain_id: int
    domain_key: str
    domain_name: str
    icon: Optional[str]
    xp: int
    completed_today: bool


class TaskListResponse(BaseModel):
    user_id: UUID
    tasks: list[TaskListItem]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    domain_key: str = Field(min_length=1, max_length=120)
    xp: int = Field(default=10, ge=0, le=10000)


class HistoryItem(BaseModel):
    id: UUID
    title: str
    occurred_at: datetime
    xp_awarded: int
    domain_id: int
    domain_key: str
    domain_name: str
    icon: Optional[str]


class WeeklyStat(BaseModel):
    domain_id: int
    domain_key: str
    domain_name: str
    icon: Optional[str]
    weekly_points: int
    weekly_xp: int


class BadgeItem(BaseModel):
    id: str
    title: str
    subtitle: str
    domain_id: Optional[int]


class ProgressionResponse(BaseModel):
    user_id: UUID
    recent_history: list[HistoryItem]
    weekly_stats: list[WeeklyStat]
    badges: list[BadgeItem]


class UserDomainSettingItem(BaseModel):
    domain_id: int
    domain_key: str
    domain_name: str
    icon: Optional[str]
    weekly_target_points: int
    is_enabled: bool


class UserDomainSettingUpdate(BaseModel):
    domain_id: int
    weekly_target_points: int = Field(ge=0, le=100000)
    is_enabled: bool


class UserDomainSettingUpdateRequest(BaseModel):
    settings: list[UserDomainSettingUpdate]


class UserProfile(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    timezone: str = Field(min_length=1, max_length=64)
    language: str = Field(min_length=2, max_length=10)
    notifications_enabled: bool
    first_day_of_week: int = Field(ge=0, le=6)


class UserProfileUpdateRequest(UserProfile):
    pass
