"""add user task schedule

Revision ID: f7a2d4a7202b
Revises: 
Create Date: 2024-07-03 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f7a2d4a7202b"
down_revision = None
branch_labels = None
depends_on = None


SNAPSHOT_PERIOD_ENUM_NAME = "snapshotperiod"
SNAPSHOT_PERIOD_VALUES = ("day", "week", "month")


def upgrade() -> None:
    snapshot_period = sa.Enum(
        *SNAPSHOT_PERIOD_VALUES, name=SNAPSHOT_PERIOD_ENUM_NAME
    )
    snapshot_period.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "user_tasks",
        sa.Column(
            "schedule_period",
            snapshot_period,
            nullable=False,
            server_default=SNAPSHOT_PERIOD_VALUES[0],
        ),
    )
    op.add_column(
        "user_tasks",
        sa.Column(
            "schedule_interval",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )

    op.execute(
        """
        UPDATE user_tasks
        SET schedule_period = CASE
            WHEN frequency_type = 'weekly' THEN 'week'
            WHEN frequency_type = 'monthly' THEN 'month'
            ELSE 'day'
        END,
        schedule_interval = 1
        WHERE schedule_period IS NULL OR schedule_interval IS NULL
        """
    )

    op.alter_column(
        "user_tasks",
        "schedule_period",
        server_default=None,
    )
    op.alter_column(
        "user_tasks",
        "schedule_interval",
        server_default=None,
    )


def downgrade() -> None:
    op.drop_column("user_tasks", "schedule_interval")
    op.drop_column("user_tasks", "schedule_period")
