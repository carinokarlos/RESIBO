"""Split account names into first, middle, and last name fields.

Revision ID: 2c6e1a7f4b90
Revises: 5d9a31e2c6f4, 9af3c17d2b10
"""

from alembic import op
import sqlalchemy as sa


revision = "2c6e1a7f4b90"
down_revision = ("5d9a31e2c6f4", "9af3c17d2b10")
branch_labels = None
depends_on = None


def _split_name(value):
    parts = (value or "").split()
    if not parts:
        return "", None, ""
    if len(parts) == 1:
        return parts[0], None, ""
    return parts[0], " ".join(parts[1:-1]) or None, parts[-1]


def upgrade():
    op.add_column("users", sa.Column("first_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("middle_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=100), nullable=True))

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, name FROM users")).all()
    for user_id, legacy_name in rows:
        first_name, middle_name, last_name = _split_name(legacy_name)
        bind.execute(
            sa.text(
                "UPDATE users SET first_name = :first_name, middle_name = :middle_name, "
                "last_name = :last_name WHERE id = :user_id"
            ),
            {"user_id": user_id, "first_name": first_name, "middle_name": middle_name, "last_name": last_name},
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("first_name", existing_type=sa.String(length=100), nullable=False)
        batch_op.alter_column("last_name", existing_type=sa.String(length=100), nullable=False)
        batch_op.drop_column("name")


def downgrade():
    op.add_column("users", sa.Column("name", sa.String(length=100), nullable=True))
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, first_name, middle_name, last_name FROM users")).all()
    for user_id, first_name, middle_name, last_name in rows:
        full_name = " ".join(part for part in (first_name, middle_name, last_name) if part)
        bind.execute(
            sa.text("UPDATE users SET name = :name WHERE id = :user_id"),
            {"user_id": user_id, "name": full_name},
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("name", existing_type=sa.String(length=100), nullable=False)
        batch_op.drop_column("last_name")
        batch_op.drop_column("middle_name")
    batch_op.drop_column("first_name")
