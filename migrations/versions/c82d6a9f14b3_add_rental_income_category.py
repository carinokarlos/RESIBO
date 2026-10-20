"""Add Rental income as a starter income category."""

from alembic import op
import sqlalchemy as sa


revision = "c82d6a9f14b3"
down_revision = "d39f0a81c2b7"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    users = sa.table("users", sa.column("id", sa.Integer))
    categories = sa.table(
        "categories",
        sa.column("id", sa.Integer),
        sa.column("user_id", sa.Integer),
        sa.column("name", sa.String(50)),
        sa.column("type", sa.String(8)),
        sa.column("color", sa.String(7)),
        sa.column("archived_at", sa.DateTime()),
    )
    existing = set(bind.execute(
        sa.select(categories.c.user_id).where(
            categories.c.type == "income",
            sa.func.lower(categories.c.name) == "rental income",
            categories.c.archived_at.is_(None),
        )
    ).scalars())
    for user_id in bind.execute(sa.select(users.c.id)).scalars():
        if user_id not in existing:
            bind.execute(categories.insert().values(
                user_id=user_id,
                name="Rental income",
                type="income",
                color="#6CA8E8",
            ))


def downgrade():
    # Keep user data intact if a rental income category has already been used.
    pass
