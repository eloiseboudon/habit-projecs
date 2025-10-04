"""API routes for accessing user dashboard data."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Response, status
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
    TaskListItem,
    TaskListResponse,
    TaskTemplateItem,
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


def build_task_list_item(
    user_task: UserTask,
    domain: Domain,
    template: TaskTemplate | None,
    *,
    completed_today: bool,
) -> TaskListItem:
    title = user_task.custom_title or (template.title if template else domain.name)
    xp = (
        user_task.custom_xp
        if user_task.custom_xp is not None
        else (template.default_xp if template else 0)
    )

    return TaskListItem(
        id=user_task.id,
        title=title,
        domain_id=domain.id,
        domain_key=domain.key,
        domain_name=domain.name,
        icon=domain.icon,
        xp=xp,
        completed_today=completed_today,
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
                is_enabled=setting.is_enabled if setting else False,
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
        tasks.append(
            build_task_list_item(
                user_task,
                domain,
                template,
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

    return build_task_list_item(
        user_task,
        domain,
        None,
        completed_today=False,
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
        return build_task_list_item(existing, domain, template, completed_today=False)

    user_task = UserTask(
        user_id=user.id,
        template_id=template.id,
        domain_id=template.domain_id,
        custom_title=None,
        custom_xp=None,
        custom_points=None,
        is_active=True,
        is_favorite=True,
    )

    session.add(user_task)
    session.commit()
    session.refresh(user_task)

    return build_task_list_item(user_task, domain, template, completed_today=False)


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
