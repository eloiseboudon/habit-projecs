"""API routes for accessing user dashboard data."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
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
    Reward,
    UserReward,
    User,
    UserDomainSetting,
    UserLevel,
    UserSettings,
    UserTask,
)
from ..schemas import (
    BadgeItem,
    DashboardDomainStat,
    DashboardResponse,
    HistoryItem,
    ProgressionResponse,
    TaskCreate,
    TaskFrequency,
    TaskListItem,
    TaskListResponse,
    TaskTemplateItem,
    TaskVisibilityUpdateRequest,
    UserDomainSettingItem,
    UserDomainSettingUpdateRequest,
    UserProfile,
    UserProfileUpdateRequest,
    UserSummary,
    WeeklyStat,
)
from ..services.task_logs import monday_start

router = APIRouter(prefix="/users", tags=["users"])


def get_db_session():
    with get_session() as session:
        yield session


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


def get_user_timezone(user: User) -> ZoneInfo:
    """Return the timezone configured for the user, with a safe fallback."""

    settings = get_settings()
    tz_name = user.timezone or settings.timezone
    try:
        return ZoneInfo(tz_name)
    except Exception:
        # In case the stored timezone is invalid, fall back to the application default.
        return ZoneInfo(settings.timezone)


def resolve_task_frequency(value: str | TaskFrequency | None) -> TaskFrequency:
    """Convert persisted frequency values to a strongly-typed enum."""

    if isinstance(value, TaskFrequency):
        return value
    try:
        return TaskFrequency(value or TaskFrequency.DAILY.value)
    except ValueError:
        return TaskFrequency.DAILY


FREQUENCY_TO_PERIOD: dict[TaskFrequency, SnapshotPeriod] = {
    TaskFrequency.DAILY: SnapshotPeriod.DAY,
    TaskFrequency.WEEKLY: SnapshotPeriod.WEEK,
    TaskFrequency.MONTHLY: SnapshotPeriod.MONTH,
}

PERIOD_TO_FREQUENCY: dict[SnapshotPeriod, TaskFrequency] = {
    period: frequency for frequency, period in FREQUENCY_TO_PERIOD.items()
}


def map_frequency_to_period(frequency: TaskFrequency) -> SnapshotPeriod:
    return FREQUENCY_TO_PERIOD.get(frequency, SnapshotPeriod.DAY)


def map_period_to_frequency(period: SnapshotPeriod) -> TaskFrequency:
    return PERIOD_TO_FREQUENCY.get(period, TaskFrequency.DAILY)


def add_months(start: datetime, months: int) -> datetime:
    total_months = (start.year * 12 + (start.month - 1)) + months
    year = total_months // 12
    month = total_months % 12 + 1
    return start.replace(year=year, month=month)


def compute_period_window(
    period: SnapshotPeriod,
    *,
    now: datetime,
    first_day_of_week: int,
    interval: int = 1,
) -> tuple[datetime, datetime]:
    """Return the start and end datetime for the requested frequency window."""

    normalized_interval = max(interval, 1)
    # Ensure first_day_of_week stays in the [0, 6] range expected by datetime.weekday()
    normalized_first_day = first_day_of_week % 7

    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if period is SnapshotPeriod.DAY:
        baseline = date(1970, 1, 1)
        days_since_baseline = (start_of_day.date() - baseline).days
        offset_days = days_since_baseline % normalized_interval
        period_start = start_of_day - timedelta(days=offset_days)
        period_end = period_start + timedelta(days=normalized_interval) - timedelta(microseconds=1)
    elif period is SnapshotPeriod.WEEK:
        weekday = start_of_day.weekday()
        days_difference = (weekday - normalized_first_day) % 7
        current_week_start = start_of_day - timedelta(days=days_difference)

        baseline = date(1970, 1, 5)  # Monday as baseline
        baseline_adjustment = (baseline.weekday() - normalized_first_day) % 7
        aligned_baseline = baseline - timedelta(days=baseline_adjustment)
        baseline_start = datetime.combine(
            aligned_baseline, datetime.min.time(), tzinfo=start_of_day.tzinfo
        )

        weeks_since_baseline = (current_week_start.date() - baseline_start.date()).days // 7
        block_start_weeks = weeks_since_baseline - (weeks_since_baseline % normalized_interval)
        period_start = baseline_start + timedelta(weeks=block_start_weeks)
        period_end = period_start + timedelta(weeks=normalized_interval) - timedelta(microseconds=1)
    elif period is SnapshotPeriod.MONTH:
        period_start = start_of_day.replace(day=1)

        baseline = date(1970, 1, 1)
        baseline_start = datetime.combine(baseline, datetime.min.time(), tzinfo=start_of_day.tzinfo)
        months_since_baseline = (
            (period_start.year - baseline_start.year) * 12
            + (period_start.month - baseline_start.month)
        )
        block_start_months = months_since_baseline - (
            months_since_baseline % normalized_interval
        )
        period_start = add_months(baseline_start, block_start_months)
        next_period_start = add_months(period_start, normalized_interval)
        period_end = next_period_start - timedelta(microseconds=1)
    else:
        period_start = start_of_day
        period_end = period_start + timedelta(days=normalized_interval) - timedelta(microseconds=1)

    return period_start, period_end


def count_task_occurrences(
    session: Session,
    *,
    user_id: UUID,
    user_task_id: UUID,
    period_start: datetime,
    period_end: datetime,
) -> int:
    """Return the number of logs recorded for a task in the provided period."""

    stmt = (
        select(func.count())
        .select_from(TaskLog)
        .where(
            TaskLog.user_id == user_id,
            TaskLog.user_task_id == user_task_id,
            TaskLog.occurred_at >= period_start.astimezone(timezone.utc),
            TaskLog.occurred_at <= period_end.astimezone(timezone.utc),
        )
    )
    result = session.scalar(stmt)
    return int(result or 0)


def normalize_interval(value: int | None) -> int:
    return value if value and value > 0 else 1


def resolve_task_schedule_from_payload(payload: TaskCreate) -> tuple[SnapshotPeriod, int]:
    period = payload.schedule_period
    if period is None:
        frequency = resolve_task_frequency(payload.frequency_type)
        period = map_frequency_to_period(frequency)
    interval = normalize_interval(payload.schedule_interval)
    return period, interval


def resolve_task_schedule(user_task: UserTask) -> tuple[SnapshotPeriod, int]:
    period = user_task.schedule_period
    if period is None:
        frequency = resolve_task_frequency(user_task.frequency_type)
        period = map_frequency_to_period(frequency)
    interval = normalize_interval(getattr(user_task, "schedule_interval", 1))
    return period, interval


def build_task_list_item(
    user_task: UserTask,
    domain: Domain,
    template: TaskTemplate | None,
    *,
    occurrences_completed: int,
    period_start: datetime,
    period_end: datetime,
) -> TaskListItem:
    title = user_task.custom_title or (template.title if template else domain.name)
    xp = (
        user_task.custom_xp
        if user_task.custom_xp is not None
        else (template.default_xp if template else 0)
    )

    schedule_period, schedule_interval = resolve_task_schedule(user_task)
    frequency = map_period_to_frequency(schedule_period)
    target_occurrences = user_task.target_occurrences or 1
    completed_occurrences = max(0, occurrences_completed)
    remaining_occurrences = max(target_occurrences - completed_occurrences, 0)
    is_completed = remaining_occurrences == 0

    return TaskListItem(
        id=user_task.id,
        title=title,
        domain_id=domain.id,
        domain_key=domain.key,
        domain_name=domain.name,
        icon=domain.icon,
        xp=xp,
        schedule_period=schedule_period,
        schedule_interval=schedule_interval,
        frequency_type=frequency,
        target_occurrences=target_occurrences,
        occurrences_completed=completed_occurrences,
        occurrences_remaining=remaining_occurrences,
        period_start=period_start,
        period_end=period_end,
        completed_today=is_completed,
        is_custom=template is None,
        show_in_global=user_task.is_favorite,
    )


def resolve_user(session: Session, user_id: UUID) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    return user


def ensure_user_settings(session: Session, user: User) -> UserSettings:
    settings = user.user_settings
    if settings:
        return settings

    settings = UserSettings(user_id=user.id)
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


def serialize_domain_settings(session: Session, user_id: UUID) -> list[UserDomainSettingItem]:
    domain_stmt = select(Domain).order_by(Domain.order_index)
    domains = session.scalars(domain_stmt).all()

    settings_stmt = select(UserDomainSetting).where(UserDomainSetting.user_id == user_id)
    settings_map = {setting.domain_id: setting for setting in session.scalars(settings_stmt)}

    serialized: list[UserDomainSettingItem] = []
    for domain in domains:
        setting = settings_map.get(domain.id)
        serialized.append(
            UserDomainSettingItem(
                domain_id=domain.id,
                domain_key=domain.key,
                domain_name=domain.name,
                icon=domain.icon,
                weekly_target_points=setting.weekly_target_points if setting else 100,
                is_enabled=setting.is_enabled if setting else True,
            )
        )

    return serialized


def serialize_user_profile(user: User, settings: UserSettings) -> UserProfile:
    return UserProfile(
        display_name=user.display_name,
        email=user.email,
        timezone=user.timezone,
        language=settings.language,
        notifications_enabled=settings.notifications_enabled,
        first_day_of_week=settings.first_day_of_week,
        avatar_type=settings.avatar_type,
    )


@router.get("/{user_id}/domain-settings", response_model=list[UserDomainSettingItem])
def get_domain_settings(
    user_id: UUID, session: Session = Depends(get_db_session)
) -> list[UserDomainSettingItem]:
    _ = resolve_user(session, user_id)
    return serialize_domain_settings(session, user_id)


@router.put("/{user_id}/domain-settings", response_model=list[UserDomainSettingItem])
def update_domain_settings(
    user_id: UUID,
    payload: UserDomainSettingUpdateRequest,
    session: Session = Depends(get_db_session),
) -> list[UserDomainSettingItem]:
    user = resolve_user(session, user_id)

    if not payload.settings:
        return serialize_domain_settings(session, user.id)

    domain_ids = {item.domain_id for item in payload.settings}
    if not domain_ids:
        return serialize_domain_settings(session, user.id)

    domains_stmt = select(Domain).where(Domain.id.in_(domain_ids))
    domains = session.scalars(domains_stmt).all()
    found_domain_ids = {domain.id for domain in domains}
    missing = domain_ids - found_domain_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certains domaines sont inconnus pour cet utilisateur.",
        )

    existing_stmt = (
        select(UserDomainSetting)
        .where(UserDomainSetting.user_id == user.id)
        .where(UserDomainSetting.domain_id.in_(domain_ids))
    )
    existing_settings = {
        setting.domain_id: setting for setting in session.scalars(existing_stmt)
    }

    for item in payload.settings:
        setting = existing_settings.get(item.domain_id)
        if setting:
            setting.weekly_target_points = item.weekly_target_points
            setting.is_enabled = item.is_enabled
        else:
            session.add(
                UserDomainSetting(
                    user_id=user.id,
                    domain_id=item.domain_id,
                    weekly_target_points=item.weekly_target_points,
                    is_enabled=item.is_enabled,
                )
            )

    session.commit()

    return serialize_domain_settings(session, user.id)


@router.get("/{user_id}/profile", response_model=UserProfile)
def get_user_profile(user_id: UUID, session: Session = Depends(get_db_session)) -> UserProfile:
    user = resolve_user(session, user_id)
    settings = ensure_user_settings(session, user)
    return serialize_user_profile(user, settings)


@router.put("/{user_id}/profile", response_model=UserProfile)
def update_user_profile(
    user_id: UUID,
    payload: UserProfileUpdateRequest,
    session: Session = Depends(get_db_session),
) -> UserProfile:
    user = resolve_user(session, user_id)

    display_name = payload.display_name.strip()
    if not display_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nom d'affichage ne peut pas être vide.",
        )

    email = payload.email.strip().lower()
    existing_user = session.scalar(select(User).where(User.email == email))
    if existing_user and existing_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette adresse e-mail est déjà utilisée par un autre compte.",
        )

    timezone = payload.timezone.strip()
    if not timezone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fuseau horaire est obligatoire.",
        )

    user.display_name = display_name
    user.email = email
    user.timezone = timezone

    settings = ensure_user_settings(session, user)
    settings.language = payload.language.strip() or settings.language
    settings.notifications_enabled = payload.notifications_enabled
    settings.first_day_of_week = payload.first_day_of_week
    settings.avatar_type = payload.avatar_type.value

    session.commit()
    session.refresh(user)
    session.refresh(settings)

    return serialize_user_profile(user, settings)
@router.get("", response_model=list[UserSummary])
def list_users(session: Session = Depends(get_db_session)) -> list[UserSummary]:
    stmt = select(User).order_by(User.display_name)
    users = session.scalars(stmt).all()
    return users


@router.get("/{user_id}/dashboard", response_model=DashboardResponse)
def get_dashboard(user_id: UUID, session: Session = Depends(get_db_session)) -> DashboardResponse:
    user = resolve_user(session, user_id)
    settings = ensure_user_settings(session, user)

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

    snapshots_stmt = (
        select(ProgressSnapshot, Domain)
        .join(Domain, ProgressSnapshot.domain_id == Domain.id)
        .where(
            ProgressSnapshot.user_id == user_id,
            ProgressSnapshot.period == SnapshotPeriod.WEEK,
            ProgressSnapshot.period_start_date == current_week,
        )
    )

    snapshot_by_domain: dict[int, tuple[ProgressSnapshot, Domain]] = {}
    for snapshot, domain in session.execute(snapshots_stmt):
        snapshot_by_domain[domain.id] = (snapshot, domain)

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

    ordered_stats: list[tuple[int, DashboardDomainStat]] = []
    for domain_setting, domain, snapshot in session.execute(settings_stmt):
        extra_snapshot = snapshot_by_domain.pop(domain.id, None)
        mapped_snapshot = snapshot or (extra_snapshot[0] if extra_snapshot else None)

        weekly_points = mapped_snapshot.points_total if mapped_snapshot else 0
        weekly_xp = mapped_snapshot.xp_total if mapped_snapshot else 0
        weekly_target = domain_setting.weekly_target_points or 0
        progress = 0.0
        if weekly_target > 0:
            progress = min(weekly_points / weekly_target, 1.0)
        ordered_stats.append(
            (
                domain.order_index,
                DashboardDomainStat(
                    domain_id=domain.id,
                    domain_key=domain.key,
                    domain_name=domain.name,
                    icon=domain.icon,
                    weekly_points=weekly_points,
                    weekly_target=weekly_target,
                    weekly_xp=weekly_xp,
                    progress_ratio=progress,
                ),
            )
        )

    for _, (snapshot, domain) in snapshot_by_domain.items():
        ordered_stats.append(
            (
                domain.order_index,
                DashboardDomainStat(
                    domain_id=domain.id,
                    domain_key=domain.key,
                    domain_name=domain.name,
                    icon=domain.icon,
                    weekly_points=snapshot.points_total,
                    weekly_target=0,
                    weekly_xp=snapshot.xp_total,
                    progress_ratio=0.0,
                ),
            )
        )

    ordered_stats.sort(key=lambda item: item[0])
    domain_stats = [stat for _, stat in ordered_stats]

    return DashboardResponse(
        user_id=user.id,
        display_name=user.display_name,
        initials=compute_initials(user.display_name),
        level=current_level,
        current_xp=current_xp,
        xp_to_next=xp_to_next,
        avatar_type=settings.avatar_type,
        domain_stats=domain_stats,
    )


@router.get("/{user_id}/tasks", response_model=TaskListResponse)
def list_tasks(user_id: UUID, session: Session = Depends(get_db_session)) -> TaskListResponse:
    user = resolve_user(session, user_id)
    settings = ensure_user_settings(session, user)
    user_timezone = get_user_timezone(user)
    now = datetime.now(user_timezone)

    tasks_stmt = (
        select(UserTask, Domain, TaskTemplate)
        .join(Domain, UserTask.domain_id == Domain.id)
        .outerjoin(TaskTemplate, UserTask.template_id == TaskTemplate.id)
        .where(UserTask.user_id == user.id, UserTask.is_active.is_(True))
        .order_by(UserTask.created_at.desc())
    )

    task_rows = list(session.execute(tasks_stmt))
    if not task_rows:
        return TaskListResponse(user_id=user.id, tasks=[])

    schedule_windows: dict[tuple[SnapshotPeriod, int], tuple[datetime, datetime]] = {}
    task_ids_by_schedule: dict[tuple[SnapshotPeriod, int], list[UUID]] = defaultdict(list)

    for user_task, _, _ in task_rows:
        schedule_period, schedule_interval = resolve_task_schedule(user_task)
        schedule_key = (schedule_period, schedule_interval)
        task_ids_by_schedule[schedule_key].append(user_task.id)
        if schedule_key not in schedule_windows:
            schedule_windows[schedule_key] = compute_period_window(
                schedule_period,
                now=now,
                first_day_of_week=settings.first_day_of_week,
                interval=schedule_interval,
            )

    occurrences_by_task: dict[UUID, int] = {}
    for schedule_key, task_ids in task_ids_by_schedule.items():
        if not task_ids:
            continue
        period_start, period_end = schedule_windows[schedule_key]
        period_start_utc = period_start.astimezone(timezone.utc)
        period_end_utc = period_end.astimezone(timezone.utc)

        occurrences_stmt = (
            select(TaskLog.user_task_id, func.count())
            .where(
                TaskLog.user_id == user_id,
                TaskLog.user_task_id.in_(task_ids),
                TaskLog.occurred_at >= period_start_utc,
                TaskLog.occurred_at <= period_end_utc,
            )
            .group_by(TaskLog.user_task_id)
        )

        for task_id, count in session.execute(occurrences_stmt):
            if task_id is not None:
                occurrences_by_task[task_id] = int(count or 0)

    tasks: list[TaskListItem] = []
    for user_task, domain, template in task_rows:
        schedule_period, schedule_interval = resolve_task_schedule(user_task)
        schedule_key = (schedule_period, schedule_interval)
        period_start, period_end = schedule_windows[schedule_key]
        occurrences_completed = occurrences_by_task.get(user_task.id, 0)
        tasks.append(
            build_task_list_item(
                user_task,
                domain,
                template,
                occurrences_completed=occurrences_completed,
                period_start=period_start,
                period_end=period_end,
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
    settings = ensure_user_settings(session, user)
    user_timezone = get_user_timezone(user)
    now = datetime.now(user_timezone)

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

    schedule_period, schedule_interval = resolve_task_schedule_from_payload(payload)
    frequency = map_period_to_frequency(schedule_period)
    target_occurrences = payload.target_occurrences
    period_start, period_end = compute_period_window(
        schedule_period,
        now=now,
        first_day_of_week=settings.first_day_of_week,
        interval=schedule_interval,
    )

    user_task = UserTask(
        user_id=user.id,
        domain_id=domain.id,
        custom_title=title,
        custom_xp=payload.xp,
        custom_points=payload.xp,
        is_active=True,
        is_favorite=True,
        schedule_period=schedule_period,
        schedule_interval=schedule_interval,
        frequency_type=frequency.value,
        target_occurrences=target_occurrences,
    )

    session.add(user_task)
    session.commit()
    session.refresh(user_task)

    return build_task_list_item(
        user_task,
        domain,
        None,
        occurrences_completed=0,
        period_start=period_start,
        period_end=period_end,
    )


@router.patch(
    "/{user_id}/tasks/{task_id}/visibility",
    response_model=TaskListItem,
)
def update_task_visibility(
    user_id: UUID,
    task_id: UUID,
    payload: TaskVisibilityUpdateRequest,
    session: Session = Depends(get_db_session),
) -> TaskListItem:
    user = resolve_user(session, user_id)
    settings = ensure_user_settings(session, user)
    user_timezone = get_user_timezone(user)

    user_task = session.scalar(
        select(UserTask).where(
            UserTask.id == task_id,
            UserTask.user_id == user.id,
            UserTask.is_active.is_(True),
        )
    )

    if not user_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quête introuvable pour cet utilisateur.",
        )

    if user_task.template_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seules les quêtes personnalisées peuvent être masquées.",
        )

    user_task.is_favorite = payload.show_in_global
    session.add(user_task)
    session.commit()
    session.refresh(user_task)

    domain = session.scalar(select(Domain).where(Domain.id == user_task.domain_id))
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domaine introuvable pour cette quête.",
        )

    schedule_period, schedule_interval = resolve_task_schedule(user_task)
    now = datetime.now(user_timezone)
    period_start, period_end = compute_period_window(
        schedule_period,
        now=now,
        first_day_of_week=settings.first_day_of_week,
        interval=schedule_interval,
    )

    period_start_utc = period_start.astimezone(timezone.utc)
    period_end_utc = period_end.astimezone(timezone.utc)

    occurrences_stmt = (
        select(func.count())
        .where(
            TaskLog.user_id == user.id,
            TaskLog.user_task_id == user_task.id,
            TaskLog.occurred_at >= period_start_utc,
            TaskLog.occurred_at <= period_end_utc,
        )
        .group_by(TaskLog.user_task_id)
    )
    occurrences_completed = int(session.scalar(occurrences_stmt) or 0)

    return build_task_list_item(
        user_task,
        domain,
        None,
        occurrences_completed=occurrences_completed,
        period_start=period_start,
        period_end=period_end,
    )


@router.get("/{user_id}/task-templates", response_model=list[TaskTemplateItem])
def list_task_templates(
    user_id: UUID, session: Session = Depends(get_db_session)
) -> list[TaskTemplateItem]:
    user = resolve_user(session, user_id)

    templates_stmt = (
        select(TaskTemplate, Domain, UserTask.id)
        .join(Domain, TaskTemplate.domain_id == Domain.id)
        .outerjoin(
            UserTask,
            (
                (UserTask.template_id == TaskTemplate.id)
                & (UserTask.user_id == user.id)
                & (UserTask.is_active.is_(True))
            ),
        )
        .where(TaskTemplate.is_active.is_(True))
        .order_by(Domain.order_index.asc(), TaskTemplate.title.asc())
    )

    templates: list[TaskTemplateItem] = []
    for template, domain, user_task_id in session.execute(templates_stmt):
        templates.append(
            TaskTemplateItem(
                id=template.id,
                title=template.title,
                domain_id=domain.id,
                domain_key=domain.key,
                domain_name=domain.name,
                icon=domain.icon,
                default_xp=template.default_xp,
                default_points=template.default_points,
                unit=template.unit,
                is_enabled=user_task_id is not None,
            )
        )

    return templates


@router.post(
    "/{user_id}/task-templates/{template_id}",
    response_model=TaskListItem,
    status_code=status.HTTP_201_CREATED,
)
def enable_task_template(
    user_id: UUID, template_id: int, session: Session = Depends(get_db_session)
) -> TaskListItem:
    user = resolve_user(session, user_id)
    settings = ensure_user_settings(session, user)
    user_timezone = get_user_timezone(user)
    now = datetime.now(user_timezone)
    template = session.get(TaskTemplate, template_id)
    if not template or not template.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle de tâche introuvable.",
        )

    domain = template.domain or session.get(Domain, template.domain_id)
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domaine associé au modèle introuvable.",
        )

    existing_stmt = (
        select(UserTask)
        .where(UserTask.user_id == user.id, UserTask.template_id == template.id)
        .order_by(UserTask.created_at.desc())
    )
    existing = session.scalars(existing_stmt).first()

    if existing:
        if not existing.is_active:
            existing.is_active = True
            session.add(existing)
            session.commit()
            session.refresh(existing)

        schedule_period, schedule_interval = resolve_task_schedule(existing)
        period_start, period_end = compute_period_window(
            schedule_period,
            now=now,
            first_day_of_week=settings.first_day_of_week,
            interval=schedule_interval,
        )
        occurrences_completed = count_task_occurrences(
            session,
            user_id=user.id,
            user_task_id=existing.id,
            period_start=period_start,
            period_end=period_end,
        )
        return build_task_list_item(
            existing,
            domain,
            template,
            occurrences_completed=occurrences_completed,
            period_start=period_start,
            period_end=period_end,
        )

    user_task = UserTask(
        user_id=user.id,
        template_id=template.id,
        domain_id=template.domain_id,
        custom_title=None,
        custom_xp=None,
        custom_points=None,
        is_active=True,
        is_favorite=True,
        schedule_period=SnapshotPeriod.DAY,
        schedule_interval=1,
        frequency_type=TaskFrequency.DAILY.value,
        target_occurrences=1,
    )

    session.add(user_task)
    session.commit()
    session.refresh(user_task)

    period_start, period_end = compute_period_window(
        SnapshotPeriod.DAY,
        now=now,
        first_day_of_week=settings.first_day_of_week,
        interval=1,
    )

    return build_task_list_item(
        user_task,
        domain,
        template,
        occurrences_completed=0,
        period_start=period_start,
        period_end=period_end,
    )


@router.delete(
    "/{user_id}/task-templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def disable_task_template(
    user_id: UUID, template_id: int, session: Session = Depends(get_db_session)
) -> Response:
    user = resolve_user(session, user_id)

    template = session.get(TaskTemplate, template_id)
    if not template:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    existing_stmt = (
        select(UserTask)
        .where(
            UserTask.user_id == user.id,
            UserTask.template_id == template.id,
            UserTask.is_active.is_(True),
        )
        .order_by(UserTask.created_at.desc())
    )
    user_task = session.scalars(existing_stmt).first()

    if not user_task:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    user_task.is_active = False
    session.add(user_task)
    session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


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

    reward_stmt = (
        select(UserReward, Reward)
        .join(Reward, Reward.id == UserReward.reward_id)
        .where(UserReward.user_id == user_id)
        .order_by(UserReward.date_obtained.desc())
    )

    reward_badges: list[BadgeItem] = []
    for user_reward, reward in session.execute(reward_stmt):
        icon: str | None = None
        data = reward.reward_data
        if isinstance(data, dict):
            candidate = data.get("icon")
            icon = candidate if isinstance(candidate, str) else None
        elif isinstance(data, str):
            icon = data

        reward_badges.append(
            BadgeItem(
                id=f"reward-{user_reward.reward_id}",
                title=reward.name,
                subtitle=reward.description,
                domain_id=None,
                icon=icon,
            )
        )

    streak_stmt = (
        select(Streak, Domain)
        .join(Domain, Streak.domain_id == Domain.id)
        .where(Streak.user_id == user_id, Streak.current_streak_days > 0)
        .order_by(Streak.current_streak_days.desc())
    )

    streak_badges: list[BadgeItem] = []
    for streak, domain in session.execute(streak_stmt):
        streak_badges.append(
            BadgeItem(
                id=f"streak-{streak.id}",
                title=f"{streak.current_streak_days} jours consécutifs",
                subtitle=f"{domain.name} • Meilleur : {streak.best_streak_days} jours",
                domain_id=domain.id,
                icon=domain.icon,
            )
        )

    badges = reward_badges + streak_badges

    return ProgressionResponse(
        user_id=user_id,
        recent_history=recent_history,
        weekly_stats=weekly_stats,
        badges=badges,
    )
