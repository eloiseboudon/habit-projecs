"""Integration tests for authentication routes."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import auth
from app.models import Domain, User, UserDomainSetting
from app.schemas import RegisterRequest


def _create_domain(session: Session) -> Domain:
    domain = Domain(key="focus", name="Concentration", order_index=1)
    session.add(domain)
    session.commit()
    session.refresh(domain)
    return domain


def test_register_creates_user_and_domain_settings(db_session: Session) -> None:
    domain = _create_domain(db_session)

    result = auth.register_user(
        RegisterRequest(
            email="player@example.com",
            password="SuperSecret!",
            display_name="Player One",
        ),
        session=db_session,
    )

    assert result.user.display_name == "Player One"

    db_session.expire_all()
    user = db_session.scalar(select(User).where(User.email == "player@example.com"))
    assert user is not None
    assert user.email == "player@example.com"
    assert user.password_hash != "SuperSecret!"

    settings = db_session.scalars(
        select(UserDomainSetting).where(UserDomainSetting.user_id == user.id)
    ).all()
    assert len(settings) == 1
    assert settings[0].domain_id == domain.id


def test_register_rejects_duplicate_email(db_session: Session) -> None:
    _create_domain(db_session)

    payload = RegisterRequest(
        email="duplicate@example.com",
        password="Password123",
        display_name="Duplicate",
    )

    auth.register_user(payload, session=db_session)

    db_session.expire_all()
    created_user = db_session.scalar(
        select(User).where(User.email == "duplicate@example.com")
    )
    assert created_user is not None

    try:
        auth.register_user(payload, session=db_session)
    except HTTPException as exc:  # noqa: PERF203 - explicit exception assertions
        assert exc.status_code == 400
        assert exc.detail == "Un utilisateur avec cet e-mail existe déjà."
    else:  # pragma: no cover - ensures the exception is raised
        raise AssertionError("Expected duplicate registration to raise HTTPException")
