"""Configurable full-page ad close delay (seconds)."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "045_ad_close_delay_seconds"
down_revision = "044_ad_target_marketplace_slug"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "platform_advertisements",
        sa.Column(
            "close_delay_seconds",
            sa.Integer(),
            nullable=False,
            server_default="5",
        ),
    )


def downgrade() -> None:
    op.drop_column("platform_advertisements", "close_delay_seconds")
