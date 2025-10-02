.PHONY: help install run migrate downgrade revision check

PYTHON ?= python
PIP ?= pip
UVICORN ?= uvicorn
APP_MODULE ?= app.main:app
ALEMBIC ?= alembic -c alembic.ini

help:
@echo "Available targets:"
@echo "  install    Install backend dependencies"
@echo "  run        Launch the FastAPI application with Uvicorn"
@echo "  migrate    Apply database migrations (upgrade head)"
@echo "  downgrade  Revert the last database migration"
@echo "  revision   Generate a new Alembic revision (requires msg=...)"
@echo "  check      Byte-compile the backend sources"

install:
$(PIP) install -r requirements.txt

run:
$(UVICORN) $(APP_MODULE) --reload

migrate:
$(ALEMBIC) upgrade head

downgrade:
$(ALEMBIC) downgrade -1

revision:
@test -n "$(msg)" || (echo "Error: msg=<message> is required" && exit 1)
$(ALEMBIC) revision --autogenerate -m "$(msg)"

check:
$(PYTHON) -m compileall app migrations
