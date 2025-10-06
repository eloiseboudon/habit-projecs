"""Reward evaluation and unlocking helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Callable, Dict, Optional
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from ..models import (
    Domain,
    ProgressSnapshot,
    Reward,
    SnapshotPeriod,
    Streak,
    TaskLog,
    UserCosmetic,
    UserDomainSetting,
    UserReward,
)


@dataclass
class RewardContext:
    """Information used to decide if a reward should be unlocked."""

    reward: Reward
    user_id: UUID


ConditionEvaluator = Callable[[RewardContext], bool]


class RewardService:
    """Encapsulate the reward unlocking flow."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self._evaluators: Dict[str, ConditionEvaluator] = {
            "tasks_completed": self._check_tasks_completed,
            "tasks_completed_category": self._check_tasks_completed_category,
            "streak_days": self._check_streak_days,
            "stats_balance": self._check_stats_balance,
        }

    def check_rewards(self, user_id: UUID) -> list[Reward]:
        """Return the rewards unlocked after evaluating the current state."""

        unlocked: list[Reward] = []
        rewards = self.session.execute(select(Reward)).scalars().all()
        for reward in rewards:
            if self._has_reward(user_id, reward.id):
                continue
            context = RewardContext(reward=reward, user_id=user_id)
            if self._evaluate_reward(context):
                self._grant_reward(context)
                unlocked.append(reward)
        return unlocked

    def _evaluate_reward(self, context: RewardContext) -> bool:
        condition_type, _ = self._parse_condition(context.reward.condition_type)
        evaluator = self._evaluators.get(condition_type)
        if not evaluator:
            return False
        return evaluator(context)

    def _parse_condition(self, condition_type: str) -> tuple[str, Optional[str]]:
        if ":" in condition_type:
            base, qualifier = condition_type.split(":", 1)
            return base, qualifier
        return condition_type, None

    def _has_reward(self, user_id: UUID, reward_id: int) -> bool:
        stmt: Select[Any] = select(UserReward).where(
            UserReward.user_id == user_id,
            UserReward.reward_id == reward_id,
        )
        return self.session.execute(stmt).first() is not None

    def _grant_reward(self, context: RewardContext) -> None:
        reward = context.reward
        user_reward = UserReward(user_id=context.user_id, reward_id=reward.id)
        self.session.add(user_reward)

        if reward.type == "cosmetic":
            item_key = self._resolve_cosmetic_key(reward.reward_data)
            if item_key:
                cosmetic_stmt = select(UserCosmetic).where(
                    UserCosmetic.user_id == context.user_id,
                    UserCosmetic.item_key == item_key,
                )
                cosmetic = self.session.execute(cosmetic_stmt).scalar_one_or_none()
                if not cosmetic:
                    self.session.add(
                        UserCosmetic(user_id=context.user_id, item_key=item_key)
                    )

    def _resolve_cosmetic_key(self, payload: Any) -> Optional[str]:
        if isinstance(payload, dict):
            value = payload.get("item") or payload.get("item_key")
            if isinstance(value, str):
                return value
        if isinstance(payload, str):
            return payload
        return None

    def _check_tasks_completed(self, context: RewardContext) -> bool:
        threshold = self._to_int(context.reward.condition_value)
        if threshold is None:
            return False
        stmt = select(func.count()).select_from(TaskLog).where(
            TaskLog.user_id == context.user_id
        )
        completed = self.session.execute(stmt).scalar_one()
        return completed >= threshold

    def _check_tasks_completed_category(self, context: RewardContext) -> bool:
        threshold = self._to_int(context.reward.condition_value)
        if threshold is None:
            return False

        _, qualifier = self._parse_condition(context.reward.condition_type)
        domain_key: Optional[str] = None
        if qualifier:
            domain_key = qualifier
        elif isinstance(context.reward.reward_data, dict):
            candidate = context.reward.reward_data.get("domain") or context.reward.reward_data.get("domain_key")
            if isinstance(candidate, str):
                domain_key = candidate

        if not domain_key:
            return False

        stmt = (
            select(func.count())
            .select_from(TaskLog)
            .join(Domain, Domain.id == TaskLog.domain_id)
            .where(TaskLog.user_id == context.user_id, Domain.key == domain_key)
        )
        completed = self.session.execute(stmt).scalar_one()
        return completed >= threshold

    def _check_streak_days(self, context: RewardContext) -> bool:
        threshold = self._to_int(context.reward.condition_value)
        if threshold is None:
            return False

        _, qualifier = self._parse_condition(context.reward.condition_type)
        stmt = select(func.max(Streak.current_streak_days)).where(
            Streak.user_id == context.user_id
        )
        if qualifier:
            stmt = stmt.join(Domain, Domain.id == Streak.domain_id).where(Domain.key == qualifier)

        current_streak = self.session.execute(stmt).scalar_one()
        current_streak = current_streak or 0
        return current_streak >= threshold

    def _check_stats_balance(self, context: RewardContext) -> bool:
        threshold = self._to_int(context.reward.condition_value)
        if threshold is None:
            return False

        week_start = self._monday_start(date.today())
        stmt = (
            select(
                Domain.id,
                UserDomainSetting.weekly_target_points,
                ProgressSnapshot.points_total,
            )
            .join(
                UserDomainSetting,
                (UserDomainSetting.domain_id == Domain.id)
                & (UserDomainSetting.user_id == context.user_id),
            )
            .outerjoin(
                ProgressSnapshot,
                (ProgressSnapshot.user_id == context.user_id)
                & (ProgressSnapshot.domain_id == Domain.id)
                & (ProgressSnapshot.period == SnapshotPeriod.WEEK)
                & (ProgressSnapshot.period_start_date == week_start),
            )
            .where(UserDomainSetting.is_enabled.is_(True))
        )

        rows = self.session.execute(stmt).all()
        if not rows:
            return False

        for _, target_points, progress in rows:
            if not target_points or target_points <= 0:
                return False
            percentage = (progress or 0) * 100 / target_points
            if percentage < threshold:
                return False
        return True

    def _to_int(self, value: Optional[str]) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _monday_start(self, day: date) -> date:
        return day - timedelta(days=day.weekday())


def check_rewards(session: Session, user_id: UUID) -> list[Reward]:
    """Evaluate and grant rewards for the given user."""

    service = RewardService(session)
    return service.check_rewards(user_id)
