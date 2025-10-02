"""Initial schema."""
from __future__ import annotations

import sys
from pathlib import Path

from alembic import op

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app import models  # noqa: F401,E402
from app.database import Base  # noqa: E402

# revision identifiers, used by Alembic.
revision = "20240308_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
