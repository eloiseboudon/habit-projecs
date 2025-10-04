"""Add avatar type to user settings."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250219_000001"
down_revision = "ff8fed6a9f28"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("avatar_type", sa.String(length=30), nullable=False, server_default="explorateur"),
    )
    op.alter_column("user_settings", "avatar_type", server_default=None)


def downgrade() -> None:
    op.drop_column("user_settings", "avatar_type")
