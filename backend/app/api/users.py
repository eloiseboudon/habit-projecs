"""API routes for accessing user dashboard data."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_session
from ..models import (
    Domain,
    ProgressSnapshot,
    SnapshotPeriod,
    Streak,
    TaskLog,
    TaskTemplate,
    User,
    UserDomainSetting,
    UserLevel,
    UserTask,
)
from ..schemas import (
    BadgeItem,
    DashboardDomainStat,
    DashboardResponse,
    HistoryItem,
    ProgressionResponse,
    TaskCreate,
    TaskListItem,
    TaskListResponse,
    UserSummary,
    WeeklyStat,
)
from ..services.task_logs import monday_start

router = APIRouter(prefix="/users", tags=["users"])


def get_db_session():
    with get_session() as session:
        yield session


def get_today_dates() -> tuple[datetime, datetime]:
    settings = get_settings()
    tz = ZoneInfo(settings.timezone)
    now = datetime.now(tz)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=tz)
    end_of_day = start_of_day.replace(hour=23, minute=59, second=59, microsecond=999999)
    return start_of_day, end_of_day


def compute_initials(name: str) -> str:
    parts = [part[0] for part in name.strip().split() if part]
    if not parts:
        return "?"
    initials = "".join(parts[:2])
    return initials.upper()


def normalize_text(value: str) -> str:
    """Normalize text for robust comparisons.

    The function removes diacritics, lowers the case and trims whitespace.
    This makes it easier to match domain identifiers that may have been
    transformed by the client (e.g. different casing or accent stripping).
    """

    normalized = unicodedata.normalize("NFKD", value)
    without_diacritics = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return without_diacritics.lower().strip()


def resolve_user(session: Session, user_id: UUID) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    return user


@router.get("", response_model=list[UserSummary])
def list_users(session: Session = Depends(get_db_session)) -> list[UserSummary]:
    stmt = select(User).order_by(User.display_name)
    users = session.scalars(stmt).all()
    return users


@router.get("/{user_id}/dashboard", response_model=DashboardResponse)
def get_dashboard(user_id: UUID, session: Session = Depends(get_db_session)) -> DashboardResponse:
    user = resolve_user(session, user_id)

    level = session.get(UserLevel, user_id)
    if level:
        current_level = level.current_level
        current_xp = level.current_xp
        xp_to_next = level.xp_to_next
    else:
        current_level = 1
        current_xp = 0
        xp_to_next = 100

    today = datetime.now(ZoneInfo(get_settings().timezone)).date()
    current_week = monday_start(today)

    settings_stmt = (
        select(UserDomainSetting, Domain, ProgressSnapshot)
        .join(Domain, UserDomainSetting.domain_id == Domain.id)
        .outerjoin(
            ProgressSnapshot,
            (
                (ProgressSnapshot.user_id == user_id)
                & (ProgressSnapshot.domain_id == Domain.id)
                & (ProgressSnapshot.period == SnapshotPeriod.WEEK)
                & (ProgressSnapshot.period_start_date == current_week)
            ),
        )
        .where(UserDomainSetting.user_id == user_id, UserDomainSetting.is_enabled.is_(True))
        .order_by(Domain.order_index)
    )

    domain_stats: list[DashboardDomainStat] = []
    for domain_setting, domain, snapshot in session.execute(settings_stmt):
        weekly_points = snapshot.points_total if snapshot else 0
        weekly_xp = snapshot.xp_total if snapshot else 0
        weekly_target = domain_setting.weekly_target_points or 0
        progress = 0.0
        if weekly_target > 0:
            progress = min(weekly_points / weekly_target, 1.0)
        domain_stats.append(
            DashboardDomainStat(
                domain_id=domain.id,
                domain_key=domain.key,
                domain_name=domain.name,
                icon=domain.icon,
                weekly_points=weekly_points,
                weekly_target=weekly_target,
                weekly_xp=weekly_xp,
                progress_ratio=progress,
            )
        )

    return DashboardResponse(
        user_id=user.id,
        display_name=user.display_name,
        initials=compute_initials(user.display_name),
        level=current_level,
        current_xp=current_xp,
        xp_to_next=xp_to_next,
        domain_stats=domain_stats,
    )


@router.get("/{user_id}/tasks", response_model=TaskListResponse)
def list_tasks(user_id: UUID, session: Session = Depends(get_db_session)) -> TaskListResponse:
    user = resolve_user(session, user_id)
    start_of_day, end_of_day = get_today_dates()

    todays_logs_stmt = (
        select(TaskLog.user_task_id)
        .where(
            TaskLog.user_id == user_id,
            TaskLog.user_task_id.is_not(None),
            TaskLog.occurred_at >= start_of_day,
            TaskLog.occurred_at <= end_of_day,
        )
    )
    todays_logs = {row[0] for row in session.execute(todays_logs_stmt) if row[0] is not None}

    tasks_stmt = (
        select(UserTask, Domain, TaskTemplate)
        .join(Domain, UserTask.domain_id == Domain.id)
        .outerjoin(TaskTemplate, UserTask.template_id == TaskTemplate.id)
        .where(UserTask.user_id == user.id, UserTask.is_active.is_(True))
        .order_by(UserTask.created_at.desc())
    )

    tasks: list[TaskListItem] = []
    for user_task, domain, template in session.execute(tasks_stmt):
        title = user_task.custom_title or (template.title if template else domain.name)
        xp = user_task.custom_xp or (template.default_xp if template else 0)
        tasks.append(
            TaskListItem(
                id=user_task.id,
                title=title,
                domain_id=domain.id,
                domain_key=domain.key,
                domain_name=domain.name,
                icon=domain.icon,
                xp=xp,
                completed_today=user_task.id in todays_logs,
            )
        )

    return TaskListResponse(user_id=user.id, tasks=tasks)


@router.post(
    "/{user_id}/tasks",
    response_model=TaskListItem,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    user_id: UUID,
    payload: TaskCreate,
    session: Session = Depends(get_db_session),
) -> TaskListItem:
    user = resolve_user(session, user_id)

    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le titre de la quête est obligatoire.",
        )

    domain = session.scalar(select(Domain).where(Domain.key == payload.domain_key))
    if not domain:
        requested_key = normalize_text(payload.domain_key)
        for candidate in session.scalars(select(Domain)):
            if normalize_text(candidate.key) == requested_key:
                domain = candidate
                break
            if candidate.name and normalize_text(candidate.name) == requested_key:
                domain = candidate
                break

    if not domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domaine inconnu pour cette quête.",
        )

    user_task = UserTask(
        user_id=user.id,
        domain_id=domain.id,
        custom_title=title,
        custom_xp=payload.xp,
        custom_points=payload.xp,
        is_active=True,
        is_favorite=True,
    )

    session.add(user_task)
    session.commit()
    session.refresh(user_task)

    return TaskListItem(
        id=user_task.id,
        title=title,
        domain_id=domain.id,
        domain_key=domain.key,
        domain_name=domain.name,
        icon=domain.icon,
        xp=payload.xp,
        completed_today=False,
    )


@router.get("/{user_id}/progression", response_model=ProgressionResponse)
def get_progression(user_id: UUID, session: Session = Depends(get_db_session)) -> ProgressionResponse:
    _ = resolve_user(session, user_id)

    history_stmt = (
        select(TaskLog, Domain, UserTask, TaskTemplate)
        .join(Domain, TaskLog.domain_id == Domain.id)
        .outerjoin(UserTask, TaskLog.user_task_id == UserTask.id)
        .outerjoin(TaskTemplate, UserTask.template_id == TaskTemplate.id)
        .where(TaskLog.user_id == user_id)
        .order_by(TaskLog.occurred_at.desc())
        .limit(20)
    )

    recent_history: list[HistoryItem] = []
    for log, domain, user_task, template in session.execute(history_stmt):
        title = domain.name
        if user_task:
            title = user_task.custom_title or (template.title if template else domain.name)
        recent_history.append(
            HistoryItem(
                id=log.id,
                title=title,
                occurred_at=log.occurred_at,
                xp_awarded=log.xp_awarded,
                domain_id=domain.id,
                domain_key=domain.key,
                domain_name=domain.name,
                icon=domain.icon,
            )
        )

    today = datetime.now(ZoneInfo(get_settings().timezone)).date()
    current_week = monday_start(today)

    stats_stmt = (
        select(Domain, ProgressSnapshot)
        .join(UserDomainSetting, (UserDomainSetting.domain_id == Domain.id) & (UserDomainSetting.user_id == user_id))
        .outerjoin(
            ProgressSnapshot,
            (
                (ProgressSnapshot.user_id == user_id)
                & (ProgressSnapshot.domain_id == Domain.id)
                & (ProgressSnapshot.period == SnapshotPeriod.WEEK)
                & (ProgressSnapshot.period_start_date == current_week)
            ),
        )
        .where(UserDomainSetting.is_enabled.is_(True))
        .order_by(Domain.order_index)
    )

    weekly_stats: list[WeeklyStat] = []
    for domain, snapshot in session.execute(stats_stmt):
        weekly_stats.append(
            WeeklyStat(
                domain_id=domain.id,
                domain_key=domain.key,
                domain_name=domain.name,
                icon=domain.icon,
                weekly_points=snapshot.points_total if snapshot else 0,
                weekly_xp=snapshot.xp_total if snapshot else 0,
            )
        )

    streak_stmt = (
        select(Streak, Domain)
        .join(Domain, Streak.domain_id == Domain.id)
        .where(Streak.user_id == user_id, Streak.current_streak_days > 0)
        .order_by(Streak.current_streak_days.desc())
    )

    badges: list[BadgeItem] = []
    for streak, domain in session.execute(streak_stmt):
        badges.append(
            BadgeItem(
                id=f"streak-{streak.id}",
                title=f"{streak.current_streak_days} jours consécutifs",
                subtitle=f"{domain.name} • Meilleur : {streak.best_streak_days} jours",
                domain_id=domain.id,
            )
        )

    return ProgressionResponse(
        user_id=user_id,
        recent_history=recent_history,
        weekly_stats=weekly_stats,
        badges=badges,
    )
