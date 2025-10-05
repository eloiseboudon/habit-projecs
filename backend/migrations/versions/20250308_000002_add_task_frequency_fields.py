"""add task frequency fields

Revision ID: 20250308_000002
Revises: 20250219_000001_add_avatar_type_to_user_settings
Create Date: 2025-03-08 00:00:02.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250308_000002"
down_revision = "20250219_000001_add_avatar_type_to_user_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_tasks",
        sa.Column("frequency_type", sa.String(length=20), nullable=False, server_default="daily"),
    )
    op.add_column(
        "user_tasks",
        sa.Column("target_occurrences", sa.Integer(), nullable=False, server_default="1"),
    )

    # Drop the server default after populating existing rows to avoid future inserts
    op.alter_column("user_tasks", "frequency_type", server_default=None)
    op.alter_column("user_tasks", "target_occurrences", server_default=None)


def downgrade() -> None:
    op.drop_column("user_tasks", "target_occurrences")
    op.drop_column("user_tasks", "frequency_type")
