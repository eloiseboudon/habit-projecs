"""Authentication endpoints for registering and connecting users."""
from __future__ import annotations

import hashlib
from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_session
from ..models import Domain, User, UserDomainSetting
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserSummary

router = APIRouter(prefix="/auth", tags=["auth"])


def get_db_session():
    with get_session() as session:
        yield session


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _possible_hashes(password: str) -> Iterable[str]:
    """Generate potential stored representations for a password.

    The first value is the SHA-256 hash used for all new accounts, while the
    second is the plain text password as a fallback so that legacy records that
    may have been seeded without hashing remain usable.
    """

    yield _hash_password(password)
    yield password


def _verify_password(password: str, stored_hash: str) -> bool:
    return any(candidate == stored_hash for candidate in _possible_hashes(password))


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    session: Session = Depends(get_db_session),
) -> AuthResponse:
    normalized_email = payload.email.lower()
    existing_user = session.scalar(select(User).where(User.email == normalized_email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet e-mail existe déjà.",
        )

    user = User(
        email=normalized_email,
        display_name=payload.display_name.strip(),
        password_hash=_hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    domains = session.scalars(select(Domain).order_by(Domain.order_index)).all()
    if domains:
        session.add_all(
            [
                UserDomainSetting(user_id=user.id, domain_id=domain.id)
                for domain in domains
            ]
        )
        session.commit()

    return AuthResponse(user=UserSummary.model_validate(user, from_attributes=True))


@router.post("/login", response_model=AuthResponse)
def login_user(
    payload: LoginRequest,
    session: Session = Depends(get_db_session),
) -> AuthResponse:
    normalized_email = payload.email.lower()
    user = session.scalar(select(User).where(User.email == normalized_email))
    if not user or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants de connexion invalides.",
        )

    return AuthResponse(user=UserSummary.model_validate(user, from_attributes=True))
