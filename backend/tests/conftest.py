"""Shared pytest fixtures for backend tests."""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure the backend loads with an in-memory database during tests to avoid
# requiring a running PostgreSQL instance.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

from app.database import Base  # noqa: E402


@pytest.fixture()
def engine() -> Iterator[Engine]:
    """Provide a brand-new in-memory SQLite engine for every test."""

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def session_factory(engine: Engine) -> sessionmaker[Session]:
    """Return a configured ``sessionmaker`` bound to the test engine."""

    return sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )


@pytest.fixture()
def db_session(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    """Yield a database session for direct interaction inside tests."""

    session = session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
