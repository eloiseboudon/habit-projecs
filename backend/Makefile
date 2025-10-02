.PHONY: help install run migrate downgrade revision check ensure-venv

VENV_DIR ?= .venv
APP_MODULE ?= app.main:app
PYTHON := $(VENV_DIR)/bin/python
PIP := $(PYTHON) -m pip
UVICORN := $(PYTHON) -m uvicorn
ALEMBIC := $(PYTHON) -m alembic -c alembic.ini

$(PYTHON):
	python -m venv $(VENV_DIR)

help:
	@echo "Available targets:"
	@echo "  install    Install backend dependencies"
	@echo "  run        Launch the FastAPI application with Uvicorn"
	@echo "  migrate    Apply database migrations (upgrade head)"
	@echo "  downgrade  Revert the last database migration"
	@echo "  revision   Generate a new Alembic revision (requires msg=...)"
	@echo "  check      Byte-compile the backend sources"
	@echo "  ensure-venv  Create the local Python virtual environment"

install: $(PYTHON)
	$(PIP) install -r requirements.txt

run: $(PYTHON)
	$(UVICORN) $(APP_MODULE) --reload

upgrade: $(PYTHON)
	$(ALEMBIC) upgrade head

downgrade: $(PYTHON)
	$(ALEMBIC) downgrade -1

revision:
	@test -n "$(msg)" || (echo "Error: msg=<message> is required" && exit 1)
	$(ALEMBIC) revision --autogenerate -m "$(msg)"

check: $(PYTHON)
	$(PYTHON) -m compileall app migrations

ensure-venv: $(PYTHON)
	@echo "Virtual environment available at $(VENV_DIR)"
