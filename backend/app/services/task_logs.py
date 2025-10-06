"""Business logic for task log creation and related side effects."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    Domain,
    ProgressSnapshot,
    Reward,
    SnapshotPeriod,
    SourceType,
    Streak,
    TaskLog,
    User,
    UserLevel,
    UserTask,
    XPEvent,
)
from ..schemas import TaskLogCreate
from .rewards import check_rewards


class TaskLogError(Exception):
    """Base exception for task log operations."""


class TaskLogNotFound(TaskLogError):
    """Raised when a required entity is missing."""


def xp_to_next(level: int) -> int:
    """Return the amount of XP required to reach the next level."""

    return 100 + max(level - 1, 0) * 25


def get_user_task(session: Session, user_task_id: UUID, user_id: UUID) -> UserTask:
    stmt = select(UserTask).where(
        UserTask.id == user_task_id,
        UserTask.user_id == user_id,
        UserTask.is_active.is_(True),
    )
    user_task = session.execute(stmt).scalar_one_or_none()
    if not user_task:
        raise TaskLogNotFound("User task introuvable ou inactif.")
    return user_task


def resolve_domain(session: Session, domain_id: Optional[int]) -> Domain:
    if domain_id is None:
        raise TaskLogError("Un domain_id doit être spécifié.")
    domain = session.get(Domain, domain_id)
    if not domain:
        raise TaskLogNotFound("Domaine introuvable.")
    return domain


def resolve_rewards(
    user_task: Optional[UserTask],
    quantity: Optional[Decimal],
) -> tuple[int, int, Optional[str]]:
    base_xp = None
    base_points = None
    unit: Optional[str] = None

    if user_task:
        base_xp = user_task.custom_xp
        base_points = user_task.custom_points
        if user_task.template:
            if base_xp is None:
                base_xp = user_task.template.default_xp
            if base_points is None:
                base_points = user_task.template.default_points
            unit = user_task.template.unit
    if base_xp is None:
        base_xp = 0
    if base_points is None:
        base_points = 0

    multiplier = Decimal(quantity) if quantity is not None else Decimal(1)
    xp_awarded = int(multiplier * Decimal(base_xp)) if base_xp else 0
    points_awarded = int(multiplier * Decimal(base_points)) if base_points else 0

    return xp_awarded, points_awarded, unit


def ensure_user_exists(session: Session, user_id: UUID) -> User:
    user = session.get(User, user_id)
    if not user:
        raise TaskLogNotFound("Utilisateur introuvable.")
    return user


def get_or_create_level(session: Session, user: User) -> UserLevel:
    level = session.get(UserLevel, user.id)
    if not level:
        level = UserLevel(
            user_id=user.id, current_level=1, current_xp=0, xp_to_next=xp_to_next(1)
        )
        session.add(level)
        session.flush()
    return level


def update_level(level: UserLevel, xp_awarded: int, occurred_at: datetime) -> None:
    level.current_xp += xp_awarded
    leveled_up = False
    while level.current_xp >= level.xp_to_next:
        level.current_xp -= level.xp_to_next
        level.current_level += 1
        level.xp_to_next = xp_to_next(level.current_level)
        leveled_up = True
    if leveled_up or xp_awarded:
        level.last_update_at = occurred_at


def update_streak(
    session: Session, user_id: UUID, domain_id: int, occurred_date: date
) -> Streak:
    stmt = select(Streak).where(
        Streak.user_id == user_id, Streak.domain_id == domain_id
    )
    streak = session.execute(stmt).scalar_one_or_none()
    if not streak:
        streak = Streak(
            user_id=user_id,
            domain_id=domain_id,
            current_streak_days=0,
            best_streak_days=0,
            last_activity_date=None,
        )
        session.add(streak)
        session.flush()

    if streak.last_activity_date == occurred_date:
        pass
    elif (
        streak.last_activity_date
        and occurred_date == streak.last_activity_date + timedelta(days=1)
    ):
        streak.current_streak_days += 1
        streak.last_activity_date = occurred_date
    else:
        streak.current_streak_days = 1
        streak.last_activity_date = occurred_date

    if streak.current_streak_days > streak.best_streak_days:
        streak.best_streak_days = streak.current_streak_days

    return streak


def update_snapshot(
    session: Session,
    user_id: UUID,
    domain_id: int,
    period: str,
    start_date: date,
    xp_awarded: int,
    points_awarded: int,
    occurred_at: datetime,
) -> ProgressSnapshot:
    stmt = select(ProgressSnapshot).where(
        ProgressSnapshot.user_id == user_id,
        ProgressSnapshot.domain_id == domain_id,
        ProgressSnapshot.period == period,
        ProgressSnapshot.period_start_date == start_date,
    )
    snapshot = session.execute(stmt).scalar_one_or_none()
    if not snapshot:
        snapshot = ProgressSnapshot(
            user_id=user_id,
            domain_id=domain_id,
            period=period,
            period_start_date=start_date,
            points_total=0,
            xp_total=0,
        )
        session.add(snapshot)
        session.flush()

    snapshot.points_total += points_awarded
    snapshot.xp_total += xp_awarded
    snapshot.computed_at = occurred_at
    return snapshot


def monday_start(date_value: date) -> date:
    return date_value - timedelta(days=date_value.weekday())


def create_task_log(session: Session, payload: TaskLogCreate) -> tuple[TaskLog, list[Reward]]:
    """Create a task log following MVP rules."""

    user = ensure_user_exists(session, payload.user_id)

    user_task: Optional[UserTask] = None
    domain_id: Optional[int] = payload.domain_id

    if payload.user_task_id:
        user_task = get_user_task(session, payload.user_task_id, payload.user_id)
        domain_id = user_task.domain_id

    if domain_id is None:
        raise TaskLogError("Impossible de déterminer le domaine de la tâche.")

    resolve_domain(session, domain_id)

    xp_awarded, points_awarded, default_unit = resolve_rewards(
        user_task, payload.quantity
    )
    unit = payload.unit or default_unit
    if payload.occurred_at:
        occurred_at = payload.occurred_at
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)
        else:
            occurred_at = occurred_at.astimezone(timezone.utc)
    else:
        occurred_at = datetime.now(timezone.utc)

    task_log = TaskLog(
        user_id=payload.user_id,
        user_task_id=payload.user_task_id,
        domain_id=domain_id,
        occurred_at=occurred_at,
        quantity=payload.quantity,
        unit=unit,
        notes=payload.notes,
        xp_awarded=xp_awarded,
        points_awarded=points_awarded,
        source=payload.source,
    )
    session.add(task_log)
    session.flush()

    xp_event = XPEvent(
        user_id=payload.user_id,
        domain_id=domain_id,
        source_type=SourceType.TASK_LOG,
        source_id=task_log.id,
        delta_xp=xp_awarded,
        occurred_at=occurred_at,
    )
    session.add(xp_event)

    level = get_or_create_level(session, user)
    update_level(level, xp_awarded, occurred_at)

    occurred_date = occurred_at.astimezone(timezone.utc).date()
    update_streak(session, payload.user_id, domain_id, occurred_date)

    update_snapshot(
        session,
        payload.user_id,
        domain_id,
        SnapshotPeriod.DAY.value,
        occurred_date,
        xp_awarded,
        points_awarded,
        occurred_at,
    )
    update_snapshot(
        session,
        payload.user_id,
        domain_id,
        SnapshotPeriod.WEEK.value,
        monday_start(occurred_date),
        xp_awarded,
        points_awarded,
        occurred_at,
    )

    unlocked_rewards = check_rewards(session, payload.user_id)

    return task_log, unlocked_rewards
