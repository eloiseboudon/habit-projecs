"""SQLAlchemy models for the Habit Projects backend."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from .database import Base


class TimestampMixin:
    """Common columns for creation and update timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class SourceType(enum.Enum):
    TASK_LOG = "task_log"
    CHALLENGE = "challenge"
    BONUS = "bonus"


class SnapshotPeriod(enum.Enum):
    DAY = "day"
    WEEK = "week"


class ChallengeStatus(enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Europe/Paris")

    avatar: Mapped["UserAvatar"] = relationship("UserAvatar", back_populates="user", uselist=False)
    domain_settings: Mapped[list["UserDomainSetting"]] = relationship(
        "UserDomainSetting", back_populates="user", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["UserTask"]] = relationship(
        "UserTask", back_populates="user", cascade="all, delete-orphan"
    )
    task_logs: Mapped[list["TaskLog"]] = relationship(
        "TaskLog", back_populates="user", cascade="all, delete-orphan"
    )
    xp_events: Mapped[list["XPEvent"]] = relationship(
        "XPEvent", back_populates="user", cascade="all, delete-orphan"
    )
    level: Mapped["UserLevel"] = relationship(
        "UserLevel", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    streaks: Mapped[list["Streak"]] = relationship(
        "Streak", back_populates="user", cascade="all, delete-orphan"
    )
    snapshots: Mapped[list["ProgressSnapshot"]] = relationship(
        "ProgressSnapshot", back_populates="user", cascade="all, delete-orphan"
    )
    user_settings: Mapped["UserSettings"] = relationship(
        "UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class Avatar(Base):
    __tablename__ = "avatars"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    asset_url: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    users: Mapped[list["UserAvatar"]] = relationship("UserAvatar", back_populates="avatar")


class UserAvatar(Base):
    __tablename__ = "user_avatar"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    avatar_id: Mapped[int] = mapped_column(
        ForeignKey("avatars.id", ondelete="RESTRICT"), nullable=False
    )
    color_theme: Mapped[str | None] = mapped_column(String(50), nullable=True)
    equipped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="avatar")
    avatar: Mapped[Avatar] = relationship("Avatar", back_populates="users")


class Domain(Base):
    __tablename__ = "domains"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(255), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    user_settings: Mapped[list["UserDomainSetting"]] = relationship(
        "UserDomainSetting", back_populates="domain"
    )
    task_templates: Mapped[list["TaskTemplate"]] = relationship(
        "TaskTemplate", back_populates="domain"
    )


class UserDomainSetting(Base):
    __tablename__ = "user_domain_settings"
    __table_args__ = (UniqueConstraint("user_id", "domain_id", name="uq_user_domain"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[int] = mapped_column(
        ForeignKey("domains.id", ondelete="CASCADE"), nullable=False
    )
    weekly_target_points: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped[User] = relationship("User", back_populates="domain_settings")
    domain: Mapped[Domain] = relationship("Domain", back_populates="user_settings")


class TaskTemplate(Base, TimestampMixin):
    __tablename__ = "task_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_id: Mapped[int] = mapped_column(ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    default_xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    default_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    domain: Mapped[Domain] = relationship("Domain", back_populates="task_templates")
    user_tasks: Mapped[list["UserTask"]] = relationship("UserTask", back_populates="template")


class UserTask(Base, TimestampMixin):
    __tablename__ = "user_tasks"
    __table_args__ = (
        Index("ix_user_tasks_user_is_favorite", "user_id", "is_favorite"),
        UniqueConstraint("user_id", "id", name="uq_user_task_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("task_templates.id", ondelete="SET NULL"), nullable=True
    )
    custom_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    custom_xp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped[User] = relationship("User", back_populates="tasks")
    template: Mapped[TaskTemplate | None] = relationship("TaskTemplate", back_populates="user_tasks")
    domain: Mapped[Domain] = relationship("Domain")
    task_logs: Mapped[list["TaskLog"]] = relationship("TaskLog", back_populates="user_task")


class TaskLog(Base, TimestampMixin):
    __tablename__ = "task_logs"
    __table_args__ = (
        Index("ix_task_logs_user_occurred", "user_id", "occurred_at"),
        Index("ix_task_logs_user_domain_occurred", "user_id", "domain_id", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    user_task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_tasks.id", ondelete="SET NULL"), nullable=True
    )
    domain_id: Mapped[int] = mapped_column(ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    xp_awarded: Mapped[int] = mapped_column(Integer, nullable=False)
    points_awarded: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")

    user: Mapped[User] = relationship("User", back_populates="task_logs")
    user_task: Mapped[UserTask | None] = relationship("UserTask", back_populates="task_logs")
    domain: Mapped[Domain] = relationship("Domain")
    xp_events: Mapped[list["XPEvent"]] = relationship(
        "XPEvent",
        primaryjoin=lambda: TaskLog.id == foreign(XPEvent.source_id),
        viewonly=True,
    )


class XPEvent(Base):
    __tablename__ = "xp_events"
    __table_args__ = (Index("ix_xp_events_user_occurred", "user_id", "occurred_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[int | None] = mapped_column(
        ForeignKey("domains.id", ondelete="SET NULL"), nullable=True
    )
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), nullable=False)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    delta_xp: Mapped[int] = mapped_column(Integer, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="xp_events")
    domain: Mapped[Domain | None] = relationship("Domain")
    task_log: Mapped[TaskLog | None] = relationship(
        "TaskLog",
        primaryjoin=lambda: foreign(XPEvent.source_id) == TaskLog.id,
        viewonly=True,
    )


class UserLevel(Base):
    __tablename__ = "user_level"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    current_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    current_xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    xp_to_next: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    last_update_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="level")


class Streak(Base):
    __tablename__ = "streaks"
    __table_args__ = (UniqueConstraint("user_id", "domain_id", name="uq_streak"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[int] = mapped_column(
        ForeignKey("domains.id", ondelete="CASCADE"), nullable=False
    )
    current_streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="streaks")
    domain: Mapped[Domain] = relationship("Domain")


class ProgressSnapshot(Base):
    __tablename__ = "progress_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "domain_id", "period", "period_start_date", name="uq_progress_snapshot"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[int] = mapped_column(
        ForeignKey("domains.id", ondelete="CASCADE"), nullable=False
    )
    period: Mapped[SnapshotPeriod] = mapped_column(Enum(SnapshotPeriod), nullable=False)
    period_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    points_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    xp_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User", back_populates="snapshots")
    domain: Mapped[Domain] = relationship("Domain")


class Challenge(Base, TimestampMixin):
    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    domain_id: Mapped[int] = mapped_column(ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_points: Mapped[int] = mapped_column(Integer, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    domain: Mapped[Domain] = relationship("Domain")
    participants: Mapped[list["UserChallenge"]] = relationship(
        "UserChallenge", back_populates="challenge", cascade="all, delete-orphan"
    )


class UserChallenge(Base):
    __tablename__ = "user_challenges"
    __table_args__ = (UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    challenge_id: Mapped[int] = mapped_column(
        ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False
    )
    progress_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[ChallengeStatus] = mapped_column(
        Enum(ChallengeStatus), nullable=False, default=ChallengeStatus.ACTIVE
    )

    user: Mapped[User] = relationship("User")
    challenge: Mapped[Challenge] = relationship("Challenge", back_populates="participants")


class Reward(Base, TimestampMixin):
    __tablename__ = "rewards"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    cost_xp: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user_rewards: Mapped[list["UserReward"]] = relationship("UserReward", back_populates="reward")


class UserReward(Base):
    __tablename__ = "user_rewards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reward_id: Mapped[int] = mapped_column(
        ForeignKey("rewards.id", ondelete="CASCADE"), nullable=False
    )
    acquired_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User")
    reward: Mapped[Reward] = relationship("Reward", back_populates="user_rewards")


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="fr")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    first_day_of_week: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    avatar_type: Mapped[str] = mapped_column(String(30), nullable=False, default="adventurer")

    user: Mapped[User] = relationship("User", back_populates="user_settings")


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship("User")
