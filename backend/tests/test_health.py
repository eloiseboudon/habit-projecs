"""Tests covering the healthcheck endpoint."""

from app.main import healthcheck


def test_health_endpoint_returns_ok() -> None:
    assert healthcheck() == {"status": "ok"}
